// Live Share Milestone 5B.1: player protocol v1 (protocol-v1.js) and the pre-admission send policy
// (admission-gate.js). Neither is used by the product yet: production players still speak v0.
import { describe, it, expect } from 'vitest';
import {
  parsePlayerMessage,
  parseHostMessage,
  encode,
  encodeSurfaceSnapshot,
  encodeAdmissionState,
  encodeJoinResult,
  encodeSessionEnded,
  admissionRequestOf,
  SURFACE_VALIDATORS,
  JOIN_REJECT_REASONS,
  PROTOCOL_V1,
  MAX_SESSION_SURFACES,
} from '../../js/modules/live-share/protocol-v1.js';
import { maySend, mayAccept, PEER_STATES } from '../../js/modules/live-share/admission-gate.js';
import { createAdmissionModel, generateCredential } from '../../js/modules/live-share/admission.js';
import { encodeAssetChunk, CHUNK_BYTES } from '../../js/modules/live-share/asset-protocol.js';
import { MAX_CHANNEL_MESSAGE_BYTES } from '../../js/modules/live-share/protocol.js';

const msg = (fields) => JSON.stringify({ v: 1, ...fields });

// A Battle Map player snapshot in the shape the host store produces (with its revision).
const snapshot = (overrides = {}) => ({
  schema: 'dmtoolbox.battlemap.player-safe',
  version: 4,
  map: { width: 800, height: 600 },
  background: { assetId: 'a'.repeat(64), revision: 2 },
  mapTransform: { scale: 1, x: 0, y: 0 },
  grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
  tokens: [{ id: 't1', x: 1, y: 2, w: 50, h: 50, rot: 0, name: 'Bard', conditions: [], assetId: null, presetId: 'player-bard', aura: null, visionCone: null }],
  measurements: [],
  revision: 7,
  ...overrides,
});

describe('protocol v1: player -> host', () => {
  it('accepts well-formed join, rejoin, leave and asset-request messages, copying known fields only', () => {
    expect(parsePlayerMessage(msg({ type: 'join-request', seatId: 's1' }))).toEqual({ ok: true, message: { type: 'join-request', seatId: 's1' } });
    expect(parsePlayerMessage(msg({ type: 'join-request', seatId: 's2', password: 'pw' }))).toEqual({ ok: true, message: { type: 'join-request', seatId: 's2', password: 'pw' } });
    const credential = generateCredential();
    expect(parsePlayerMessage(msg({ type: 'rejoin-request', seatId: 's1', credential }))).toEqual({ ok: true, message: { type: 'rejoin-request', seatId: 's1', credential } });
    expect(parsePlayerMessage(msg({ type: 'leave' }))).toEqual({ ok: true, message: { type: 'leave' } });
    expect(parsePlayerMessage(msg({ type: 'asset-request', assetIds: ['b'.repeat(64)] })).ok).toBe(true);
    expect(admissionRequestOf({ type: 'join-request', seatId: 's1', password: 'pw' })).toEqual({ kind: 'join', seatId: 's1', password: 'pw' });
    expect(admissionRequestOf({ type: 'rejoin-request', seatId: 's1', credential })).toEqual({ kind: 'rejoin', seatId: 's1', credential });
    expect(admissionRequestOf({ type: 'leave' })).toBeNull();
  });

  it('refuses wrong versions, unknown or host-only types, unexpected or malformed fields, and oversized values', () => {
    for (const bad of [
      JSON.stringify({ type: 'join-request', seatId: 's1' }), // no version
      JSON.stringify({ v: 0, type: 'join-request', seatId: 's1' }),
      JSON.stringify({ v: 2, type: 'join-request', seatId: 's1' }),
      JSON.stringify({ v: '1', type: 'join-request', seatId: 's1' }),
      msg({ type: 'ping' }), // Milestone 6
      msg({ type: 'hello' }),
      msg({ type: 'admission-state', locked: false, passwordRequired: false, seats: [] }), // host-only
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 1, payload: {} }), // host-only
      msg({ type: 'join-result', accepted: true }),
      msg({ type: 'join-request', seatId: 's1', admin: true }),
      msg({ type: 'join-request' }),
      msg({ type: 'join-request', seatId: 'S1' }),
      msg({ type: 'join-request', seatId: 's1', password: '' }),
      msg({ type: 'join-request', seatId: 's1', password: 'x'.repeat(129) }),
      msg({ type: 'join-request', seatId: 's1', password: 12345 }),
      msg({ type: 'rejoin-request', seatId: 's1', credential: 'x'.repeat(44) }),
      msg({ type: 'rejoin-request', seatId: 's1', credential: 'short' }),
      msg({ type: 'rejoin-request', seatId: 's1' }),
      msg({ type: 'leave', reason: 'bye' }),
      msg({ type: 'asset-request', assetIds: ['not-an-id'] }),
      msg({ type: 'join-request', seatId: 's1', password: 'p'.repeat(MAX_CHANNEL_MESSAGE_BYTES) }),
      '{not json',
      '[]',
      'null',
      42,
      new ArrayBuffer(8), // players send no binary
    ]) {
      expect(parsePlayerMessage(bad).ok).toBe(false);
    }
  });

  it('refuses an oversized message, however well-formed, before parsing it', () => {
    const big = (type) => JSON.stringify({ v: 1, type, seatId: 's1' }).replace('}', `${' '.repeat(MAX_CHANNEL_MESSAGE_BYTES)}}`);
    expect(parsePlayerMessage(big('join-request'))).toEqual({ ok: false, error: 'message too large' });
    expect(parseHostMessage(JSON.stringify({ v: 1, type: 'session-ended', reason: 'ended' }).replace('}', `${' '.repeat(MAX_CHANNEL_MESSAGE_BYTES)}}`))).toEqual({ ok: false, error: 'message too large' });
    expect(encode('session-state', { surfaces: [{ surface: 'battle-map', available: true, pad: 'x'.repeat(MAX_CHANNEL_MESSAGE_BYTES) }] })).toEqual({ ok: false, error: 'message too large to send' });
  });

  it('the host encoder never lets fields override the version or type', () => {
    const encoded = JSON.parse(encode('session-ended', { reason: 'ended', v: 2, type: 'surface-snapshot' }).text);
    expect(encoded).toMatchObject({ v: 1, type: 'session-ended' });
  });

  it('never echoes player-controlled text into its errors', () => {
    const r = parsePlayerMessage(msg({ type: '<script>alert(1)</script>' }));
    expect(r.error).toBe('unknown message type');
    const r2 = parsePlayerMessage(msg({ type: 'join-request', seatId: 's1', 'evil<b>': 1 }));
    expect(r2.error).not.toContain('evil');
  });
});

describe('protocol v1: host -> player', () => {
  it('admission-state carries only the sanitized seats, lock and password flag', () => {
    const model = createAdmissionModel();
    const a = model.createSeat('Caleb');
    model.createSeat('Jester');
    model.setPassword('secret-pw');
    const { credential } = model.requestAdmission('peer-1', { kind: 'join', seatId: a, password: 'secret-pw' });
    const encoded = encodeAdmissionState(model.admissionState());
    expect(encoded.ok).toBe(true);
    expect(encoded.text).not.toMatch(/secret-pw|peer-1/);
    expect(encoded.text).not.toContain(credential);
    expect(parseHostMessage(encoded.text)).toEqual({
      ok: true,
      message: { type: 'admission-state', locked: false, passwordRequired: true, seats: [{ id: 's1', name: 'Caleb', available: false }, { id: 's2', name: 'Jester', available: true }] },
    });
    // A seat entry with anything more is refused.
    expect(parseHostMessage(msg({ type: 'admission-state', locked: false, passwordRequired: false, seats: [{ id: 's1', name: 'x', available: true, credential }] })).ok).toBe(false);
  });

  it('join-result: accepted with seat and credential, or rejected with a fixed reason code', () => {
    const credential = generateCredential();
    const accepted = encodeJoinResult({ ok: true, seat: { id: 's1', name: 'Caleb' }, credential });
    expect(parseHostMessage(accepted.text)).toEqual({ ok: true, message: { type: 'join-result', accepted: true, seat: { id: 's1', name: 'Caleb' }, credential } });
    for (const reason of JOIN_REJECT_REASONS) {
      expect(parseHostMessage(encodeJoinResult({ ok: false, reason }).text)).toEqual({ ok: true, message: { type: 'join-result', accepted: false, reason } });
    }
    for (const bad of [
      msg({ type: 'join-result', accepted: false, reason: 'TypeError: x is undefined' }),
      msg({ type: 'join-result', accepted: false, reason: 'bad-password', credential }),
      msg({ type: 'join-result', accepted: true, seat: { id: 's1', name: 'Caleb' } }),
      msg({ type: 'join-result', accepted: true, seat: { id: 's1', name: 'Caleb', extra: 1 }, credential }),
      msg({ type: 'join-result', accepted: true, seat: { id: 's1', name: 'Caleb' }, credential, reason: 'bad-password' }),
      msg({ type: 'join-result', accepted: true, seat: { id: 's1', name: '   ' }, credential }),
      msg({ type: 'join-result', accepted: 'yes' }),
    ]) {
      expect(parseHostMessage(bad).ok).toBe(false);
    }
  });

  it('session-ended and session-state are strict', () => {
    expect(parseHostMessage(encodeSessionEnded('kicked').text)).toEqual({ ok: true, message: { type: 'session-ended', reason: 'kicked' } });
    expect(parseHostMessage(msg({ type: 'session-ended', reason: 'because I said so' })).ok).toBe(false);
    expect(parseHostMessage(encode('session-state', { surfaces: [{ surface: 'battle-map', available: true }] }).text).ok).toBe(true);
    const entry = { surface: 'battle-map', available: true };
    for (const bad of [
      msg({ type: 'session-state', surfaces: [{ surface: 'battle-map', available: 'yes' }] }),
      msg({ type: 'session-state', surfaces: [{ ...entry, extra: 1 }] }),
      msg({ type: 'session-state', surfaces: Array(MAX_SESSION_SURFACES + 1).fill(entry) }),
    ]) {
      expect(parseHostMessage(bad).ok).toBe(false);
    }
  });

  it('admission-state limits: seat count, seat names', () => {
    const seat = { id: 's1', name: 'Caleb', available: true };
    expect(parseHostMessage(msg({ type: 'admission-state', locked: false, passwordRequired: false, seats: [seat] })).ok).toBe(true);
    for (const seats of [Array(33).fill(seat), [{ ...seat, name: '' }], [{ ...seat, name: '   ' }], [{ ...seat, name: 'x'.repeat(41) }], [{ ...seat, id: 'seat-1' }]]) {
      expect(parseHostMessage(msg({ type: 'admission-state', locked: false, passwordRequired: false, seats })).ok).toBe(false);
    }
  });

  it('encodeSurfaceSnapshot refuses what no player would accept', () => {
    expect(encodeSurfaceSnapshot('battle-map', null)).toEqual({ ok: false, error: 'bad snapshot' });
    expect(encodeSurfaceSnapshot('battle-map', { ...snapshot(), revision: undefined })).toEqual({ ok: false, error: 'bad snapshot' });
    expect(encodeSurfaceSnapshot('battle-map', snapshot({ revision: 0 }))).toEqual({ ok: false, error: 'bad snapshot' });
  });

  it('surface-snapshot: the Battle Map payload goes through its own validator, with the envelope revision', () => {
    const encoded = encodeSurfaceSnapshot('battle-map', snapshot());
    const wire = JSON.parse(encoded.text);
    expect(Object.keys(wire).sort()).toEqual(['payload', 'revision', 'surface', 'type', 'v']);
    expect(wire.payload.revision).toBeUndefined();
    const parsed = parseHostMessage(encoded.text);
    expect(parsed).toEqual({ ok: true, message: { type: 'surface-snapshot', surface: 'battle-map', revision: 7, snapshot: snapshot() } });
    // Unknown payload fields are dropped by the Battle Map validator, as for v0 players.
    const extra = parseHostMessage(msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 3, payload: { ...wire.payload, hp: 9 } }));
    expect(extra.ok && extra.message.snapshot.hp).toBeUndefined();
  });

  it('surface-snapshot refuses bad revisions, malformed payloads, unknown surfaces and the not-yet-supported Initiative Tracker', () => {
    const { payload } = JSON.parse(encodeSurfaceSnapshot('battle-map', snapshot()).text);
    for (const bad of [
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 0, payload }),
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 1.5, payload }),
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: '7', payload }),
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 7, payload: { ...payload, revision: 99 } }), // revision in the payload too
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 7, payload: { ...payload, version: 3 } }),
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 7, payload: { ...payload, tokens: 'all of them' } }),
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 7, payload: null }),
      msg({ type: 'surface-snapshot', surface: 'initiative', revision: 1, payload: {} }),
      msg({ type: 'surface-snapshot', surface: 'notes', revision: 1, payload: {} }),
      msg({ type: 'surface-snapshot', surface: '__proto__', revision: 1, payload: {} }),
      msg({ type: 'surface-snapshot', surface: 'constructor', revision: 1, payload: {} }),
      msg({ type: 'surface-snapshot', surface: 'battle-map', revision: 7, payload, extra: true }),
    ]) {
      expect(parseHostMessage(bad).ok).toBe(false);
    }
    // Refused as unsupported by the registry itself (not merely because something threw).
    for (const surface of ['initiative', 'notes', 'constructor', 'tostring']) {
      expect(parseHostMessage(msg({ type: 'surface-snapshot', surface, revision: 1, payload })), surface).toEqual({ ok: false, type: 'surface-snapshot', error: 'unsupported surface' });
    }
    expect(Object.keys(SURFACE_VALIDATORS)).toEqual(['battle-map']);
    expect(encodeSurfaceSnapshot('initiative', snapshot())).toEqual({ ok: false, error: 'unsupported surface' });
  });

  it('assets keep the v0 shapes; binary chunks parse as before; a player message is never a host message', () => {
    const meta = encode('asset-meta', { asset: { assetId: 'c'.repeat(64), kind: 'background', mime: 'image/webp', byteLength: 10, width: 4, height: 4, chunkCount: 1 } });
    expect(parseHostMessage(meta.text)).toMatchObject({ ok: true, message: { type: 'asset-meta' } });
    expect(parseHostMessage(encode('asset-abort', { assetId: 'c'.repeat(64), reason: 'superseded' }).text).ok).toBe(true);
    const chunk = encodeAssetChunk('c'.repeat(64), 0, new Uint8Array(CHUNK_BYTES / 2));
    expect(parseHostMessage(chunk)).toMatchObject({ ok: true, message: { type: 'asset-chunk', index: 0 } });
    expect(parseHostMessage(msg({ type: 'join-request', seatId: 's1' })).ok).toBe(false);
    expect(parseHostMessage(msg({ type: 'asset-request', assetIds: ['c'.repeat(64)] })).ok).toBe(false);
    expect(PROTOCOL_V1).toBe(1);
  });
});

describe('admission gate: what an unadmitted peer may be sent', () => {
  const GAME = ['surface-snapshot', 'asset-meta', 'asset-chunk', 'asset-abort', 'session-state', 'ping', 'battlemap-snapshot', 'hello'];

  it('an unadmitted peer may be sent admission state, its join result and session-ended, and nothing else', () => {
    for (const type of ['admission-state', 'join-result', 'session-ended']) expect(maySend('unadmitted', type)).toBe(true);
    for (const type of GAME) expect(maySend('unadmitted', type)).toBe(false);
  });

  it('an admitted peer may be sent surface and asset traffic, but not pings yet nor admission state', () => {
    for (const type of ['surface-snapshot', 'asset-meta', 'asset-chunk', 'asset-abort', 'session-state', 'session-ended', 'join-result']) expect(maySend('admitted', type)).toBe(true);
    for (const type of ['ping', 'admission-state', 'battlemap-snapshot', 'hello']) expect(maySend('admitted', type)).toBe(false);
  });

  it('denies by default: unknown states and types, prototype keys, non-strings', () => {
    expect(PEER_STATES).toEqual(['unadmitted', 'admitted']);
    for (const state of [undefined, null, 'connected', 'ADMITTED', '__proto__', 'constructor', 'toString']) {
      expect(maySend(state, 'admission-state')).toBe(false);
      expect(mayAccept(state, 'join-request')).toBe(false);
    }
    for (const type of [undefined, null, '', 'constructor', '__proto__', 'has', 7, {}]) {
      expect(maySend('admitted', type)).toBe(false);
      expect(maySend('unadmitted', type)).toBe(false);
    }
  });

  it('inbound: an unadmitted peer may only ask to join or leave; an admitted one may ask for assets', () => {
    for (const type of ['join-request', 'rejoin-request', 'leave']) expect(mayAccept('unadmitted', type)).toBe(true);
    expect(mayAccept('unadmitted', 'asset-request')).toBe(false); // no assets before admission
    expect(mayAccept('unadmitted', 'ping')).toBe(false);
    expect(mayAccept('admitted', 'asset-request')).toBe(true);
    expect(mayAccept('admitted', 'leave')).toBe(true);
    expect(mayAccept('admitted', 'join-request')).toBe(false);
    expect(mayAccept('admitted', 'rejoin-request')).toBe(false);
    expect(mayAccept('admitted', 'ping')).toBe(false); // Milestone 6
  });
});
