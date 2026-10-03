/**
 * Live Share Milestone 5A.3: the Battle Map's publication format on the surface ↔ session host
 * boundary (docs/live-share-session-host-architecture.md §6).
 *
 * A surface offers the session host its player-safe content WITHOUT revisions: a surface's own
 * counters restart at 1 on every page load, so the host assigns the revisions players see. For the
 * Battle Map, "content" is exactly the player snapshot (battlemap-snapshot.js, version 4) minus its
 * top-level `revision`, with `background` reduced to `{ assetId }` (no background revision):
 *
 *   surface content  ──validateBattleMapPublication──▶  host-checked content + referenced assets
 *                    ──toBattleMapSnapshot(content, { revision, backgroundRevision })──▶  player wire
 *
 * The schema is not duplicated: validation runs the players' own validateBattleMapSnapshot over the
 * content (with placeholder revisions), so the host accepts nothing a player would reject. On top of
 * that the boundary is stricter than the player:
 *   - a revision anywhere it would be trusted (top level, background) is refused, not ignored;
 *   - unknown fields are refused, not dropped: a surface that puts anything beyond the allowlist on
 *     a BroadcastChannel (an HP value, an image source, a fog field) has a bug, and its publication
 *     must not be taken;
 *   - the snapshot it would become must fit one data-channel message, with the largest revisions.
 *
 *   fromProjection(projected)   the boundary content for a BattleMapShareState projection (drops the
 *                               surface-local background revision). For the 5A.4 publisher adapter
 *                               and the 5A.3 test publisher.
 *   battleMapSurface            the host publication store's description of this surface.
 */
import { validateBattleMapSnapshot, SNAPSHOT_SCHEMA, SNAPSHOT_VERSION } from './battlemap-snapshot.js';
import { encodeBattleMapSnapshot } from './protocol.js';

export const BATTLE_MAP_SURFACE = 'battle-map';
// The Battle Map's boundary format: content of snapshot schema version 4, revisionless. Bump it with
// any change to what the Battle Map offers, so a cached older Battle Map tab is refused, not misread.
export const BATTLE_MAP_SURFACE_VERSION = 1;

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const has = (o, key) => Object.prototype.hasOwnProperty.call(o, key);

/** The boundary content for a projectPlayerSafeState() result. Never mutates its input. */
export function fromProjection(projected) {
  const { revision: _ignored, ...content } = projected || {};
  const bg = content.background;
  return { ...content, background: bg && typeof bg === 'object' ? { assetId: bg.assetId } : null };
}

/** The player snapshot for host-checked content, with the host's revisions. */
export function toBattleMapSnapshot(content, { revision, backgroundRevision }) {
  return {
    ...content,
    revision,
    background: content.background ? { assetId: content.background.assetId, revision: backgroundRevision } : null,
  };
}

// The first key of `input` that `checked` (the validator's allowlisted copy) does not have, as a path.
function extraKey(input, checked, path) {
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      const found = extraKey(input[i], checked[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (!isPlainObject(input)) return null;
  for (const key of Object.keys(input)) {
    if (!isPlainObject(checked) || !has(checked, key)) return `${path}.${key}`;
    const found = extraKey(input[key], checked[key], `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

/**
 * Validate untrusted boundary content. Returns
 *   { ok: true, content, refs: Map(assetId -> 'background' | 'token') }
 * where `content` is a fresh, allowlisted, revisionless copy, or { ok: false, error }. Never throws.
 */
export function validateBattleMapPublication(structured) {
  try {
    if (!isPlainObject(structured)) return { ok: false, error: 'structured is not an object' };
    if (has(structured, 'revision')) return { ok: false, error: 'structured must not carry a revision (the session host assigns it)' };
    if (structured.schema !== SNAPSHOT_SCHEMA || structured.version !== SNAPSHOT_VERSION) return { ok: false, error: 'unsupported structured schema or version' };
    const bg = structured.background;
    if (bg !== null && bg !== undefined) {
      if (!isPlainObject(bg)) return { ok: false, error: 'background is not an object' };
      if (has(bg, 'revision')) return { ok: false, error: 'background must not carry a revision (the session host assigns it)' };
      const key = Object.keys(bg).find((k) => k !== 'assetId');
      if (key) return { ok: false, error: `unexpected field structured.background.${key}` };
    }
    // The players' validator, with placeholder revisions where the host will put its own.
    const candidate = { ...structured, revision: 1, background: bg ? { assetId: bg.assetId, revision: 1 } : bg };
    const checked = validateBattleMapSnapshot(candidate);
    if (!checked.ok) return { ok: false, error: checked.error };
    const { background: _bg, ...withoutBackground } = structured;
    const extra = extraKey(withoutBackground, checked.snapshot, 'structured');
    if (extra) return { ok: false, error: `unexpected field ${extra}` };

    const content = toContent(checked.snapshot);
    // The largest snapshot this content can become must still fit one channel message.
    if (!encodeBattleMapSnapshot(toBattleMapSnapshot(content, { revision: Number.MAX_SAFE_INTEGER, backgroundRevision: Number.MAX_SAFE_INTEGER })).ok) {
      return { ok: false, error: 'structured is too large to send to players' };
    }
    const refs = new Map();
    if (content.background) refs.set(content.background.assetId, 'background');
    for (const t of content.tokens) {
      if (!t.assetId) continue;
      if (refs.get(t.assetId) === 'background') return { ok: false, error: 'an asset id is used as both background and token art' };
      refs.set(t.assetId, 'token');
    }
    return { ok: true, content, refs };
  } catch {
    return { ok: false, error: 'malformed structured content' };
  }
}

function toContent(snapshot) {
  const { revision: _r, background, ...rest } = snapshot;
  return { ...rest, background: background ? { assetId: background.assetId } : null };
}

/**
 * How the host publication store handles this surface (publication-store.js): validation, the
 * player-visible identity that drives revisions, and the player wire snapshot.
 */
export const battleMapSurface = Object.freeze({
  surface: BATTLE_MAP_SURFACE,
  versions: Object.freeze([BATTLE_MAP_SURFACE_VERSION]),
  validate: validateBattleMapPublication,
  // Content is compared by value: a re-offer of identical content is not a new revision.
  key: (content) => JSON.stringify(content),
  // The background has its own revision stream, which moves only when the background changes.
  backgroundId: (content) => (content.background ? content.background.assetId : null),
  toWire: toBattleMapSnapshot,
});
