// Helpers for the Live Share 5A.3 surface boundary unit tests: realistic Battle Map publications made
// with the real projection, asset bytes whose ids really are their SHA-256, and an in-memory
// BroadcastChannel that copies every message (structuredClone) and delivers it asynchronously, as
// browsers do.
import '../../js/modules/battle-map-token-presets.js';
import '../../js/modules/battle-map-share-state.js';
import { fromProjection } from '../../js/modules/live-share/battlemap-publication.js';
import { sha256Hex } from '../../js/modules/live-share/asset-protocol.js';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A fake PNG (correct signature, distinct content) and its offer metadata. */
export async function makeAsset(kind, { seed = 1, byteLength = 4096, width, height } = {}) {
  const bytes = new Uint8Array(byteLength);
  bytes.set(PNG_SIGNATURE);
  for (let i = PNG_SIGNATURE.length; i < byteLength; i++) bytes[i] = (i * 31 + seed * 97) & 255;
  bytes[8] = seed & 255;
  bytes[9] = (seed >> 8) & 255;
  const assetId = await sha256Hex(bytes);
  const size = kind === 'background' ? { width: width || 1400, height: height || 900 } : { width: width || 256, height: height || 256 };
  return { meta: { assetId, kind, mime: 'image/png', ...size, byteLength }, bytes };
}

/**
 * Boundary content for a Battle Map, made by the real projection (BattleMapShareState) and
 * fromProjection(). `tokens` are Battle Map tokens; `art` maps a token's imgSrc to an asset id.
 */
export function battleMapContent({ background = null, tokens = [{ id: 't1', name: 'Goblin', showLabel: true, x: 70, y: 70, w: 70, h: 70 }], art = {}, measurements = [] } = {}) {
  const projected = globalThis.BattleMapShareState.projectPlayerSafeState({
    state: {
      map: { w: 1400, h: 900 },
      mapTransform: { scale: 1, x: 0, y: 0 },
      grid: { size: 70, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
      tokens,
    },
    persistentMeasurements: measurements,
    assets: {
      background: () => (background ? { assetId: background, revision: 41 } : null), // a surface-local revision
      tokenAssetId: (t) => art[t.imgSrc] || null,
    },
  });
  return fromProjection(projected);
}

/** A publication: content plus the metadata of the assets it references. */
export function publication(structured, assets = []) {
  return { structured, assets: assets.map((a) => a.meta) };
}

/** An in-memory BroadcastChannel bus. */
export function createBus() {
  const channels = new Map(); // name -> Set(channel)
  const queue = [];
  const log = []; // every message posted: { name, msg }
  function open(name) {
    if (!channels.has(name)) channels.set(name, new Set());
    const ch = {
      name,
      onmessage: null,
      closed: false,
      postMessage(msg) {
        if (ch.closed) throw new Error('InvalidStateError: closed');
        log.push({ name, msg: structuredClone(msg) });
        for (const other of channels.get(name)) {
          if (other === ch) continue;
          const copy = structuredClone(msg);
          queue.push(() => !other.closed && other.onmessage && other.onmessage({ data: copy }));
        }
      },
      close() {
        ch.closed = true;
        channels.get(name).delete(ch);
      },
    };
    channels.get(name).add(ch);
    return ch;
  }
  /** Deliver everything, including what deliveries and async work (hashing) post in turn. */
  async function settle() {
    for (let idle = 0; idle < 5; ) {
      if (queue.length) {
        idle = 0;
        while (queue.length) queue.shift()();
      } else idle += 1;
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  /** Post as an outsider (a hostile tab, an old build): no listener of its own. */
  function inject(name, msg) {
    const outsider = open(name);
    outsider.postMessage(msg);
    outsider.close();
  }
  const sent = (type) => log.filter((e) => e.msg && e.msg.type === type).map((e) => e.msg);
  return { open, settle, inject, log, sent };
}
