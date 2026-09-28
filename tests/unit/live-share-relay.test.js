import { describe, it, expect } from 'vitest';
import { RelayRoom, CLOSE, RELAY_LIMITS, ROOM_ID_PATTERN, parseRoomRequest } from '../../relay/room-core.mjs';
import { ROOM_ID_PATTERN as CLIENT_ROOM_ID_PATTERN } from '../../js/modules/live-share/room-id.js';

function fakeConn() {
  return {
    sent: [],
    closed: null,
    send(text) {
      this.sent.push(JSON.parse(text));
    },
    close(code, reason) {
      this.closed = { code, reason };
    },
    last() {
      return this.sent[this.sent.length - 1];
    },
  };
}

function roomWithIds(options = {}) {
  let n = 0;
  return new RelayRoom({ createPeerId: () => `peer${++n}`, ...options });
}

function hostAndPeer() {
  const room = roomWithIds();
  const host = fakeConn();
  const peer = fakeConn();
  room.join(host, 'host');
  room.join(peer, 'peer');
  return { room, host, peer };
}

const offer = { kind: 'description', description: { type: 'offer', sdp: 'v=0 offer' } };
const answer = { kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } };
const candidate = { kind: 'candidate', candidate: { candidate: 'candidate:1 1 udp 1 x 1 typ host', sdpMid: '0', sdpMLineIndex: 0 } };

describe('relay room: registration and join', () => {
  it('registers a host', () => {
    const room = roomWithIds();
    const host = fakeConn();
    expect(room.join(host, 'host')).toBe(true);
    expect(host.sent).toEqual([{ type: 'registered', version: 0 }]);
    expect(host.closed).toBeNull();
  });

  it('refuses a second host for the same room', () => {
    const room = roomWithIds();
    room.join(fakeConn(), 'host');
    const second = fakeConn();
    expect(room.join(second, 'host')).toBe(false);
    expect(second.closed.code).toBe(CLOSE.HOST_EXISTS);
  });

  it('welcomes a peer and tells the host', () => {
    const { host, peer } = hostAndPeer();
    expect(peer.sent).toEqual([{ type: 'welcome', peerId: 'peer1', version: 0 }]);
    expect(host.last()).toEqual({ type: 'peer-joined', peerId: 'peer1' });
  });

  it('rejects a peer when the room has no host (unknown room)', () => {
    const room = roomWithIds();
    const peer = fakeConn();
    expect(room.join(peer, 'peer')).toBe(false);
    expect(peer.closed.code).toBe(CLOSE.NO_HOST);
    expect(peer.sent).toEqual([]);
    expect(room.isEmpty).toBe(true);
  });

  it('Milestone 0 rooms take one player: a second is refused with ROOM_FULL and the first pair is unaffected', () => {
    expect(RELAY_LIMITS.maxPeersPerRoom).toBe(1);
    const { room, host, peer } = hostAndPeer(); // default limits, as both relays use them
    const hostFrames = host.sent.length;

    const second = fakeConn();
    expect(room.join(second, 'peer')).toBe(false);
    expect(second.closed).toEqual({ code: CLOSE.ROOM_FULL, reason: 'room is full' });
    expect(second.sent).toEqual([]);
    expect(host.sent.length).toBe(hostFrames); // the host never hears about the refused player

    expect(host.closed).toBeNull();
    expect(peer.closed).toBeNull();
    room.receive(host, JSON.stringify({ type: 'signal', to: 'peer1', data: offer }));
    expect(peer.last()).toEqual({ type: 'signal', from: 'host', data: offer });
    room.receive(peer, JSON.stringify({ type: 'signal', data: answer }));
    expect(host.last()).toEqual({ type: 'signal', from: 'peer1', data: answer });
  });

  it('a player can join again once the first has left', () => {
    const { room, peer } = hostAndPeer();
    room.leave(peer);
    expect(room.join(fakeConn(), 'peer')).toBe(true);
  });

  it('rejects an unknown role', () => {
    const conn = fakeConn();
    expect(roomWithIds().join(conn, 'admin')).toBe(false);
    expect(conn.closed.code).toBe(CLOSE.BAD_REQUEST);
  });
});

describe('relay room: signal relay', () => {
  it('relays an offer from host to the addressed peer', () => {
    const { room, host, peer } = hostAndPeer();
    room.receive(host, JSON.stringify({ type: 'signal', to: 'peer1', data: offer }));
    expect(peer.last()).toEqual({ type: 'signal', from: 'host', data: offer });
  });

  it('relays an answer from peer to host, tagged with the peer id', () => {
    const { room, host, peer } = hostAndPeer();
    room.receive(peer, JSON.stringify({ type: 'signal', data: answer }));
    expect(host.last()).toEqual({ type: 'signal', from: 'peer1', data: answer });
  });

  it('relays ICE candidates both ways', () => {
    const { room, host, peer } = hostAndPeer();
    room.receive(host, JSON.stringify({ type: 'signal', to: 'peer1', data: candidate }));
    room.receive(peer, JSON.stringify({ type: 'signal', data: candidate }));
    expect(peer.last()).toEqual({ type: 'signal', from: 'host', data: candidate });
    expect(host.last()).toEqual({ type: 'signal', from: 'peer1', data: candidate });
  });

  it('a peer cannot address anyone but the host (rooms configured for two players)', () => {
    const room = roomWithIds({ limits: { ...RELAY_LIMITS, maxPeersPerRoom: 2 } });
    const host = fakeConn();
    const a = fakeConn();
    const b = fakeConn();
    room.join(host, 'host');
    room.join(a, 'peer');
    room.join(b, 'peer');
    const before = b.sent.length;
    room.receive(a, JSON.stringify({ type: 'signal', to: 'peer2', data: offer }));
    expect(b.sent.length).toBe(before);
    expect(host.last()).toEqual({ type: 'signal', from: 'peer1', data: offer });
  });

  it('answers a signal for an unknown peer with a non-fatal error', () => {
    const { room, host } = hostAndPeer();
    room.receive(host, JSON.stringify({ type: 'signal', to: 'nobody', data: offer }));
    expect(host.last()).toMatchObject({ type: 'error', code: 'unknown-peer' });
    expect(host.closed).toBeNull();
  });
});

describe('relay room: validation and limits', () => {
  it.each([
    ['malformed JSON', '{not json'],
    ['a non-object', '[1,2]'],
    ['an unknown type', JSON.stringify({ type: 'broadcast', data: {} })],
    ['a signal without data', JSON.stringify({ type: 'signal' })],
  ])('closes a connection that sends %s', (_label, raw) => {
    const { room, host, peer } = hostAndPeer();
    room.receive(peer, raw);
    expect(peer.closed.code).toBe(CLOSE.BAD_REQUEST);
    expect(host.last()).toEqual({ type: 'peer-left', peerId: 'peer1' });
  });

  it('closes a connection that sends a binary frame', () => {
    const { room, peer } = hostAndPeer();
    room.receive(peer, new Uint8Array([1, 2, 3]));
    expect(peer.closed.code).toBe(CLOSE.BAD_REQUEST);
  });

  it('closes a connection that sends an oversized message', () => {
    const { room, peer } = hostAndPeer();
    const huge = JSON.stringify({ type: 'signal', data: { pad: 'x'.repeat(RELAY_LIMITS.maxMessageBytes) } });
    room.receive(peer, huge);
    expect(peer.closed.code).toBe(CLOSE.TOO_LARGE);
  });

  it('rate-limits a flood and refills over time', () => {
    let now = 0;
    const room = new RelayRoom({ now: () => now, createPeerId: () => 'p', limits: { ...RELAY_LIMITS, rateBurst: 3, rateRefillPerSecond: 1 } });
    const host = fakeConn();
    const peer = fakeConn();
    room.join(host, 'host');
    room.join(peer, 'peer');
    const msg = JSON.stringify({ type: 'signal', data: candidate });
    room.receive(peer, msg);
    room.receive(peer, msg);
    room.receive(peer, msg);
    now = 1000; // one token back
    room.receive(peer, msg);
    expect(peer.closed).toBeNull();
    room.receive(peer, msg);
    expect(peer.closed.code).toBe(CLOSE.RATE_LIMITED);
  });

  it('ignores frames from connections it does not know', () => {
    const { room, host } = hostAndPeer();
    const stranger = fakeConn();
    const before = host.sent.length;
    room.receive(stranger, JSON.stringify({ type: 'signal', data: offer }));
    expect(host.sent.length).toBe(before);
  });
});

describe('relay room: disconnect and cleanup', () => {
  it('tells the host when a peer leaves', () => {
    const { room, host, peer } = hostAndPeer();
    room.leave(peer);
    expect(host.last()).toEqual({ type: 'peer-left', peerId: 'peer1' });
    expect(room.peers.size).toBe(0);
  });

  it('tells and closes every peer when the host leaves, leaving the room empty', () => {
    const { room, host, peer } = hostAndPeer();
    room.leave(host);
    expect(peer.last()).toEqual({ type: 'host-left' });
    expect(peer.closed.code).toBe(CLOSE.HOST_LEFT);
    expect(room.isEmpty).toBe(true);
  });

  it('a room whose host left accepts a new host (the old id is just free again)', () => {
    const { room, host } = hostAndPeer();
    room.leave(host);
    expect(room.join(fakeConn(), 'host')).toBe(true);
  });

  it('leaving twice is harmless', () => {
    const { room, peer } = hostAndPeer();
    room.leave(peer);
    expect(() => room.leave(peer)).not.toThrow();
  });
});

describe('relay request parsing', () => {
  const id = 'AbCdEfGhIjKlMnOpQrStUv';

  it('accepts a room path with a role', () => {
    expect(parseRoomRequest(new URL(`https://r.test/rooms/${id}?role=host`))).toEqual({ roomId: id, role: 'host' });
    expect(parseRoomRequest(new URL(`https://r.test/rooms/${id}?role=peer`))).toEqual({ roomId: id, role: 'peer' });
  });

  it.each([
    ['a short id', '/rooms/abc?role=host'],
    ['an id with bad characters', `/rooms/${id.slice(0, 21)}!?role=host`],
    ['a missing role', `/rooms/${id}`],
    ['an unknown role', `/rooms/${id}?role=dm`],
    ['another path', `/other/${id}?role=host`],
  ])('rejects %s', (_label, path) => {
    expect(parseRoomRequest(new URL(`https://r.test${path}`))).toBeNull();
  });

  it('uses the same room id pattern as the browser client', () => {
    expect(CLIENT_ROOM_ID_PATTERN.source).toBe(ROOM_ID_PATTERN.source);
  });
});
