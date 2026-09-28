// @vitest-environment node
//
// The local Node relay over real WebSockets, driven by the browser SignalingClient (with the
// `ws` package standing in for the browser's WebSocket).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'node:net';
import WebSocket from 'ws';
import { startRelay } from '../../relay/node-relay.mjs';
import { SignalingClient } from '../../js/modules/live-share/signaling-client.js';
import { generateRoomId } from '../../js/modules/live-share/room-id.js';

let relay;
let relayUrl;

beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1' });
  relayUrl = `ws://127.0.0.1:${relay.port}`;
});

afterAll(async () => {
  await relay.close();
});

function client(roomId, role) {
  return new SignalingClient({ relayUrl, roomId, role, WebSocketImpl: WebSocket, connectTimeoutMs: 3000 });
}

function next(emitter, type) {
  return new Promise((resolve) => {
    const off = emitter.on(type, (detail) => {
      off();
      resolve(detail);
    });
  });
}

async function connected(roomId, role) {
  const c = client(roomId, role);
  const ready = next(c, 'ready');
  c.connect();
  await ready;
  return c;
}

// Send raw bytes to the relay and collect what it answers until it closes the connection.
function rawRequest(text) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(relay.port, '127.0.0.1', () => socket.write(text));
    let data = '';
    socket.on('data', (chunk) => (data += chunk));
    socket.on('close', () => resolve(data));
    socket.on('error', reject);
  });
}

const offer = { kind: 'description', description: { type: 'offer', sdp: 'v=0 offer' } };
const answer = { kind: 'description', description: { type: 'answer', sdp: 'v=0 answer' } };
const candidate = { kind: 'candidate', candidate: { candidate: 'candidate:1 1 udp 1 x 1 typ host', sdpMid: '0', sdpMLineIndex: 0 } };

describe('Live Share Node relay', () => {
  it('answers /health', async () => {
    const res = await fetch(`http://127.0.0.1:${relay.port}/health`);
    expect(await res.text()).toBe('ok');
  });

  it('creates a room, lets a player join, and relays offer, answer and ICE', async () => {
    const roomId = generateRoomId();
    const host = await connected(roomId, 'host');
    expect(host.state).toBe('ready');
    expect(relay.rooms.has(roomId)).toBe(true);

    const joined = next(host, 'peer-joined');
    const player = await connected(roomId, 'peer');
    const { peerId } = await joined;
    expect(player.peerId).toBe(peerId);

    const gotOffer = next(player, 'signal');
    host.sendSignal(offer, peerId);
    expect(await gotOffer).toEqual({ from: 'host', data: offer });

    const gotAnswer = next(host, 'signal');
    player.sendSignal(answer);
    expect(await gotAnswer).toEqual({ from: peerId, data: answer });

    const hostCand = next(host, 'signal');
    const playerCand = next(player, 'signal');
    player.sendSignal(candidate);
    host.sendSignal(candidate, peerId);
    expect(await hostCand).toEqual({ from: peerId, data: candidate });
    expect(await playerCand).toEqual({ from: 'host', data: candidate });

    host.close();
    player.close();
  });

  it('rejects a join for a room that has no host, as a signaling "no-host" error', async () => {
    const player = client(generateRoomId(), 'peer');
    const closed = next(player, 'closed');
    player.connect();
    const { error } = await closed;
    expect(error.code).toBe('no-host');
  });

  it('reports an unreachable relay as a signaling error', async () => {
    const c = new SignalingClient({ relayUrl: 'ws://127.0.0.1:1', roomId: generateRoomId(), role: 'host', WebSocketImpl: WebSocket });
    const closed = next(c, 'closed');
    c.connect();
    expect((await closed).error.code).toBe('unreachable');
  });

  it('refuses a second host for the same room', async () => {
    const roomId = generateRoomId();
    const host = await connected(roomId, 'host');
    const second = client(roomId, 'host');
    const closed = next(second, 'closed');
    second.connect();
    expect((await closed).error.code).toBe('host-exists');
    host.close();
  });

  it('refuses an upgrade with a malformed room id', async () => {
    const c = new SignalingClient({ relayUrl, roomId: 'bad', role: 'host', WebSocketImpl: WebSocket });
    const closed = next(c, 'closed');
    c.connect();
    expect((await closed).error.code).toBe('unreachable');
  });

  it('survives a malformed upgrade request: answers 400, keeps running, and still serves rooms', async () => {
    // "http://[/" is an absolute-form request target that new URL() cannot parse.
    const response = await rawRequest(
      'GET http://[/ HTTP/1.1\r\nHost: relay\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n'
    );
    expect(response).toMatch(/^HTTP\/1\.1 400/);

    const health = await fetch(`http://127.0.0.1:${relay.port}/health`);
    expect(await health.text()).toBe('ok');
    const host = await connected(generateRoomId(), 'host');
    expect(host.state).toBe('ready');
    host.close();
  });

  it('takes one player per room: a second gets ROOM_FULL and the first pair keeps working', async () => {
    const roomId = generateRoomId();
    const host = await connected(roomId, 'host');
    const joined = next(host, 'peer-joined');
    const player = await connected(roomId, 'peer');
    const { peerId } = await joined;

    const second = client(roomId, 'peer');
    const refused = next(second, 'closed');
    second.connect();
    const { error, code } = await refused;
    expect(code).toBe(4503);
    expect(error.code).toBe('room-full');

    expect(host.state).toBe('ready');
    expect(player.state).toBe('ready');
    const gotOffer = next(player, 'signal');
    host.sendSignal(offer, peerId);
    expect(await gotOffer).toEqual({ from: 'host', data: offer });
    const gotAnswer = next(host, 'signal');
    player.sendSignal(answer);
    expect(await gotAnswer).toEqual({ from: peerId, data: answer });

    host.close();
    player.close();
  });

  it('closes a client that sends malformed JSON, and tells the host it left', async () => {
    const roomId = generateRoomId();
    const host = await connected(roomId, 'host');
    const joined = next(host, 'peer-joined');
    const raw = new WebSocket(`${relayUrl}/rooms/${roomId}?role=peer`);
    const { peerId } = await joined;
    const left = next(host, 'peer-left');
    const code = new Promise((resolve) => raw.on('close', (c) => resolve(c)));
    raw.send('{not json');
    expect(await code).toBe(4400);
    expect(await left).toEqual({ peerId });
    host.close();
  });

  it('tells the player when the host leaves, and cleans the room up', async () => {
    const roomId = generateRoomId();
    const host = await connected(roomId, 'host');
    const player = await connected(roomId, 'peer');
    const closed = next(player, 'closed');
    host.close();
    expect((await closed).error.code).toBe('host-left');
    await expect.poll(() => relay.rooms.has(roomId)).toBe(false);
  });

  it('tells the host when the player disconnects cleanly', async () => {
    const roomId = generateRoomId();
    const host = await connected(roomId, 'host');
    const player = await connected(roomId, 'peer');
    const left = next(host, 'peer-left');
    player.close();
    expect((await left).peerId).toBe(player.peerId);
    expect(host.state).toBe('ready');
    host.close();
  });
});
