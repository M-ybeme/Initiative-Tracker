import { describe, it, expect } from 'vitest';
import {
  parseRelayFrame,
  parseSignalData,
  parseChannelMessage,
  encodeHello,
  describeSignal,
  candidateSignal,
  MAX_CHANNEL_MESSAGE_BYTES,
} from '../../js/modules/live-share/protocol.js';
import { generateRoomId, isValidRoomId, buildJoinUrl, readRoomIdFromHash } from '../../js/modules/live-share/room-id.js';
import { resolveRelayUrl, LOCAL_RELAY_URL, PRODUCTION_RELAY_URL, DEFAULT_ICE_SERVERS } from '../../js/modules/live-share/config.js';
import { candidateType } from '../../js/modules/live-share/peer-link.js';

describe('room ids and join links', () => {
  it('generates 22-character base64url ids from 128 random bits', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(isValidRoomId(id)).toBe(true);
  });

  it('generates different ids each time', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateRoomId()));
    expect(ids.size).toBe(200);
  });

  it('puts the room id in the fragment and keeps the query', () => {
    const url = buildJoinUrl('https://site.test/liveshare-dev.html?relay=ws://x:1', 'AbCdEfGhIjKlMnOpQrStUv');
    expect(url).toBe('https://site.test/liveshare-dev.html?relay=ws://x:1#room=AbCdEfGhIjKlMnOpQrStUv');
  });

  it('reads a valid room id from the fragment and rejects malformed ones', () => {
    expect(readRoomIdFromHash('#room=AbCdEfGhIjKlMnOpQrStUv')).toBe('AbCdEfGhIjKlMnOpQrStUv');
    expect(readRoomIdFromHash('#room=short')).toBeNull();
    expect(readRoomIdFromHash('#room=<script>alert(1)</script>xxxxxxxx')).toBeNull();
    expect(readRoomIdFromHash('')).toBeNull();
  });
});

describe('relay URL resolution', () => {
  const loc = (href) => new URL(href);

  it('uses the local relay on localhost', () => {
    expect(resolveRelayUrl(loc('http://localhost:3000/liveshare-dev.html'))).toBe(LOCAL_RELAY_URL);
  });

  it('honours a ws(s) relay override on a local origin and ignores other schemes', () => {
    expect(resolveRelayUrl(loc('http://localhost:3100/x?relay=ws://localhost:8788/'))).toBe('ws://localhost:8788');
    expect(resolveRelayUrl(loc('http://127.0.0.1:3000/x?relay=wss://relay.example.workers.dev'))).toBe('wss://relay.example.workers.dev');
    expect(resolveRelayUrl(loc('http://[::1]:3000/x?relay=ws://127.0.0.1:8787'))).toBe('ws://127.0.0.1:8787');
    expect(resolveRelayUrl(loc('http://localhost:3100/x?relay=javascript:alert(1)'))).toBe(LOCAL_RELAY_URL);
    expect(resolveRelayUrl(loc('http://localhost:3100/x?relay=https://relay.example'))).toBe(LOCAL_RELAY_URL);
  });

  it('ignores ?relay= on a production origin, so a crafted link cannot pick the relay', () => {
    const crafted = 'https://dnddmtoolbox.netlify.app/liveshare-dev?relay=wss://attacker.example#room=AbCdEfGhIjKlMnOpQrStUv';
    expect(resolveRelayUrl(loc(crafted))).toBe(PRODUCTION_RELAY_URL || null);
    // Hostnames that merely contain "localhost" are not local.
    expect(resolveRelayUrl(loc('https://localhost.attacker.example/x?relay=wss://attacker.example'))).toBe(PRODUCTION_RELAY_URL || null);
  });

  it.each(['ws://%', 'ws://', 'wss://[', 'ws://a b', '%E0%A4%A', 'ws:// '])('falls back to the local relay for the malformed override %s without throwing', (value) => {
    const location = loc(`http://localhost:3000/x?relay=${encodeURIComponent(value)}`);
    expect(() => resolveRelayUrl(location)).not.toThrow();
    expect(resolveRelayUrl(location)).toBe(LOCAL_RELAY_URL);
  });
});

describe('ICE server configuration', () => {
  it('is STUN only, with well-formed stun:host:port URLs, shared by host and player', () => {
    expect(Array.isArray(DEFAULT_ICE_SERVERS)).toBe(true);
    const urls = DEFAULT_ICE_SERVERS.flatMap((server) => [].concat(server.urls));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^stun:[a-z0-9.-]+\.[a-z]{2,}:\d{2,5}$/);
    // No TURN before Milestone 8, and so no credentials in the public page.
    for (const server of DEFAULT_ICE_SERVERS) {
      expect(server).not.toHaveProperty('username');
      expect(server).not.toHaveProperty('credential');
    }
  });
});

describe('relay frames', () => {
  it('accepts known frames', () => {
    expect(parseRelayFrame('{"type":"registered"}').ok).toBe(true);
    expect(parseRelayFrame('{"type":"welcome","peerId":"abc"}').ok).toBe(true);
    expect(parseRelayFrame('{"type":"signal","from":"host","data":{}}').ok).toBe(true);
  });

  it.each([
    ['malformed JSON', '{'],
    ['an unknown type', '{"type":"state"}'],
    ['a welcome without peerId', '{"type":"welcome"}'],
    ['a signal without data', '{"type":"signal","from":"host"}'],
    ['a non-string frame', new ArrayBuffer(4)],
  ])('rejects %s without throwing', (_label, raw) => {
    expect(parseRelayFrame(raw).ok).toBe(false);
  });
});

describe('negotiation payloads', () => {
  it('round-trips an offer and a candidate', () => {
    const offer = describeSignal({ type: 'offer', sdp: 'v=0' });
    expect(parseSignalData(offer)).toEqual({ ok: true, signal: offer });
    const cand = candidateSignal({ candidate: 'candidate:1 1 udp 1 x 1 typ host', sdpMid: '0', sdpMLineIndex: 0 });
    expect(parseSignalData(cand)).toEqual({ ok: true, signal: cand });
  });

  it('accepts real browser candidates of every shape (mDNS host, IPv6 srflx, TCP, Firefox index-only) unchanged', () => {
    const lines = [
      'candidate:2395300328 1 udp 2113937151 3f1c9e1a-0b7d-4c52-9d2a-8f2c0e6a1b44.local 58113 typ host generation 0 ufrag Ymm1 network-cost 999',
      'candidate:842163049 1 udp 1677729535 2001:db8:85a3:0:0:8a2e:370:7334 61558 typ srflx raddr :: rport 0 generation 0 ufrag BYCM network-cost 999',
      'candidate:1 1 tcp 1518280447 3f1c9e1a-0b7d-4c52-9d2a-8f2c0e6a1b44.local 9 typ host tcptype active generation 0 ufrag Ymm1 network-cost 999',
    ];
    for (const line of lines) {
      const signal = candidateSignal({ candidate: line, sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'Ymm1' });
      expect(parseSignalData(JSON.parse(JSON.stringify(signal)))).toEqual({ ok: true, signal });
      expect(signal.candidate.candidate).toBe(line);
    }
    const firefox = candidateSignal({ candidate: lines[0], sdpMid: null, sdpMLineIndex: 0 });
    expect(parseSignalData(firefox).ok).toBe(true);
  });

  it('reads the candidate type without looking at the address', () => {
    expect(candidateType('candidate:1 1 udp 1 x.local 5 typ host generation 0')).toBe('host');
    expect(candidateType('candidate:1 1 udp 1 203.0.113.9 5 typ srflx raddr 0.0.0.0 rport 0')).toBe('srflx');
    expect(candidateType('candidate:1 1 udp 1 203.0.113.9 5 typ relay')).toBe('relay');
    expect(candidateType('garbage')).toBe('unknown');
  });

  it('drops unexpected fields', () => {
    const parsed = parseSignalData({ kind: 'description', description: { type: 'answer', sdp: 'v=0', extra: 1 }, junk: true });
    expect(parsed.signal).toEqual({ kind: 'description', description: { type: 'answer', sdp: 'v=0' } });
  });

  it.each([
    ['a missing kind', {}],
    ['an unknown kind', { kind: 'media' }],
    ['a rollback description', { kind: 'description', description: { type: 'rollback', sdp: '' } }],
    ['a description without sdp', { kind: 'description', description: { type: 'offer' } }],
    ['an oversized sdp', { kind: 'description', description: { type: 'offer', sdp: 'x'.repeat(20000) } }],
    ['a candidate without a string', { kind: 'candidate', candidate: { candidate: 5, sdpMid: '0' } }],
    ['a candidate without mid or index', { kind: 'candidate', candidate: { candidate: 'c' } }],
    ['null', null],
  ])('rejects %s', (_label, data) => {
    expect(parseSignalData(data).ok).toBe(false);
  });
});

describe('data-channel messages', () => {
  it('round-trips hello', () => {
    expect(parseChannelMessage(encodeHello())).toEqual({ ok: true, message: { type: 'hello', text: 'hello' } });
  });

  it.each([
    ['malformed JSON', 'hello'],
    ['a wrong version', '{"v":99,"type":"hello","text":"hi"}'],
    ['an unknown type', '{"v":0,"type":"snapshot"}'],
    ['a non-string text', '{"v":0,"type":"hello","text":{"html":"<b>"}}'],
    ['an oversized message', JSON.stringify({ v: 0, type: 'hello', text: 'x'.repeat(MAX_CHANNEL_MESSAGE_BYTES) })],
  ])('rejects %s', (_label, raw) => {
    expect(parseChannelMessage(raw).ok).toBe(false);
  });
});
