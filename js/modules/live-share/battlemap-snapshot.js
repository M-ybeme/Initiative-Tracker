/**
 * Live Share Milestone 2: the `battlemap-snapshot` message payload, on the receiving side.
 *
 * The host sends the Battle Map's player-safe snapshot exactly as the Milestone 1 seam produced it
 * (js/modules/battle-map-share-state.js); nothing here builds or changes one. A player treats what
 * arrives as untrusted (planning doc §22):
 *
 *   validateBattleMapSnapshot(payload)  checks the schema, version and revision, then copies every
 *                                       allowlisted field into a new object, checking type, range and
 *                                       size as it goes. Unknown fields are never copied, so they can't
 *                                       reach the renderer; anything malformed rejects the snapshot.
 *   createSnapshotReceiver({ onApply }) the latest-state-wins gate (§14): a snapshot is applied only
 *                                       when its revision is newer than the last one applied. Older and
 *                                       repeated revisions are ignored, never replayed or requested.
 *
 * The shape must stay in step with projectPlayerSafeState(): tests/unit/live-share-battlemap-snapshot
 * .test.js checks that every projection output (including the largest allowed) is accepted here.
 */

// Must match BattleMapShareState.SCHEMA / VERSION (checked by the unit tests).
export const SNAPSHOT_SCHEMA = 'dmtoolbox.battlemap.player-safe';
export const SNAPSHOT_VERSION = 1;

// The Milestone 1 projection's own limits: it never produces more than this.
export const MAX_TOKENS = 500;
export const MAX_MEASUREMENTS = 500;
export const MAX_CONDITIONS = 32;
export const MAX_TEXT = 200;
const MAX_ID = 100;
// World coordinates and sizes in pixels. Far beyond any real map, small enough that geometry stays
// well-behaved; the projection only ever produces finite numbers.
export const MAX_COORD = 1e7;

const MEASUREMENT_TYPES = new Set(['line', 'cone', 'circle']);
const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

class Invalid extends Error {}
const fail = (what) => {
  throw new Invalid(what);
};

function obj(v, what) {
  if (!isPlainObject(v)) fail(`${what} is not an object`);
  return v;
}
function coord(v, what) {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > MAX_COORD) fail(`${what} is not a finite number in range`);
  return v;
}
// Sizes and scales: a negative value (only possible from corrupt saved data) draws as 0 rather than
// costing the player every later snapshot. Type, finiteness and magnitude are still enforced.
function size(v, what) {
  return Math.max(0, coord(v, what));
}
function id(v, what) {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_ID) fail(`${what} is not a valid id`);
  return v;
}
function text(v, what) {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_TEXT) fail(`${what} is not valid text`);
  return v;
}
function hexColor(v, what) {
  if (typeof v !== 'string' || !HEX_COLOR.test(v)) fail(`${what} is not a hex color`);
  return v;
}
function list(v, max, what) {
  if (!Array.isArray(v)) fail(`${what} is not an array`);
  if (v.length > max) fail(`${what} has more than ${max} entries`);
  return v;
}

function readToken(t, i) {
  const where = `tokens[${i}]`;
  obj(t, where);
  return {
    id: id(t.id, `${where}.id`),
    x: coord(t.x, `${where}.x`),
    y: coord(t.y, `${where}.y`),
    w: size(t.w, `${where}.w`),
    h: size(t.h, `${where}.h`),
    rot: coord(t.rot, `${where}.rot`),
    name: t.name === null ? null : text(t.name, `${where}.name`),
    conditions: list(t.conditions, MAX_CONDITIONS, `${where}.conditions`).map((c, j) => text(c, `${where}.conditions[${j}]`)),
  };
}

function readMeasurement(m, i) {
  const where = `measurements[${i}]`;
  obj(m, where);
  if (!MEASUREMENT_TYPES.has(m.type)) fail(`${where}.type is unknown`);
  return {
    id: id(m.id, `${where}.id`),
    type: m.type,
    x1: coord(m.x1, `${where}.x1`),
    y1: coord(m.y1, `${where}.y1`),
    x2: coord(m.x2, `${where}.x2`),
    y2: coord(m.y2, `${where}.y2`),
    color: hexColor(m.color, `${where}.color`),
  };
}

/**
 * Validate an untrusted snapshot payload. Returns `{ ok: true, snapshot }` with a fresh object made
 * only of allowlisted, checked fields, or `{ ok: false, error }`. Never throws; never mutates input.
 */
export function validateBattleMapSnapshot(payload) {
  try {
    obj(payload, 'snapshot');
    if (payload.schema !== SNAPSHOT_SCHEMA) fail('unknown schema');
    if (payload.version !== SNAPSHOT_VERSION) fail(`unsupported snapshot version ${JSON.stringify(payload.version)}`);
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 1) fail('revision is not a positive integer');

    const map = obj(payload.map, 'map');
    const mt = obj(payload.mapTransform, 'mapTransform');
    const grid = obj(payload.grid, 'grid');
    if (typeof grid.show !== 'boolean') fail('grid.show is not a boolean');

    return {
      ok: true,
      snapshot: {
        schema: SNAPSHOT_SCHEMA,
        version: SNAPSHOT_VERSION,
        revision: payload.revision,
        map: { width: size(map.width, 'map.width'), height: size(map.height, 'map.height') },
        mapTransform: { scale: size(mt.scale, 'mapTransform.scale'), x: coord(mt.x, 'mapTransform.x'), y: coord(mt.y, 'mapTransform.y') },
        grid: {
          size: size(grid.size, 'grid.size'),
          unitsPerCell: size(grid.unitsPerCell, 'grid.unitsPerCell'),
          color: hexColor(grid.color, 'grid.color'),
          alpha: Math.min(1, Math.max(0, coord(grid.alpha, 'grid.alpha'))),
          show: grid.show,
          offsetX: coord(grid.offsetX, 'grid.offsetX'),
          offsetY: coord(grid.offsetY, 'grid.offsetY'),
        },
        tokens: list(payload.tokens, MAX_TOKENS, 'tokens').map(readToken),
        measurements: list(payload.measurements, MAX_MEASUREMENTS, 'measurements').map(readMeasurement),
      },
    };
  } catch (err) {
    if (err instanceof Invalid) return { ok: false, error: err.message };
    return { ok: false, error: 'malformed snapshot' };
  }
}

/**
 * Latest-state-wins gate for validated snapshots. `receive(snapshot)` returns
 *   'applied'  newer than the last applied revision: onApply(snapshot) was called
 *   'stale'    the same or an older revision: ignored (no replay, no resync request)
 * `reject(error)` counts a message that failed validation. `stats()` is safe for diagnostics: counts
 * and revisions only, never snapshot content.
 *
 * Revisions come from the host page's seam, which restarts at 1 when the Battle Map page loads. A
 * receiver belongs to one connection to one host page, which a host reload always closes, so the
 * revisions it sees always come from one seam. (Reconnect, Milestone 7, will start a fresh receiver.)
 */
export function createSnapshotReceiver({ onApply }) {
  let lastApplied = 0;
  const stats = {
    snapshotsReceived: 0,
    snapshotsApplied: 0,
    snapshotsIgnoredStale: 0,
    snapshotsRejectedInvalid: 0,
    lastSnapshotReceivedRevision: null,
    lastSnapshotAppliedRevision: null,
    lastSnapshotError: null,
  };

  return {
    receive(snapshot) {
      stats.snapshotsReceived += 1;
      stats.lastSnapshotReceivedRevision = snapshot.revision;
      if (snapshot.revision <= lastApplied) {
        stats.snapshotsIgnoredStale += 1;
        return 'stale';
      }
      lastApplied = snapshot.revision;
      stats.snapshotsApplied += 1;
      stats.lastSnapshotAppliedRevision = snapshot.revision;
      onApply(snapshot);
      return 'applied';
    },
    reject(error) {
      stats.snapshotsRejectedInvalid += 1;
      stats.lastSnapshotError = String(error).slice(0, 200);
    },
    get lastAppliedRevision() {
      return lastApplied;
    },
    stats: () => ({ ...stats }),
  };
}
