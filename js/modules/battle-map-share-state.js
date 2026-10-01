/**
 * Battle Map share-state seam (Live Share Milestone 1).
 *
 * The one boundary between the Battle Map's internal state and anything that shares it with
 * players (planning doc §5.4, §6, §13.1). It has two parts:
 *
 *   projectPlayerSafeState(source)  a pure, allowlist-only projection of the Battle Map state into
 *                                   what players may see. Every field is copied explicitly and
 *                                   coerced to a primitive, so a field added to the Battle Map later
 *                                   never reaches players unless it is added here on purpose.
 *   createShareStateSeam({ getSource })
 *                                   a change detector over that projection: check() recomputes it,
 *                                   and only when the player-visible content differs from the last
 *                                   one does it increase `revision` and notify onChange listeners.
 *                                   Editor-only changes (selection, drag, pan/zoom, HP, fog, ...)
 *                                   project to the same content, so they never bump the revision.
 *
 * It is read-only with respect to the Battle Map (it never writes to the state it reads), knows
 * nothing about networking, and has no DOM access.
 *
 * Runtime constraint: battlemap.html is a classic script, so this file is a classic script that
 * publishes `globalThis.BattleMapShareState` (like dice-engine.js). Tests import it for that side
 * effect. If it is loaded twice the first instance wins.
 */
(function (root) {
  'use strict';
  if (root.BattleMapShareState) return;

  const SCHEMA = 'dmtoolbox.battlemap.player-safe';
  // 2: Milestone 3 added `background` and token `assetId` (references to player-safe assets).
  const VERSION = 2;

  // Milestone 1 limits, so a malformed or huge Battle Map can't produce an unbounded snapshot.
  const MAX_TOKENS = 500;
  const MAX_MEASUREMENTS = 500;
  const MAX_CONDITIONS = 32;
  const MAX_TEXT = 200;
  const MEASUREMENT_TYPES = new Set(['line', 'cone', 'circle']);

  const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const text = (v) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : null);
  const color = (v, fallback) => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : fallback);
  const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 100;
  // A content-derived asset id (SHA-256 of the encoded bytes, battle-map-share-assets.js).
  const assetId = (v) => (typeof v === 'string' && /^[0-9a-f]{64}$/.test(v) ? v : null);

  // Milestone 3: only references. The asset bytes are prepared on this side of the seam and fetched
  // by id; the map image, fog and token image sources never enter the snapshot.
  function projectBackground(bg) {
    if (!bg || !assetId(bg.assetId) || !Number.isSafeInteger(bg.revision) || bg.revision < 1) return null;
    return { assetId: bg.assetId, revision: bg.revision };
  }

  function projectToken(t, tokenAssetId) {
    // Name only where the DM shows the token's label (§13.1); HP, max HP, image, aura, vision
    // cone, selection and anything else on the token are not player-safe in Milestone 1.
    const name = t.showLabel && typeof t.name === 'string' && t.name.trim() ? text(t.name) : null;
    const conditions = Array.isArray(t.statusConditions)
      ? t.statusConditions.filter((c) => typeof c === 'string' && c.length > 0).slice(0, MAX_CONDITIONS).map(text)
      : [];
    return {
      id: t.id,
      x: num(t.x),
      y: num(t.y),
      w: num(t.w),
      h: num(t.h),
      rot: num(t.rot),
      name,
      conditions,
      assetId: assetId(tokenAssetId(t)),
    };
  }

  function projectMeasurement(m) {
    return {
      id: m.id,
      type: m.type,
      x1: num(m.x1),
      y1: num(m.y1),
      x2: num(m.x2),
      y2: num(m.y2),
      color: color(m.color, '#8bd3ff'),
    };
  }

  /**
   * The player-safe content of the Battle Map, without a revision. `source` is
   * `{ state, persistentMeasurements, assets }` from battlemap.html, where `assets` (Milestone 3,
   * optional) is `{ background(), tokenAssetId(token) }` from BattleMapShareAssets. Returns a new
   * object every call.
   */
  function projectPlayerSafeState(source) {
    const state = (source && source.state) || {};
    const map = state.map || {};
    const mapTransform = state.mapTransform || {};
    const grid = state.grid || {};
    const tokens = Array.isArray(state.tokens) ? state.tokens : [];
    const measurements = Array.isArray(source && source.persistentMeasurements) ? source.persistentMeasurements : [];
    const assets = (source && source.assets) || {};
    const tokenAssetId = typeof assets.tokenAssetId === 'function' ? assets.tokenAssetId : () => null;

    return {
      schema: SCHEMA,
      version: VERSION,
      // The map image's natural size (image space), not the image itself: map assets arrive in Milestone 3.
      map: { width: num(map.w), height: num(map.h) },
      // The player-visible background (map with fog baked in), by reference; null without a map.
      background: projectBackground(typeof assets.background === 'function' ? assets.background() : null),
      // Image space -> world space. The DM's own pan/zoom (state.view) is theirs alone.
      mapTransform: { scale: num(mapTransform.scale, 1), x: num(mapTransform.x), y: num(mapTransform.y) },
      grid: {
        size: num(grid.size, 50),
        unitsPerCell: num(grid.unitsPerCell, 5),
        color: color(grid.color, '#6aa5ff'),
        alpha: num(grid.alpha, 0.35),
        show: grid.show !== false,
        offsetX: num(grid.offsetX),
        offsetY: num(grid.offsetY),
      },
      // A token the DM hid from players (visibleToPlayers === false, 2.3.27) is left out entirely:
      // not sent as hidden, simply absent, so nothing about it (id, position, name, art) crosses.
      // Missing means visible, so maps saved before the setting existed are unchanged.
      tokens: tokens
        .filter((t) => t && isId(t.id) && t.visibleToPlayers !== false)
        .slice(0, MAX_TOKENS)
        .map((t) => projectToken(t, tokenAssetId)),
      measurements: measurements
        .filter((m) => m && isId(m.id) && MEASUREMENT_TYPES.has(m.type))
        .slice(0, MAX_MEASUREMENTS)
        .map(projectMeasurement),
    };
  }

  /**
   * The change detector. `getSource()` returns the live `{ state, persistentMeasurements }`.
   *   check()            recompute; if the player-visible content changed, revision += 1 and
   *                      listeners get { revision }. Returns whether it changed. Never throws.
   *   schedule()         check() once, in a microtask, however many times it is called before then.
   *                      Unused by the Battle Map since 2.3.27: its source is the published (saved)
   *                      state, which changes only on publish, and the publisher calls check() then.
   *   getPlayerSafeState()  a fresh snapshot { ...content, revision } after an up-to-date check()
   *   onChange(fn)       subscribe; returns an unsubscribe function
   *   revision           the current revision (0 until the first check)
   */
  function createShareStateSeam({ getSource, onError = () => {} }) {
    let revision = 0;
    let lastKey = null;
    let scheduled = false;
    const listeners = new Set();

    function check() {
      let key;
      try {
        key = JSON.stringify(projectPlayerSafeState(getSource()));
      } catch (err) {
        onError(err);
        return false;
      }
      if (key === lastKey) return false;
      lastKey = key;
      revision += 1;
      for (const fn of [...listeners]) {
        try {
          fn({ revision });
        } catch (err) {
          onError(err);
        }
      }
      return true;
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(() => {
        scheduled = false;
        check();
      });
    }

    function getPlayerSafeState() {
      check();
      return { ...JSON.parse(lastKey), revision };
    }

    function onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    return {
      check,
      schedule,
      getPlayerSafeState,
      onChange,
      get revision() {
        return revision;
      },
    };
  }

  root.BattleMapShareState = Object.freeze({ SCHEMA, VERSION, projectPlayerSafeState, createShareStateSeam });
})(globalThis);
