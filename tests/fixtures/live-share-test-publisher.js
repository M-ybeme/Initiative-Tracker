// TEST ONLY (Live Share Milestone 5A.3): a stand-in Battle Map surface for the session host boundary
// browser specs (tests/e2e/live-share-surface-boundary.spec.js). Not the Battle Map: the real Battle
// Map keeps its prototype host until 5A.4.
//
// It uses the real production boundary client (surface-publisher.js), the real Battle Map projection
// (BattleMapShareState.projectPlayerSafeState) and real PNG bytes from a canvas, so what crosses the
// BroadcastChannel is what a Battle Map would send. The specs drive it through window.testPublisher.
// Malformed or stale messages for negative tests are posted with raw(), deliberately by hand.
import { createSurfacePublisher } from '/js/modules/live-share/surface-publisher.js';
import { fromProjection, BATTLE_MAP_SURFACE, BATTLE_MAP_SURFACE_VERSION } from '/js/modules/live-share/battlemap-publication.js';
import { sha256Hex } from '/js/modules/live-share/asset-protocol.js';

if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  const assets = new Map(); // assetId -> { meta, bytes }
  let current = null; // { structured, assets: [meta] }
  let publisher = null;

  async function pngAsset(kind, { width, height, color = '#335577', noise = false, nearBytes = 0 }) {
    let w = width;
    let h = height;
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = canvas.getContext('2d');
      if (noise) {
        // Incompressible noise, for a background as close to the 16 MiB limit as the encoder allows.
        const img = g.createImageData(w, h);
        for (let i = 0; i < img.data.length; i += 65536) crypto.getRandomValues(img.data.subarray(i, Math.min(img.data.length, i + 65536)));
        for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
        g.putImageData(img, 0, 0);
      } else {
        g.fillStyle = color;
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffffff';
        g.fillRect(w / 4, h / 4, w / 2, h / 2);
      }
      const bytes = new Uint8Array(await (await new Promise((r) => canvas.toBlob(r, 'image/png'))).arrayBuffer());
      if (!nearBytes || (bytes.length <= nearBytes && bytes.length >= nearBytes * 0.9)) {
        const assetId = await sha256Hex(bytes);
        const meta = { assetId, kind, mime: 'image/png', width: w, height: h, byteLength: bytes.length };
        assets.set(assetId, { meta, bytes });
        return meta;
      }
      const scale = Math.sqrt((nearBytes * 0.97) / bytes.length);
      w = Math.floor(w * scale);
      h = Math.floor(h * scale);
    }
    throw new Error('could not size the PNG');
  }

  window.testPublisher = {
    start({ surfaceVersion = BATTLE_MAP_SURFACE_VERSION } = {}) {
      publisher = createSurfacePublisher({
        surface: BATTLE_MAP_SURFACE,
        surfaceVersion,
        getPublication: () => current,
        getAsset: (id) => assets.get(id) || null,
      });
      publisher.start();
      return publisher.status().instanceId;
    },
    background: (options) => pngAsset('background', options),
    tokenArt: (options) => pngAsset('token', options),
    /** Battle Map content (the real projection) referencing the given background and token art. */
    set({ background = null, tokens = [], measurements = [] }) {
      // A token's `art` is a token asset id; on the Battle Map that comes from its image source.
      const art = {};
      for (const t of tokens) if (t.art) art[`art:${t.art}`] = t.art;
      tokens = tokens.map(({ art: id, ...t }) => (id ? { ...t, imgSrc: `art:${id}` } : t));
      const bg = background ? assets.get(background).meta : null;
      const projected = globalThis.BattleMapShareState.projectPlayerSafeState({
        state: {
          map: { w: bg ? bg.width : 1400, h: bg ? bg.height : 900 },
          mapTransform: { scale: 1, x: 0, y: 0 },
          grid: { size: 70, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
          tokens,
        },
        persistentMeasurements: measurements,
        assets: { background: () => (bg ? { assetId: bg.assetId, revision: 1 } : null), tokenAssetId: (t) => art[t.imgSrc] || null },
      });
      const structured = fromProjection(projected);
      const ids = [structured.background && structured.background.assetId, ...structured.tokens.map((t) => t.assetId)].filter(Boolean);
      current = { structured, assets: [...new Set(ids)].map((id) => assets.get(id).meta) };
    },
    forgetAsset: (id) => assets.delete(id),
    current: () => current,
    publish: () => publisher.publish(),
    claim: () => publisher.claim(),
    close: () => publisher.close(),
    status: () => publisher.status(),
    /** A hand-made message (negative tests). */
    raw(channelName, msg) {
      const ch = new BroadcastChannel(channelName);
      ch.postMessage(msg);
      ch.close();
    },
    rawAsset(channelName, msg, assetId) {
      const ch = new BroadcastChannel(channelName);
      ch.postMessage({ ...msg, bytes: assets.get(assetId).bytes.slice().buffer });
      ch.close();
    },
  };
  document.getElementById('status').textContent = 'Test publisher ready';
}
