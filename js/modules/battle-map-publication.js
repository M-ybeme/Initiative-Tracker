/**
 * Battle Map publication (2.3.27): what Live Share players see is the last successfully SAVED Battle
 * Map, never the DM's unsaved working state.
 *
 * This policy belongs to the Battle Map alone. The Battle Map has an explicit persisted editing
 * workflow (Save button, Ctrl+S), so it is a private staging area until the DM saves. Live Share
 * itself is not save-gated: the generic modules (js/modules/live-share/*) simply send whatever a
 * surface says its player-safe state is, whenever it says that state changed. A surface without
 * save semantics, such as the planned Initiative Tracker integration, publishes its player-safe
 * state as soon as its authoritative state changes. Do not move this gate into the generic modules.
 *
 *   captureStructured(state, measurements)
 *                     a detached copy of the canonical fields the player-safe projection reads,
 *                     taken at save time, so later edits can't reach what has been published
 *   createPublisher({ assets, onPublished })
 *     publish({ structured, backgroundInputs })
 *                     called only after the Battle Map was persisted successfully. The background is
 *                     built for exactly these inputs first; then the structured state and the
 *                     finished background reference are committed together, so players never get a
 *                     new structured snapshot paired with a mismatched background. A newer publish
 *                     supersedes an unfinished older one (latest saved state wins).
 *     backgroundInputs()   what the asset preparer composes: the last saved inputs, never the draft
 *     source()             the seam's source: the committed (published) state, or null
 *     refresh()            custom token art of the published state became ready: pick it up (only
 *                          while no newer publish is pending, so a half-switched state never shows)
 *     hasPublished()       whether any saved state has been published yet
 *
 * The published state's token art ids are recorded when it is committed, not looked up live: the
 * asset preparer switches to a new save's tokens as soon as that save starts, and the state still
 * published must not change (lose or gain art) before the new one is committed.
 *
 * Classic script (like battle-map-share-state.js): publishes globalThis.BattleMapPublication.
 */
(function (root) {
  'use strict';
  if (root.BattleMapPublication) return;

  const copyConditions = (c) => (Array.isArray(c) ? c.slice() : c);

  /** A detached copy of what the projection reads (plus imgSrc for custom-art lookup, never sent). */
  function captureStructured(state, persistentMeasurements) {
    const map = state.map || {};
    return {
      state: {
        map: { w: map.w, h: map.h },
        mapTransform: { ...(state.mapTransform || {}) },
        grid: { ...(state.grid || {}) },
        tokens: (state.tokens || []).filter(Boolean).map((t) => ({
          id: t.id,
          name: t.name,
          showLabel: t.showLabel,
          visibleToPlayers: t.visibleToPlayers,
          x: t.x,
          y: t.y,
          w: t.w,
          h: t.h,
          rot: t.rot,
          statusConditions: copyConditions(t.statusConditions),
          imgSrc: t.imgSrc,
        })),
      },
      persistentMeasurements: (persistentMeasurements || []).filter(Boolean).map((m) => ({ id: m.id, type: m.type, x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2, color: m.color })),
    };
  }

  function createPublisher({ assets = null, onPublished = () => {} } = {}) {
    let committed = null; // { structured, background, tokenArt: Map(imgSrc -> assetId|null) }
    let pendingInputs = null; // background inputs of the newest publish
    let seq = 0;
    let committedSeq = 0;

    const tokenArt = (structured) => {
      const art = new Map();
      for (const t of structured.state.tokens) {
        if (t.visibleToPlayers !== false && !art.has(t.imgSrc)) art.set(t.imgSrc, assets ? assets.tokenAssetId(t) : null);
      }
      return art;
    };

    async function publish({ structured, backgroundInputs }) {
      const mine = ++seq;
      pendingInputs = backgroundInputs || null;
      if (assets) {
        try {
          await assets.flush();
        } catch {
          // A failed build publishes no background (the asset preparer never keeps a stale one).
        }
      }
      if (mine !== seq) return false; // a newer save took over
      commit({ structured, background: assets ? assets.background() : null, tokenArt: tokenArt(structured) });
      committedSeq = mine;
      onPublished();
      return true;
    }

    // The assets the published state references stay retrievable until the next commit.
    function commit(next) {
      committed = next;
      if (assets) assets.retain([committed.background && committed.background.assetId, ...committed.tokenArt.values()]);
    }

    function refresh() {
      if (!committed || committedSeq !== seq) return; // a newer publish is on its way
      commit({ ...committed, tokenArt: tokenArt(committed.structured) });
      onPublished();
    }

    return {
      publish,
      backgroundInputs: () => pendingInputs,
      source() {
        if (!committed) return null;
        const { background, tokenArt: art } = committed;
        return {
          ...committed.structured,
          assets: {
            background: () => background,
            tokenAssetId: (t) => art.get(t.imgSrc) || null,
          },
        };
      },
      refresh,
      hasPublished: () => committed !== null,
    };
  }

  root.BattleMapPublication = Object.freeze({ captureStructured, createPublisher });
})(globalThis);
