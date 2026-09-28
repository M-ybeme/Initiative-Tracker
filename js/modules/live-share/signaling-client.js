/**
 * Live Share signaling client: one WebSocket to the relay for one room, as host or peer.
 *
 * It only moves WebRTC negotiation messages; it never carries session content. Its failures are
 * reported as `signaling` problems with a specific code, so the diagnostics can tell "could not
 * reach the room" apart from "reached the room but WebRTC could not connect" (peer-link.js).
 *
 * Events (subscribe with on(type, fn)):
 *   state        {state}                 'connecting' | 'ready' | 'closed'
 *   ready        {peerId}                registered with the room (peerId is null for the host)
 *   peer-joined  {peerId}                host only
 *   peer-left    {peerId}                host only
 *   signal       {from, data}            negotiation payload from the other side (validate it!)
 *   closed       {error, code, reason}   error is null after close() or a normal end
 */
import { parseRelayFrame } from './protocol.js';

// Must match CLOSE in relay/room-core.mjs.
const CLOSE_ERRORS = {
  4400: { code: 'bad-request', message: 'The relay rejected a malformed request.' },
  4404: { code: 'no-host', message: 'No host is sharing this room. The link may be old, or the host has not started yet.' },
  4409: { code: 'host-exists', message: 'This room already has a host.' },
  4410: { code: 'host-left', message: 'The host ended the session.' },
  4413: { code: 'too-large', message: 'A message was too large for the relay.' },
  4429: { code: 'rate-limited', message: 'Too many messages were sent to the relay.' },
  4503: { code: 'room-full', message: 'The room is full.' },
};

export class SignalingClient {
  constructor({ relayUrl, roomId, role, WebSocketImpl = globalThis.WebSocket, connectTimeoutMs = 10000 }) {
    this.relayUrl = relayUrl;
    this.roomId = roomId;
    this.role = role; // 'host' | 'peer'
    this.WebSocketImpl = WebSocketImpl;
    this.connectTimeoutMs = connectTimeoutMs;
    this.state = 'idle';
    this.peerId = null;
    this.lastError = null;
    this.listeners = new Map();
    this.ws = null;
    this.timer = null;
    this.hostLeft = false;
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type).delete(fn);
  }

  emit(type, detail) {
    for (const fn of this.listeners.get(type) || []) fn(detail);
  }

  setState(state) {
    this.state = state;
    this.emit('state', { state });
  }

  connect() {
    if (this.state !== 'idle') throw new Error('SignalingClient.connect() called twice');
    this.setState('connecting');
    const url = `${this.relayUrl}/rooms/${encodeURIComponent(this.roomId)}?role=${this.role}`;
    let opened = false;
    try {
      this.ws = new this.WebSocketImpl(url);
    } catch {
      this.finish({ code: 'unreachable', message: 'The relay address is invalid.' });
      return;
    }
    this.timer = setTimeout(() => {
      this.finish({ code: 'timeout', message: 'Timed out waiting for the relay.' });
    }, this.connectTimeoutMs);

    this.ws.onopen = () => {
      opened = true;
    };
    this.ws.onmessage = (event) => this.handleFrame(event.data);
    this.ws.onclose = (event) => {
      const known = CLOSE_ERRORS[event.code];
      let error = null;
      if (this.hostLeft || event.code === 4410) error = CLOSE_ERRORS[4410];
      else if (known) error = known;
      else if (!opened) error = { code: 'unreachable', message: 'Could not reach the relay (offline, blocked, or wrong address).' };
      else if (this.state !== 'closed') error = { code: 'relay-disconnected', message: `Lost the connection to the relay (code ${event.code}).` };
      this.finish(error, event.code, event.reason);
    };
    // onerror is always followed by onclose, which carries the useful information.
    this.ws.onerror = () => {};
  }

  handleFrame(raw) {
    const parsed = parseRelayFrame(raw);
    if (!parsed.ok) {
      this.lastError = { code: 'protocol', message: `Ignored a relay frame: ${parsed.error}` };
      return;
    }
    const msg = parsed.message;
    switch (msg.type) {
      case 'registered':
      case 'welcome':
        clearTimeout(this.timer);
        this.peerId = msg.type === 'welcome' ? msg.peerId : null;
        this.setState('ready');
        this.emit('ready', { peerId: this.peerId });
        break;
      case 'peer-joined':
      case 'peer-left':
        if (this.role === 'host') this.emit(msg.type, { peerId: msg.peerId });
        break;
      case 'signal':
        this.emit('signal', { from: msg.from, data: msg.data });
        break;
      case 'host-left':
        this.hostLeft = true;
        break;
      case 'error':
        this.lastError = { code: String(msg.code || 'relay-error'), message: String(msg.message || '') };
        break;
    }
  }

  sendSignal(data, to) {
    if (this.state !== 'ready') return false;
    const frame = this.role === 'host' ? { type: 'signal', to, data } : { type: 'signal', data };
    this.ws.send(JSON.stringify(frame));
    return true;
  }

  close() {
    this.finish(null);
  }

  finish(error, code = null, reason = '') {
    if (this.state === 'closed') return;
    clearTimeout(this.timer);
    if (error) this.lastError = error;
    const ws = this.ws;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close(1000, 'client closed');
      } catch {}
    }
    this.setState('closed');
    this.emit('closed', { error, code, reason });
  }
}
