/**
 * Live Share Milestone 5B.1: player protocol v1, the data-channel protocol between the session host
 * and players once admission exists (ADR §8; planning doc §7, §22). Not in production yet: the host
 * and the player page still speak v0 (protocol.js) until 5B.2 / 5B.3 switch them over.
 *
 * Every message is JSON text { v: 1, type, ...fields } (binary asset chunks are unchanged, see
 * asset-protocol.js), at most MAX_CHANNEL_MESSAGE_BYTES. Each type has an exact field list: a missing,
 * malformed or unexpected envelope field refuses the message. (A surface payload is its validator's:
 * the Battle Map's drops unknown fields, as it does for v0 players.) Direction is part of the schema: a player can't
 * send a host message and the host never accepts one as player input.
 *
 *   host -> player   admission-state { locked, passwordRequired, seats: [{ id, name, available }] }
 *                    join-result     { accepted: true, seat: { id, name }, credential } |
 *                                    { accepted: false, reason }
 *                    session-state   { surfaces: [{ surface, available }] }
 *                    session-ended   { reason }
 *                    surface-snapshot { surface, revision, payload }   payload checked by that surface's
 *                                                                      validator (SURFACE_VALIDATORS)
 *                    asset-meta, asset-abort, binary chunks            as in v0 (asset-protocol.js)
 *   player -> host   join-request    { seatId, password? }             a new claim
 *                    rejoin-request  { seatId, credential }            reclaim a disconnected seat (a reconnecting
 *                                                                      client is Milestone 7)
 *                    leave           {}
 *                    asset-request   { assetIds }
 *
 * Reasons are fixed codes, never exception text. Pings are Milestone 6.
 *
 * Which of these a peer may be sent before it is admitted is admission-gate.js's decision.
 */
import { MAX_CHANNEL_MESSAGE_BYTES } from './protocol.js';
import { validateBattleMapSnapshot } from './battlemap-snapshot.js';
import { validateAssetRequest, validateAssetMeta, validateAssetAbort, parseAssetChunk } from './asset-protocol.js';
import { isSeatId, isCredential, isPasswordValue, MAX_SEATS, MAX_SEAT_NAME } from './admission.js';

export const PROTOCOL_V1 = 1;

export const JOIN_REJECT_REASONS = Object.freeze([
  'malformed-request',
  'throttled',
  'session-ended',
  'room-locked',
  'bad-password',
  'unknown-seat',
  'seat-disabled',
  'seat-unavailable',
  'already-admitted',
  'invalid-credential',
]);
// Why a player's session ended: the host ended it ('ended'), the DM removed the player ('kicked',
// 'seat-reset', 'seat-disabled'), or the player left ('left').
export const SESSION_END_REASONS = Object.freeze(['ended', 'kicked', 'seat-reset', 'seat-disabled', 'left']);

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isRevision = (v) => Number.isSafeInteger(v) && v >= 1;
const SURFACE_NAME = /^[a-z][a-z0-9-]{0,31}$/;
export const MAX_SESSION_SURFACES = 8;
const byteLength = (text) => new TextEncoder().encode(text).length;

// ---- Surface payload validators --------------------------------------------------------------------

/**
 * The surfaces players can be sent, each with its payload validator. Deliberately small: a surface is
 * supported only once it has a validator here (and a renderer on the player). 'initiative' is not
 * one yet. The validator gets the payload and the envelope's revision and returns
 * { ok, snapshot } with a fresh, allowlisted copy, or { ok: false, error }.
 */
export const SURFACE_VALIDATORS = Object.freeze({
  // The Battle Map's player-safe snapshot (battlemap-snapshot.js), whose revision is the envelope's.
  'battle-map': (payload, revision) => {
    if (!isPlainObject(payload) || Object.prototype.hasOwnProperty.call(payload, 'revision')) return { ok: false, error: 'bad battle-map payload' };
    return validateBattleMapSnapshot({ ...payload, revision });
  },
});

/** The surface-snapshot message for a surface's player snapshot (whose revision moves to the envelope). */
export function encodeSurfaceSnapshot(surface, snapshot) {
  if (!Object.prototype.hasOwnProperty.call(SURFACE_VALIDATORS, surface)) return { ok: false, error: 'unsupported surface' };
  if (!isPlainObject(snapshot) || !isRevision(snapshot.revision)) return { ok: false, error: 'bad snapshot' };
  const { revision, ...payload } = snapshot;
  return encode('surface-snapshot', { surface, revision, payload });
}

// ---- Encoding --------------------------------------------------------------------------------------

/** { ok: true, text } or { ok: false, error } when too large for one channel message. */
export function encode(type, fields = {}) {
  const text = JSON.stringify({ ...fields, v: PROTOCOL_V1, type }); // fields can't override v or type
  if (byteLength(text) > MAX_CHANNEL_MESSAGE_BYTES) return { ok: false, error: 'message too large to send' };
  return { ok: true, text };
}

// ---- Parsing ---------------------------------------------------------------------------------------

function parseJson(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'not a text message' };
  if (byteLength(raw) > MAX_CHANNEL_MESSAGE_BYTES) return { ok: false, error: 'message too large' };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, error: 'malformed JSON' };
  }
}

function envelope(raw, table) {
  const parsed = parseJson(raw);
  if (!parsed.ok) return parsed;
  const msg = parsed.value;
  if (!isPlainObject(msg)) return { ok: false, error: 'message is not an object' };
  if (msg.v !== PROTOCOL_V1) return { ok: false, error: 'unsupported protocol version' };
  if (typeof msg.type !== 'string' || !Object.prototype.hasOwnProperty.call(table, msg.type)) return { ok: false, error: 'unknown message type' };
  const { fields, optional = [] } = table[msg.type];
  for (const key of Object.keys(msg)) {
    if (key !== 'v' && key !== 'type' && !fields.includes(key) && !optional.includes(key)) return { ok: false, type: msg.type, error: 'unexpected field' };
  }
  for (const key of fields) if (!Object.prototype.hasOwnProperty.call(msg, key)) return { ok: false, type: msg.type, error: 'missing field' };
  return { ok: true, msg };
}

const PLAYER_TO_HOST = {
  'join-request': { fields: ['seatId'], optional: ['password'] },
  'rejoin-request': { fields: ['seatId', 'credential'] },
  leave: { fields: [] },
  'asset-request': { fields: ['assetIds'] },
};

/**
 * A message from a player, as the host reads it (untrusted). Returns { ok: true, message } with a
 * fresh copy of the known fields, or { ok: false, error, type? }. Never throws.
 */
export function parsePlayerMessage(raw) {
  try {
    if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) return { ok: false, error: 'players send no binary messages' };
    const env = envelope(raw, PLAYER_TO_HOST);
    if (!env.ok) return env;
    const { msg } = env;
    const bad = (error) => ({ ok: false, type: msg.type, error });
    switch (msg.type) {
      case 'join-request':
        if (!isSeatId(msg.seatId)) return bad('bad seat id');
        if (msg.password !== undefined && !isPasswordValue(msg.password)) return bad('bad password value');
        return { ok: true, message: { type: 'join-request', seatId: msg.seatId, ...(msg.password !== undefined ? { password: msg.password } : {}) } };
      case 'rejoin-request':
        if (!isSeatId(msg.seatId) || !isCredential(msg.credential)) return bad('bad rejoin request');
        return { ok: true, message: { type: 'rejoin-request', seatId: msg.seatId, credential: msg.credential } };
      case 'leave':
        return { ok: true, message: { type: 'leave' } };
      case 'asset-request': {
        const checked = validateAssetRequest(msg);
        return checked.ok ? checked : bad(checked.error);
      }
    }
    return { ok: false, error: 'unknown message type' };
  } catch {
    return { ok: false, error: 'malformed message' };
  }
}

/** The admission request a parsed join-/rejoin-request makes (admission.js requestAdmission). */
export function admissionRequestOf(message) {
  if (message.type === 'join-request') return { kind: 'join', seatId: message.seatId, ...(message.password !== undefined ? { password: message.password } : {}) };
  if (message.type === 'rejoin-request') return { kind: 'rejoin', seatId: message.seatId, credential: message.credential };
  return null;
}

const HOST_TO_PLAYER = {
  'admission-state': { fields: ['locked', 'passwordRequired', 'seats'] },
  'join-result': { fields: ['accepted'], optional: ['seat', 'credential', 'reason'] },
  'session-state': { fields: ['surfaces'] },
  'session-ended': { fields: ['reason'] },
  'surface-snapshot': { fields: ['surface', 'revision', 'payload'] },
  'asset-meta': { fields: ['asset'] },
  'asset-abort': { fields: ['assetId', 'reason'] },
};

function seatSummary(s) {
  if (!isPlainObject(s) || Object.keys(s).some((k) => !['id', 'name', 'available'].includes(k))) return null;
  if (!isSeatId(s.id) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > MAX_SEAT_NAME || typeof s.available !== 'boolean') return null;
  return { id: s.id, name: s.name, available: s.available };
}

/**
 * A message from the host, as a player reads it (untrusted too). Binary messages are asset chunks.
 * Returns { ok: true, message } or { ok: false, error, type? }. Never throws.
 */
export function parseHostMessage(raw) {
  try {
    if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) return parseAssetChunk(raw);
    const env = envelope(raw, HOST_TO_PLAYER);
    if (!env.ok) return env;
    const { msg } = env;
    const bad = (error) => ({ ok: false, type: msg.type, error });
    switch (msg.type) {
      case 'admission-state': {
        if (typeof msg.locked !== 'boolean' || typeof msg.passwordRequired !== 'boolean') return bad('bad admission state');
        if (!Array.isArray(msg.seats) || msg.seats.length > MAX_SEATS) return bad('bad seat list');
        const seats = msg.seats.map(seatSummary);
        if (seats.includes(null)) return bad('bad seat');
        return { ok: true, message: { type: 'admission-state', locked: msg.locked, passwordRequired: msg.passwordRequired, seats } };
      }
      case 'join-result': {
        if (msg.accepted === true) {
          const s = msg.seat;
          if (msg.reason !== undefined || !isPlainObject(s) || Object.keys(s).length !== 2 || !isSeatId(s.id) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > MAX_SEAT_NAME || !isCredential(msg.credential)) {
            return bad('bad join result');
          }
          return { ok: true, message: { type: 'join-result', accepted: true, seat: { id: s.id, name: s.name }, credential: msg.credential } };
        }
        if (msg.accepted === false) {
          if (msg.seat !== undefined || msg.credential !== undefined || !JOIN_REJECT_REASONS.includes(msg.reason)) return bad('bad join result');
          return { ok: true, message: { type: 'join-result', accepted: false, reason: msg.reason } };
        }
        return bad('bad join result');
      }
      case 'session-state': {
        if (!Array.isArray(msg.surfaces) || msg.surfaces.length > MAX_SESSION_SURFACES) return bad('bad surface list');
        const surfaces = [];
        for (const s of msg.surfaces) {
          if (!isPlainObject(s) || Object.keys(s).length !== 2 || typeof s.surface !== 'string' || !SURFACE_NAME.test(s.surface) || typeof s.available !== 'boolean') return bad('bad surface entry');
          surfaces.push({ surface: s.surface, available: s.available });
        }
        return { ok: true, message: { type: 'session-state', surfaces } };
      }
      case 'session-ended':
        if (!SESSION_END_REASONS.includes(msg.reason)) return bad('bad session-ended');
        return { ok: true, message: { type: 'session-ended', reason: msg.reason } };
      case 'surface-snapshot': {
        if (typeof msg.surface !== 'string' || !SURFACE_NAME.test(msg.surface)) return bad('bad surface');
        if (!Object.prototype.hasOwnProperty.call(SURFACE_VALIDATORS, msg.surface)) return bad('unsupported surface');
        if (!isRevision(msg.revision)) return bad('bad revision');
        const checked = SURFACE_VALIDATORS[msg.surface](msg.payload, msg.revision);
        if (!checked.ok) return bad(`bad ${msg.surface} payload`);
        return { ok: true, message: { type: 'surface-snapshot', surface: msg.surface, revision: msg.revision, snapshot: checked.snapshot } };
      }
      case 'asset-meta': {
        const checked = validateAssetMeta(msg);
        return checked.ok ? checked : bad(checked.error);
      }
      case 'asset-abort': {
        const checked = validateAssetAbort(msg);
        return checked.ok ? checked : bad(checked.error);
      }
    }
    return { ok: false, error: 'unknown message type' };
  } catch {
    return { ok: false, error: 'malformed message' };
  }
}

// ---- Host-side builders: what the host sends, from the admission model ------------------------------

/** admission-state for an unadmitted peer: the model's sanitized projection, nothing else. */
export const encodeAdmissionState = (state) => encode('admission-state', { locked: state.locked, passwordRequired: state.passwordRequired, seats: state.seats.map((s) => ({ id: s.id, name: s.name, available: s.available })) });

/** join-result for one requesting peer (the credential only ever goes to the peer that was admitted). */
export const encodeJoinResult = (result) =>
  result.ok ? encode('join-result', { accepted: true, seat: { id: result.seat.id, name: result.seat.name }, credential: result.credential }) : encode('join-result', { accepted: false, reason: result.reason });

export const encodeSessionEnded = (reason) => encode('session-ended', { reason });
