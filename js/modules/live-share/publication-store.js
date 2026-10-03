/**
 * Live Share Milestone 5A.3: the session host's publication store
 * (docs/live-share-session-host-architecture.md §6, §7).
 *
 * The session host keeps, per surface, the CURRENT COMMITTED publication (what players see) and at
 * most one PENDING publication (an offer waiting for its assets). It is a store of current player-safe
 * publications, not of DM state: no history, nothing persisted, cleared when the session ends.
 *
 *   committed  { content, key, revision, backgroundRevision, wire, refs: Map(id -> kind) }
 *   pending    { instanceId, publicationSeq, content, key, refs, meta: Map(id -> offered metadata),
 *                missing: Set(id), verifying: Set(id) }
 *   held       Map(id -> { assetId, kind, mime, width, height, byteLength, bytes }): verified bytes. An asset
 *              stays while the committed or the pending publication references it, so the committed
 *              assets remain available until the replacing publication commits.
 *
 * Offer → need → assets → commit:
 *   offer()         validates the structured content with the surface's schema and the asset list
 *                   against what the content references (exactly those ids, the right kind each, within
 *                   the per-kind limits). A newer offer from the active tab supersedes an unfinished
 *                   pending one. Assets already held are not asked for again (ids are content-derived).
 *   receiveAsset()  takes bytes only for the pending publication's seq, from its instance, for an id it
 *                   is still missing, with exactly the offered metadata, the claimed image signature
 *                   and a SHA-256 equal to the id. Anything else is ignored (stale or unrequested) or
 *                   rejects the pending publication (wrong bytes). The committed one is never touched.
 *   commit          only once every referenced asset is held: one assignment replaces the committed
 *                   publication, so structured state and its assets change together, never half.
 *
 * Revisions are the host's (surfaces restart theirs on every page load) and per surface:
 *   revision            +1 when the committed content changes by value; an identical re-offer (also
 *                       from a reloaded tab) commits nothing new and keeps its revision.
 *   backgroundRevision  +1 when the committed background asset changes; a token-only change keeps it.
 * Both only ever rise within a session (A → B → A is three revisions).
 *
 * Which tab may offer (the active publisher), liveness and messaging belong to the boundary
 * (session-host-boundary.js); this file trusts nothing but its own checks of what it is given.
 */
import { matchesMime, sha256Hex, ASSET_LIMITS } from './asset-protocol.js';

// Host memory bound for one publication's token art (each image is at most 1 MiB, 512 px).
export const MAX_TOKEN_ART_BYTES = 64 * 1024 * 1024;

const sameMeta = (a, b) => a.kind === b.kind && a.mime === b.mime && a.width === b.width && a.height === b.height && a.byteLength === b.byteLength;

/**
 * @param {object} options
 * @param {object[]} options.surfaces   surface descriptions (battlemap-publication.js battleMapSurface)
 * @param {SubtleCrypto} [options.subtle]
 */
export function createPublicationStore({ surfaces, subtle = globalThis.crypto && globalThis.crypto.subtle }) {
  const states = new Map(); // surface -> state
  for (const s of surfaces) states.set(s.surface, newState(s));

  function newState(spec) {
    return {
      spec,
      committed: null,
      pending: null,
      held: new Map(),
      revision: 0,
      backgroundRevision: 0,
      stats: { offers: 0, commits: 0, unchanged: 0, rejected: 0, superseded: 0, dropped: 0, assetsReceived: 0, assetsIgnored: 0, assetsReleased: 0, lastRejectReason: null, lastError: null },
    };
  }

  const stateOf = (surface) => states.get(surface) || null;

  // Drop every held asset neither the committed nor the pending publication references.
  function prune(state) {
    for (const id of [...state.held.keys()]) {
      if ((state.committed && state.committed.refs.has(id)) || (state.pending && state.pending.refs.has(id))) continue;
      state.held.delete(id);
      state.stats.assetsReleased += 1;
    }
  }

  function reject(state, reason, error) {
    state.stats.rejected += 1;
    state.stats.lastRejectReason = reason;
    state.stats.lastError = error ? String(error).slice(0, 200) : null;
    return { status: 'rejected', reason };
  }

  function commit(state) {
    const p = state.pending;
    state.pending = null;
    const prev = state.committed;
    if (prev && prev.key === p.key) {
      state.stats.unchanged += 1;
      prune(state);
      return { status: 'committed', publicationSeq: p.publicationSeq, revision: prev.revision, changed: false };
    }
    const bgId = state.spec.backgroundId(p.content);
    const prevBgId = prev ? state.spec.backgroundId(prev.content) : null;
    if (bgId !== null && bgId !== prevBgId) state.backgroundRevision += 1;
    state.revision += 1;
    const revisions = { revision: state.revision, backgroundRevision: state.backgroundRevision };
    // The one switch: content, revisions and asset references change together.
    state.committed = { content: p.content, key: p.key, refs: p.refs, ...revisions, wire: Object.freeze(state.spec.toWire(p.content, revisions)) };
    state.stats.commits += 1;
    prune(state); // only now may assets the old publication alone used go
    return { status: 'committed', publicationSeq: p.publicationSeq, revision: state.revision, changed: true };
  }

  function accept(state, { instanceId, publicationSeq, structured, assets }) {
    const checked = state.spec.validate(structured);
    if (!checked.ok) return reject(state, 'invalid', checked.error);
    const meta = new Map(assets.map((a) => [a.assetId, a]));
    const mismatch = 'the asset list does not match the assets the content references';
    if (meta.size !== checked.refs.size) return reject(state, 'invalid', mismatch);
    let tokenBytes = 0;
    for (const [id, kind] of checked.refs) {
      const a = meta.get(id);
      if (!a || a.kind !== kind) return reject(state, 'invalid', mismatch);
      if (kind === 'token') tokenBytes += a.byteLength;
      const held = state.held.get(id);
      // Same id, same bytes: an already held asset must be described the same way.
      if (held && !sameMeta(held, a)) return reject(state, 'invalid', 'asset metadata differs from the held asset with that id');
    }
    if (tokenBytes > MAX_TOKEN_ART_BYTES) return reject(state, 'limit', 'token art over the per-publication limit');
    const missing = new Set([...checked.refs.keys()].filter((id) => !state.held.has(id)));
    state.pending = { instanceId, publicationSeq, content: checked.content, key: state.spec.key(checked.content), refs: checked.refs, meta, missing, verifying: new Set() };
    if (missing.size === 0) return commit(state);
    return { status: 'need', assetIds: [...missing] };
  }

  return {
    /**
     * An offer from the surface's active publisher (the boundary checked that). Returns
     *   { status: 'committed', publicationSeq, revision, changed }   nothing was missing
     *   { status: 'need', assetIds }                                 these ids are missing
     *   { status: 'rejected', reason }                               the committed one is unchanged
     * plus `superseded: { instanceId, publicationSeq }` when it replaced an unfinished pending offer.
     */
    offer(surface, offer) {
      const state = stateOf(surface);
      if (!state) return { status: 'rejected', reason: 'incompatible' };
      state.stats.offers += 1;
      // The latest saved state wins: a newer offer replaces an unfinished one, valid or not. Assets
      // that one already received stay held until the new offer has said whether it uses them.
      const old = state.pending;
      state.pending = null;
      const result = accept(state, offer);
      if (old) state.stats.superseded += 1;
      prune(state);
      return old ? { ...result, superseded: { instanceId: old.instanceId, publicationSeq: old.publicationSeq } } : result;
    },

    /**
     * Asset bytes for a pending publication. Resolves to
     *   { status: 'ignored', why }                                   not for the pending publication
     *   { status: 'waiting' }                                        accepted, more assets missing
     *   { status: 'committed', publicationSeq, revision, changed }   that was the last one
     *   { status: 'rejected', reason, publicationSeq }               the pending publication is dropped
     */
    async receiveAsset(surface, { instanceId, publicationSeq, assetId, meta, bytes }) {
      const state = stateOf(surface);
      const ignore = (why) => {
        if (state) state.stats.assetsIgnored += 1;
        return { status: 'ignored', why };
      };
      if (!state) return ignore('unknown surface');
      const p = state.pending;
      if (!p || p.instanceId !== instanceId || p.publicationSeq !== publicationSeq) return ignore('not the pending publication');
      if (!p.missing.has(assetId) || p.verifying.has(assetId)) return ignore('not requested, or already received');
      const fail = (error) => {
        state.pending = null;
        prune(state);
        return { ...reject(state, 'asset-invalid', error), publicationSeq };
      };
      const offered = p.meta.get(assetId);
      if (!sameMeta(offered, meta)) return fail('asset metadata differs from the offer');
      const view = new Uint8Array(bytes);
      if (view.length !== offered.byteLength || view.length > ASSET_LIMITS[offered.kind].maxBytes) return fail('asset byte length differs from the offer');
      if (!matchesMime(view, offered.mime)) return fail('asset bytes are not the claimed image type');
      p.verifying.add(assetId);
      let digest;
      try {
        digest = await sha256Hex(view, subtle);
      } catch {
        digest = null;
      }
      // While hashing, the pending publication may have been superseded, dropped or rejected.
      if (state.pending !== p) return ignore('superseded while verifying');
      p.verifying.delete(assetId);
      if (digest !== assetId) return fail('asset bytes do not hash to the asset id');
      state.held.set(assetId, Object.freeze({ assetId, kind: offered.kind, mime: offered.mime, width: offered.width, height: offered.height, byteLength: view.length, bytes: view }));
      p.missing.delete(assetId);
      state.stats.assetsReceived += 1;
      if (p.missing.size > 0) return { status: 'waiting' };
      return commit(state);
    },

    /** Drop the pending publication (its tab left or lost its role). The committed one stays. */
    dropPending(surface, instanceId) {
      const state = stateOf(surface);
      if (!state || !state.pending || (instanceId !== undefined && state.pending.instanceId !== instanceId)) return null;
      const dropped = { instanceId: state.pending.instanceId, publicationSeq: state.pending.publicationSeq };
      state.pending = null;
      state.stats.dropped += 1;
      prune(state);
      return dropped;
    },

    /** The committed player snapshot (the current wire format), or null. */
    snapshot(surface) {
      const state = stateOf(surface);
      return state && state.committed ? state.committed.wire : null;
    },

    /** A committed asset, for the asset sender. Pending assets are never served. */
    getAsset(surface, assetId) {
      const state = stateOf(surface);
      if (!state || !state.committed || !state.committed.refs.has(assetId)) return null;
      return state.held.get(assetId) || null;
    },
    hasAsset(surface, assetId) {
      return this.getAsset(surface, assetId) !== null;
    },

    pendingOf(surface) {
      const state = stateOf(surface);
      return state && state.pending ? { instanceId: state.pending.instanceId, publicationSeq: state.pending.publicationSeq, missing: state.pending.missing.size } : null;
    },

    /** Session end: everything goes, revisions included (a new session is a new room, new players). */
    clear() {
      for (const [surface, state] of states) {
        state.pending = null; // a hash still running for it must not commit into the discarded state
        states.set(surface, newState(state.spec));
      }
    },

    /** Counts, revisions and sizes only: no content, no asset ids. */
    diagnostics() {
      const out = {};
      for (const [surface, s] of states) {
        let heldBytes = 0;
        for (const a of s.held.values()) heldBytes += a.bytes.length;
        out[surface] = {
          committed: s.committed ? { revision: s.committed.revision, backgroundRevision: s.committed.backgroundRevision, assets: s.committed.refs.size } : null,
          pending: s.pending ? { publicationSeq: s.pending.publicationSeq, missing: s.pending.missing.size } : null,
          heldAssets: s.held.size,
          heldBytes,
          ...s.stats,
        };
      }
      return out;
    },
  };
}
