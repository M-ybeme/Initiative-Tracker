/**
 * Live Share signaling relay: the transport-agnostic room logic.
 *
 * The relay is deliberately generic (planning doc §20): it knows one host and some peers per
 * room, and forwards opaque `signal` payloads between them. It knows nothing about seats,
 * passwords, the Battle Map or any game state, and never inspects what it forwards.
 *
 * Both runtimes use this file unchanged:
 *   - relay/node-relay.mjs          local relay for development and Playwright tests (ws package)
 *   - relay/cloudflare/worker.mjs   the deployed relay (one Durable Object per room)
 *
 * A "connection" is any object with `send(text)` and `close(code, reason)`.
 *
 * Wire protocol (JSON text frames):
 *   relay -> host   {type:'registered'}
 *   relay -> peer   {type:'welcome', peerId}
 *   relay -> host   {type:'peer-joined', peerId} | {type:'peer-left', peerId}
 *   host  -> relay  {type:'signal', to: peerId, data}
 *   peer  -> relay  {type:'signal', data}                (always delivered to the host)
 *   relay -> any    {type:'signal', from: peerId | 'host', data}
 *   relay -> any    {type:'error', code, message}         (non-fatal)
 * Fatal problems close the socket with one of the CLOSE codes below, so a client can tell a
 * relay/room problem (signaling) from a WebRTC/ICE problem.
 */

export const RELAY_PROTOCOL_VERSION = 0;

// Room ids are 128-bit random values encoded as base64url (22 chars). The relay only checks the
// format; unguessability comes from the host generating them (js/modules/live-share/room-id.js
// keeps the same pattern, and a unit test checks the two agree).
export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export const RELAY_LIMITS = Object.freeze({
  // An SDP offer with a data channel is ~1-3 KB; 16 KB leaves room without allowing bulk data.
  maxMessageBytes: 16 * 1024,
  // Milestone 0 is one host and one player. The host's one socket carries the signaling for every
  // player, so larger rooms need the host's rate allowance to scale with them; that arrives with
  // the multi-player session model, not before.
  maxPeersPerRoom: 1,
  // Token bucket per connection: bursts of trickled ICE candidates are fine, floods are not.
  rateBurst: 60,
  rateRefillPerSecond: 20,
});

export const CLOSE = Object.freeze({
  BAD_REQUEST: 4400,
  NO_HOST: 4404,
  HOST_EXISTS: 4409,
  HOST_LEFT: 4410,
  TOO_LARGE: 4413,
  RATE_LIMITED: 4429,
  ROOM_FULL: 4503,
});

const byteLength = (text) => new TextEncoder().encode(text).length;

export function randomPeerId() {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse `/rooms/<roomId>?role=host|peer` from a request URL. Returns null when invalid.
 */
export function parseRoomRequest(url) {
  const match = /^\/rooms\/([^/]+)\/?$/.exec(url.pathname);
  if (!match || !ROOM_ID_PATTERN.test(match[1])) return null;
  const role = url.searchParams.get('role');
  if (role !== 'host' && role !== 'peer') return null;
  return { roomId: match[1], role };
}

export class RelayRoom {
  constructor({ limits = RELAY_LIMITS, now = () => Date.now(), createPeerId = randomPeerId } = {}) {
    this.limits = limits;
    this.now = now;
    this.createPeerId = createPeerId;
    this.host = null;
    this.peers = new Map(); // peerId -> conn
    this.info = new Map(); // conn -> { role, peerId, tokens, refilledAt }
  }

  get isEmpty() {
    return !this.host && this.peers.size === 0;
  }

  /** Register a new connection. Returns false (and closes it) when it is refused. */
  join(conn, role) {
    if (role === 'host') {
      if (this.host) return refuse(conn, CLOSE.HOST_EXISTS, 'room already has a host');
      this.host = conn;
      this.track(conn, 'host', null);
      send(conn, { type: 'registered', version: RELAY_PROTOCOL_VERSION });
      return true;
    }
    if (role !== 'peer') return refuse(conn, CLOSE.BAD_REQUEST, 'unknown role');
    if (!this.host) return refuse(conn, CLOSE.NO_HOST, 'no host in this room');
    if (this.peers.size >= this.limits.maxPeersPerRoom) return refuse(conn, CLOSE.ROOM_FULL, 'room is full');

    let peerId = this.createPeerId();
    while (this.peers.has(peerId) || peerId === 'host') peerId = this.createPeerId();
    this.peers.set(peerId, conn);
    this.track(conn, 'peer', peerId);
    send(conn, { type: 'welcome', peerId, version: RELAY_PROTOCOL_VERSION });
    send(this.host, { type: 'peer-joined', peerId });
    return true;
  }

  /** Handle one incoming frame. `raw` is a string for text frames. */
  receive(conn, raw) {
    const info = this.info.get(conn);
    if (!info) return;

    if (typeof raw !== 'string') return this.eject(conn, CLOSE.BAD_REQUEST, 'text frames only');
    if (byteLength(raw) > this.limits.maxMessageBytes) return this.eject(conn, CLOSE.TOO_LARGE, 'message too large');
    if (!this.takeToken(info)) return this.eject(conn, CLOSE.RATE_LIMITED, 'too many messages');

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.eject(conn, CLOSE.BAD_REQUEST, 'malformed JSON');
    }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return this.eject(conn, CLOSE.BAD_REQUEST, 'malformed message');
    if (msg.type !== 'signal') return this.eject(conn, CLOSE.BAD_REQUEST, 'unknown message type');
    if (!msg.data || typeof msg.data !== 'object') return this.eject(conn, CLOSE.BAD_REQUEST, 'signal without data');

    if (info.role === 'host') {
      const target = typeof msg.to === 'string' ? this.peers.get(msg.to) : undefined;
      // Not fatal: the peer may have left while the host's message was in flight.
      if (!target) return send(conn, { type: 'error', code: 'unknown-peer', message: 'no such peer' });
      send(target, { type: 'signal', from: 'host', data: msg.data });
    } else {
      send(this.host, { type: 'signal', from: info.peerId, data: msg.data });
    }
  }

  /** A connection closed (for any reason). */
  leave(conn) {
    const info = this.info.get(conn);
    if (!info) return;
    this.info.delete(conn);

    if (info.role === 'host') {
      this.host = null;
      for (const peer of this.peers.values()) {
        this.info.delete(peer);
        send(peer, { type: 'host-left' });
        close(peer, CLOSE.HOST_LEFT, 'host left');
      }
      this.peers.clear();
    } else {
      this.peers.delete(info.peerId);
      if (this.host) send(this.host, { type: 'peer-left', peerId: info.peerId });
    }
  }

  track(conn, role, peerId) {
    this.info.set(conn, { role, peerId, tokens: this.limits.rateBurst, refilledAt: this.now() });
  }

  takeToken(info) {
    const now = this.now();
    const refill = ((now - info.refilledAt) / 1000) * this.limits.rateRefillPerSecond;
    info.tokens = Math.min(this.limits.rateBurst, info.tokens + refill);
    info.refilledAt = now;
    if (info.tokens < 1) return false;
    info.tokens -= 1;
    return true;
  }

  eject(conn, code, reason) {
    close(conn, code, reason);
    this.leave(conn);
  }
}

function send(conn, msg) {
  try {
    conn.send(JSON.stringify(msg));
  } catch {
    // The socket is already closing; its close handler will clean up.
  }
}

function close(conn, code, reason) {
  try {
    conn.close(code, reason);
  } catch {}
}

function refuse(conn, code, reason) {
  close(conn, code, reason);
  return false;
}
