/**
 * Battle Map share assets (Live Share Milestone 3): the raster side of the share-state seam.
 *
 * Everything here runs on the Battle Map side of the seam (planning doc §5.4, §15). It reads the
 * canonical map image, fog bitmap, fog shapes and token image sources, and produces only
 * player-safe assets: encoded bytes plus a content-derived id. Networking never sees the inputs.
 *
 *   maskFogPixels(map, fog)       pure: every pixel the fog touches (alpha > 0) becomes opaque fog
 *                                 color, so nothing of the map under it survives, not even at
 *                                 soft edges.
 *   composePlayerBackground(...)  the player-visible background: the map, then the fog exactly as
 *                                 the DM's map draws it (painted bitmap, cover shapes, then reveal
 *                                 shapes cutting through both), masked opaque, in map image space.
 *                                 Scaled down if the map is larger than the Milestone 3 limits.
 *   classifyTokenImage(src)       which token images are custom art worth transferring
 *   createShareAssets(...)        prepares the background and token assets for given inputs and
 *                                 serves them by id: flush() builds for the current inputs, the
 *                                 background revision, retain() for the published state, getAsset(id).
 *
 * 2.3.27 publication path: the Battle Map's inputs are the last SAVED state
 * (battle-map-publication.js), so the only production entry is flush(), called by the publisher when
 * a save is published; the publisher then commits and calls retain() with the asset ids that
 * published state references. check() and its debounce (DEBOUNCE_MS, MAX_WAIT_MS) date from when the
 * inputs were the live working state; nothing in production calls check() any more.
 *
 * Classic script like battle-map-share-state.js: publishes globalThis.BattleMapShareAssets. No DOM
 * access: canvases, image loading and Web Crypto are passed in.
 */
(function (root) {
  'use strict';
  if (root.BattleMapShareAssets) return;

  // Milestone 3 limits (planning doc §15.2, §30). 16.7 M pixels is the canvas area iOS Safari
  // allows, 8192 px per side stays inside every browser's canvas limits; larger maps are composed
  // at a reduced scale (the player still places them at the map's full size). Byte limits keep a
  // transfer to at most 1024 chunks of 16 KiB.
  const LIMITS = Object.freeze({
    backgroundMaxDimension: 8192,
    backgroundMaxPixels: 4096 * 4096,
    backgroundMaxBytes: 16 * 1024 * 1024,
    tokenMaxDimension: 512,
    tokenMaxBytes: 1024 * 1024,
  });
  // From the Milestone 3 benchmark (scripts/bench-live-share-background.mjs): lossy WebP at this
  // quality is 16-30x smaller than PNG for painted maps at 0.2-0.4 s per 6 MP. PNG is the fallback
  // where the browser cannot encode WebP (toBlob then returns PNG).
  const WEBP_QUALITY = 0.85;
  const DEBOUNCE_MS = 250; // after the last background change
  // flush() also waits for custom token art being prepared, but no longer than this: art that is
  // slow to load (another site) must not hold back a save's publication; it follows when ready.
  const TOKEN_WAIT_MS = 3000;
  const MAX_WAIT_MS = 1000; // at most this long during continuous changes

  const ASSET_ID = /^[0-9a-f]{64}$/;

  /** In place on `map` (RGBA bytes): wherever `fog` has any alpha, the pixel becomes opaque fog. */
  function maskFogPixels(map, fog) {
    for (let i = 0; i < map.length; i += 4) {
      if (fog[i + 3] > 0) {
        map[i] = fog[i];
        map[i + 1] = fog[i + 1];
        map[i + 2] = fog[i + 2];
        map[i + 3] = 255;
      }
    }
    return map;
  }

  function drawShape(g, shape) {
    if (shape.type === 'rect') {
      g.save();
      g.translate(shape.x + shape.w / 2, shape.y + shape.h / 2);
      g.rotate(shape.rot || 0);
      g.fillRect(-shape.w / 2, -shape.h / 2, shape.w, shape.h);
      g.restore();
    } else if (shape.type === 'circle') {
      g.beginPath();
      g.arc(shape.x + shape.r, shape.y + shape.r, shape.r, 0, Math.PI * 2);
      g.fill();
    }
  }

  /** The scale (<= 1) at which a map of this size is composed within the limits. */
  function backgroundScale(width, height) {
    const byDim = LIMITS.backgroundMaxDimension / Math.max(width, height);
    const byArea = Math.sqrt(LIMITS.backgroundMaxPixels / (width * height));
    return Math.min(1, byDim, byArea);
  }

  /**
   * The player-visible background as a canvas, in map image space (scaled by `scale`, <= 1).
   * Mirrors battlemap.html renderFogLayer()/drawFogShapes(): fog shows only when fog is enabled.
   * Throws if the map cannot be read back (a cross-origin image taints the canvas).
   */
  function composePlayerBackground({ mapImage, mapWidth, mapHeight, fogEnabled, fogCanvas, fogShapes, createCanvas, scale = backgroundScale(mapWidth, mapHeight) }) {
    const w = Math.max(1, Math.floor(mapWidth * scale)); // floor: never past the pixel limit
    const h = Math.max(1, Math.floor(mapHeight * scale));
    const out = createCanvas(w, h);
    const g = out.getContext('2d');
    g.drawImage(mapImage, 0, 0, w, h);
    if (fogEnabled && fogCanvas && fogCanvas.width > 1 && fogCanvas.height > 1) {
      const fog = createCanvas(w, h);
      const f = fog.getContext('2d');
      f.drawImage(fogCanvas, 0, 0, w, h);
      f.save();
      f.scale(scale, scale);
      for (const shape of fogShapes || []) {
        if (shape.mode !== 'cover') continue;
        f.fillStyle = typeof shape.color === 'string' ? shape.color : '#000000';
        drawShape(f, shape);
      }
      f.globalCompositeOperation = 'destination-out';
      f.fillStyle = '#000000';
      for (const shape of fogShapes || []) if (shape.mode === 'reveal') drawShape(f, shape);
      f.restore();
      const pixels = g.getImageData(0, 0, w, h);
      maskFogPixels(pixels.data, f.getImageData(0, 0, w, h).data);
      g.putImageData(pixels, 0, 0);
    } else {
      g.getImageData(0, 0, 1, 1); // the same readability check as the fog path
    }
    return { canvas: out, width: w, height: h };
  }

  async function encodeCanvas(canvas, preferWebp = true) {
    const blob = await new Promise((resolve, reject) => {
      const done = (b) => (b ? resolve(b) : reject(new Error('encoding failed')));
      if (typeof canvas.convertToBlob === 'function') {
        canvas.convertToBlob(preferWebp ? { type: 'image/webp', quality: WEBP_QUALITY } : { type: 'image/png' }).then(done, reject);
      } else if (preferWebp) canvas.toBlob(done, 'image/webp', WEBP_QUALITY);
      else canvas.toBlob(done, 'image/png');
    });
    // A browser that cannot encode WebP returns PNG instead.
    const mime = blob.type === 'image/webp' ? 'image/webp' : 'image/png';
    return { mime, bytes: new Uint8Array(await blob.arrayBuffer()) };
  }

  async function sha256Hex(bytes, subtle) {
    const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
    let hex = '';
    for (const b of digest) hex += b.toString(16).padStart(2, '0');
    return hex;
  }

  /**
   * Which token images are custom art (planning doc §15.3):
   *   'inline'    a data: or blob: image: user uploads and Character Manager tokens (both are data
   *               URLs in battlemap.html), and their duplicates. Readable by the host; transferred.
   *   'generic'   a same-origin URL: the built-in preset tokens (/images/...), which need no
   *               transfer. Players keep the structured marker.
   *   'external'  another origin: transferred only if the host can read it (CORS); else a marker.
   *   'none'      no usable source.
   */
  function classifyTokenImage(src, pageOrigin) {
    if (typeof src !== 'string' || !src) return 'none';
    if (/^data:image\//i.test(src) || /^blob:/i.test(src)) return 'inline';
    let url;
    try {
      url = new URL(src, pageOrigin);
    } catch {
      return 'none';
    }
    if (url.origin === pageOrigin) return 'generic';
    if (url.protocol === 'https:' || url.protocol === 'http:') return 'external';
    return 'none';
  }

  /**
   * Keeps the player-visible assets current.
   *   getInputs()   { map: {image, width, height}, fogEnabled, fogCanvas, fogShapes, fogVersion,
 *                   fogReady (false while a saved fog bitmap is still decoding), tokens }
   *   onChange()    the background reference or a token asset id changed (the seam should re-check)
   *   loadImage(src, { crossOrigin })  -> Promise<image>
   * flush() builds for the current inputs at once and resolves when that background (or its
   * failure) is in: the Battle Map's publisher calls it when a save is published, then retain()s
   * what it committed. Assets are released only when neither current nor retained, so the published
   * state's background and art stay retrievable while a newer save is being prepared.
   * check() compares a small key of the background inputs (map image identity and size, fog
   * enabled, fog bitmap version, fog shapes), never pixels, and rebuilds after a debounce; it is
   * cheap enough to call every frame, but since 2.3.27 the Battle Map does not call it.
   */
  function createShareAssets({
    getInputs,
    onChange = () => {},
    createCanvas,
    loadImage,
    subtle,
    pageOrigin,
    now = () => Date.now(),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (t) => clearTimeout(t),
    debounceMs = DEBOUNCE_MS,
    maxWaitMs = MAX_WAIT_MS,
    onError = () => {},
  }) {
    const imageIds = new WeakMap();
    let nextImageId = 1;
    const imageId = (img) => {
      if (!img) return 0;
      if (!imageIds.has(img)) imageIds.set(img, nextImageId++);
      return imageIds.get(img);
    };

    const assets = new Map(); // assetId -> { assetId, kind, mime, width, height, bytes }
    // Asset ids the published (committed) state references. Preparing a newer save never removes
    // them: they stay retrievable until that save is published and retain() moves on.
    let retained = new Set();
    let background = null; // { assetId, revision }
    let backgroundRevision = 0;
    let appliedKey = null; // key of the published background
    let scheduledKey = null; // key a scheduled build is waiting to compose
    let dirtySince = null;
    let timer = null;
    let building = false;
    const bg = { status: 'none', reason: null, encodeMs: null, bytes: null, mime: null, width: null, height: null, rebuilds: 0, discardedStale: 0 };

    const flushWaiters = []; // flush() calls waiting for the background of the current inputs
    const settleFlushes = () => flushWaiters.splice(0).forEach((resolve) => resolve());

    const tokenSources = new Map(); // imgSrc -> { status: 'pending'|'ready'|'none'|'failed', assetId }
    let tokenQueue = Promise.resolve();
    const tokenStats = { prepared: 0, generic: 0, unreadable: 0, failed: 0 };

    function backgroundKey(input) {
      const map = input.map || {};
      if (!map.image || !(map.width > 0) || !(map.height > 0)) return 'none';
      // A saved fog bitmap still decoding: the fog is not yet what the DM saved, so nothing is shown.
      if (input.fogEnabled && input.fogReady === false) return 'fog-loading';
      const shapes = input.fogEnabled
        ? JSON.stringify((input.fogShapes || []).map((s) => [s.type, s.mode, s.x, s.y, s.w, s.h, s.r, s.rot || 0, s.mode === 'cover' ? s.color : 0]))
        : '';
      return [imageId(map.image), map.width, map.height, input.fogEnabled ? 1 : 0, input.fogEnabled ? input.fogVersion : 0, shapes].join('|');
    }

    function scheduleBuild() {
      if (timer !== null) clearTimer(timer);
      const t = now();
      if (dirtySince === null) dirtySince = t;
      const wait = Math.max(0, Math.min(debounceMs, dirtySince + maxWaitMs - t));
      timer = setTimer(build, wait);
    }

    // Drops every asset that is neither current (the background and token art being prepared) nor
    // retained by the published state.
    function prune() {
      const keep = new Set(retained);
      if (background) keep.add(background.assetId);
      tokenSources.forEach((e) => e.assetId && keep.add(e.assetId));
      assets.forEach((a, id) => !keep.has(id) && assets.delete(id));
    }

    function setBackground(next) {
      const changed = (background && background.assetId) !== (next && next.assetId);
      background = next;
      if (changed) onChange();
    }

    async function build() {
      timer = null;
      if (building) return; // the running build re-checks when it finishes
      building = true;
      dirtySince = null;
      let input;
      try {
        input = getInputs();
      } catch (err) {
        building = false;
        onError(err);
        settleFlushes();
        return;
      }
      const key = backgroundKey(input);
      scheduledKey = null;
      try {
        if (key === 'none' || key === 'fog-loading') {
          Object.assign(bg, { status: key === 'none' ? 'none' : 'waiting-for-fog', reason: null, bytes: null, mime: null, width: null, height: null });
          appliedKey = key;
          setBackground(null);
          prune();
          return;
        }
        bg.status = 'encoding';
        const started = now();
        const { map } = input;
        // Compose synchronously (the pixels of this moment), then encode; retry smaller if too big.
        let scale = backgroundScale(map.width, map.height);
        let result = null;
        for (let attempt = 0; attempt < 4 && !result; attempt++) {
          const { canvas, width, height } = composePlayerBackground({ mapImage: map.image, mapWidth: map.width, mapHeight: map.height, fogEnabled: input.fogEnabled, fogCanvas: input.fogCanvas, fogShapes: input.fogShapes, createCanvas, scale });
          const encoded = await encodeCanvas(canvas, true);
          if (encoded.bytes.length <= LIMITS.backgroundMaxBytes) result = { ...encoded, width, height };
          else scale *= 0.7;
        }
        if (!result) throw Object.assign(new Error('background too large to send'), { reason: 'too-large' });
        const assetId = await sha256Hex(result.bytes, subtle);
        bg.rebuilds += 1;
        // Publish only a background of the current state: if anything changed while encoding,
        // drop this one and build again, so no pixel the DM has just covered is sent.
        const current = backgroundKey(getInputs());
        if (current !== key) {
          bg.discardedStale += 1;
          return;
        }
        Object.assign(bg, { status: 'ready', reason: null, encodeMs: now() - started, bytes: result.bytes.length, mime: result.mime, width: result.width, height: result.height });
        appliedKey = key;
        if (background && background.assetId === assetId) return;
        assets.set(assetId, { assetId, kind: 'background', mime: result.mime, width: result.width, height: result.height, bytes: result.bytes });
        backgroundRevision += 1;
        setBackground({ assetId, revision: backgroundRevision });
        prune();
      } catch (err) {
        // No stale background may stand in for the current fog: players fall back to the placeholder.
        Object.assign(bg, { status: 'failed', reason: err && err.reason ? err.reason : 'unreadable', bytes: null, mime: null, width: null, height: null });
        appliedKey = key;
        setBackground(null);
        prune();
        onError(err);
      } finally {
        building = false;
        if (flushWaiters.length) {
          // A flush is waiting: build again at once if the inputs moved on, else it is done.
          let current = appliedKey;
          try {
            current = backgroundKey(getInputs());
          } catch {}
          if (current !== appliedKey) build();
          else settleFlushes();
        } else {
          // Changes made while this build ran.
          check();
        }
      }
    }

    /**
     * Build the background for the current inputs now; resolves once it is published or failed and
     * the token art those inputs need is prepared (or TOKEN_WAIT_MS has passed).
     */
    function flush() {
      const background = new Promise((resolve) => {
        flushWaiters.push(resolve);
        let input;
        try {
          input = getInputs();
          checkTokens(input.tokens);
        } catch (err) {
          onError(err);
          settleFlushes();
          return;
        }
        if (timer !== null) {
          clearTimer(timer);
          timer = null;
          dirtySince = null;
          scheduledKey = null;
        }
        if (building) return; // the running build finishes the flush
        if (backgroundKey(input) === appliedKey) settleFlushes();
        else build();
      });
      const tokens = tokenQueue; // includes whatever checkTokens() just queued
      return background.then(() => Promise.race([tokens, new Promise((resolve) => setTimer(resolve, TOKEN_WAIT_MS))]));
    }

    function prepareToken(src, kind) {
      const entry = { status: 'pending', assetId: null };
      tokenSources.set(src, entry);
      tokenQueue = tokenQueue.then(async () => {
        if (tokenSources.get(src) !== entry) return; // no longer used
        try {
          const img = await loadImage(src, kind === 'external' ? { crossOrigin: 'anonymous' } : {});
          const iw = img.naturalWidth || img.width;
          const ih = img.naturalHeight || img.height;
          if (!(iw > 0 && ih > 0)) throw new Error('empty image');
          const s = Math.min(1, LIMITS.tokenMaxDimension / Math.max(iw, ih));
          const canvas = createCanvas(Math.max(1, Math.round(iw * s)), Math.max(1, Math.round(ih * s)));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          // Re-encoding (rather than forwarding the source bytes) also drops metadata such as EXIF.
          const encoded = await encodeCanvas(canvas, true); // throws for a tainted (unreadable) image
          if (encoded.bytes.length > LIMITS.tokenMaxBytes) throw new Error('token image too large');
          const assetId = await sha256Hex(encoded.bytes, subtle);
          if (tokenSources.get(src) !== entry) return;
          if (!assets.has(assetId)) assets.set(assetId, { assetId, kind: 'token', mime: encoded.mime, width: canvas.width, height: canvas.height, bytes: encoded.bytes });
          entry.status = 'ready';
          entry.assetId = assetId;
          tokenStats.prepared += 1;
          onChange();
        } catch (err) {
          entry.status = 'failed';
          if (kind === 'external') tokenStats.unreadable += 1;
          else tokenStats.failed += 1;
        }
      });
    }

    function checkTokens(tokens) {
      const used = new Set();
      for (const t of tokens || []) {
        const src = t && t.imgSrc;
        if (typeof src !== 'string' || !src) continue;
        used.add(src);
        if (tokenSources.has(src)) continue;
        const kind = classifyTokenImage(src, pageOrigin);
        if (kind === 'inline' || kind === 'external') prepareToken(src, kind);
        else {
          tokenSources.set(src, { status: 'none', assetId: null });
          tokenStats.generic += 1;
        }
      }
      let removed = false;
      for (const src of [...tokenSources.keys()]) {
        if (!used.has(src)) {
          tokenSources.delete(src);
          removed = true;
        }
      }
      if (removed) prune();
    }

    function check() {
      let input;
      try {
        input = getInputs();
        checkTokens(input.tokens);
      } catch (err) {
        onError(err);
        return;
      }
      if (building) return; // the running build checks again when it finishes
      const key = backgroundKey(input);
      if (key === appliedKey) {
        if (timer !== null) {
          clearTimer(timer); // changed and changed back
          timer = null;
          dirtySince = null;
          scheduledKey = null;
        }
        return;
      }
      if (timer !== null && key === scheduledKey) return;
      scheduledKey = key;
      scheduleBuild();
    }

    function getAsset(assetId) {
      const a = typeof assetId === 'string' && ASSET_ID.test(assetId) ? assets.get(assetId) : null;
      return a ? { assetId: a.assetId, kind: a.kind, mime: a.mime, width: a.width, height: a.height, bytes: a.bytes.slice() } : null;
    }

    // An asset's metadata without copying its bytes (Live Share 5A.4: what an offer lists).
    function assetMeta(assetId) {
      const a = typeof assetId === 'string' && ASSET_ID.test(assetId) ? assets.get(assetId) : null;
      return a ? { assetId: a.assetId, kind: a.kind, mime: a.mime, width: a.width, height: a.height, byteLength: a.bytes.length } : null;
    }

    return {
      check,
      flush,
      getAsset,
      assetMeta,
      hasAsset: (assetId) => assets.has(assetId),
      /** The published state now references exactly these asset ids; others may be released. */
      retain(ids) {
        retained = new Set((ids || []).filter(Boolean));
        prune();
      },
      /** For the projection: the current background reference, or null. */
      background: () => (background ? { ...background } : null),
      /** For the projection: the asset id for this token's image, or null. */
      tokenAssetId: (token) => {
        const e = token && typeof token.imgSrc === 'string' ? tokenSources.get(token.imgSrc) : null;
        return e && e.status === 'ready' ? e.assetId : null;
      },
      diagnostics: () => ({
        background: { revision: background ? background.revision : null, assetId: background ? background.assetId.slice(0, 12) : null, ...bg },
        tokens: { ...tokenStats, sources: tokenSources.size, assets: [...assets.values()].filter((a) => a.kind === 'token').length },
      }),
    };
  }

  root.BattleMapShareAssets = Object.freeze({ LIMITS, WEBP_QUALITY, maskFogPixels, backgroundScale, composePlayerBackground, encodeCanvas, sha256Hex, classifyTokenImage, createShareAssets });
})(globalThis);
