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
  relay = await startRelay({ port: 0, host: '127.0.0.1', turnEnv: {} });
  relayUrl = `ws://127.0.0.1:${relay.port}`;
});

afterAll(async () => {
  await relay.close();
});

describe('Live Share Node relay: /turn-credentials', () => {
  const ORIGIN = 'http://localhost:3100';
  const relays = [];
  afterAll(async () => {
    await Promise.all(relays.map((r) => r.close()));
  });

  async function relayWith(turnEnv, extra = {}) {
    const r = await startRelay({ port: 0, host: '127.0.0.1', turnEnv, ...extra });
    relays.push(r);
    return `http://127.0.0.1:${r.port}/turn-credentials`;
  }

  const get = (url, headers = { Origin: ORIGIN }, method = 'GET') => fetch(url, { method, headers });

  it('hands out the development TURN server to an allowed origin, uncached, with CORS for that origin', async () => {
    const url = await relayWith({ DEV_TURN_URLS: 'turn:127.0.0.1:3479?transport=udp', DEV_TURN_USERNAME: 'dev', DEV_TURN_CREDENTIAL: 'devpass' });
    const res = await get(url);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body.iceServers).toEqual([{ urls: ['turn:127.0.0.1:3479?transport=udp'], username: 'dev', credential: 'devpass' }]);
  });

  it('refuses other origins and requests with no Origin, without CORS headers', async () => {
    const url = await relayWith({ DEV_TURN_URLS: 'turn:127.0.0.1:3479', DEV_TURN_USERNAME: 'dev', DEV_TURN_CREDENTIAL: 'devpass' });
    for (const headers of [{ Origin: 'https://evil.example' }, {}]) {
      const res = await get(url, headers);
      expect(res.status).toBe(403);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(await res.text()).not.toContain('devpass');
    }
  });

  it('answers 503 turn-not-configured without any TURN source', async () => {
    const res = await get(await relayWith({}));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'turn-not-configured' });
  });

  it('mints Cloudflare credentials through the provider API, and leaks nothing when the provider fails', async () => {
    const env = { TURN_KEY_ID: 'kid', TURN_KEY_API_TOKEN: 'secret-token-xyz' };
    const ok = async () => ({
      ok: true,
      status: 201,
      json: async () => ({ iceServers: [{ urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'cfu', credential: 'cfc' }] }),
    });
    const good = await get(await relayWith(env, { fetchImpl: ok }));
    expect((await good.json()).iceServers[0]).toMatchObject({ username: 'cfu', credential: 'cfc' });

    const failing = async () => ({ ok: false, status: 401, json: async () => ({ errors: ['token secret-token-xyz is invalid'] }) });
    const bad = await get(await relayWith(env, { fetchImpl: failing }));
    expect(bad.status).toBe(502);
    const text = await bad.text();
    expect(text).toBe(JSON.stringify({ error: 'turn-unavailable' }));
    expect(text).not.toContain('secret-token-xyz');
  });

  it('uses the same origin list as the Cloudflare relay by default', async () => {
    const url = await relayWith({ DEV_TURN_URLS: 'turn:127.0.0.1:3479', DEV_TURN_USERNAME: 'd', DEV_TURN_CREDENTIAL: 'p' });
    expect((await get(url, { Origin: 'http://localhost:3000' })).status).toBe(200);
    expect((await get(url, { Origin: 'http://localhost:3100' })).status).toBe(200);
    expect((await get(url, { Origin: 'http://localhost:5173' })).status).toBe(403);
  });

  it('rejects other methods', async () => {
    const url = await relayWith({ DEV_TURN_URLS: 'turn:127.0.0.1:3479', DEV_TURN_USERNAME: 'd', DEV_TURN_CREDENTIAL: 'p' });
    expect((await get(url, { Origin: ORIGIN }, 'POST')).status).toBe(405);
  });
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
