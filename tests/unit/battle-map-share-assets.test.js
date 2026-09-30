// Live Share Milestone 3: the Battle Map side of the asset seam (js/modules/battle-map-share-assets.js):
// fog masking, custom-art classification, and the background lifecycle (change detection, debounce,
// background revision, content-derived ids, stale-result discard, failures) plus token assets.
// Real canvas composition is covered in the browser (tests/e2e/live-share-assets.spec.js,
// tests/e2e/battlemap-share-background.spec.js); here canvases are fakes whose encoded bytes are
// a pure function of what was drawn on them, so identical inputs give identical bytes and ids.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import '../../js/modules/battle-map-share-assets.js';
import '../../js/modules/battle-map-share-state.js';
import { ASSET_LIMITS } from '../../js/modules/live-share/asset-protocol.js';

const { LIMITS, maskFogPixels, backgroundScale, classifyTokenImage, createShareAssets, sha256Hex } = globalThis.BattleMapShareAssets;
const { projectPlayerSafeState } = globalThis.BattleMapShareState;
// SHA-256 computed synchronously (resolved on a microtask), so a build finishes within the fake
// clock's settling instead of racing Web Crypto's thread pool; real Web Crypto hashing is covered by
// the integration and browser tests.
const subtle = { digest: async (_alg, bytes) => new Uint8Array(createHash('sha256').update(bytes).digest()).buffer };
const ORIGIN = 'http://localhost:3100';

describe('maskFogPixels', () => {
  it('makes every pixel the fog touches opaque fog, and leaves the rest untouched', () => {
    // Four pixels: no fog, fully fogged, a soft fog edge (alpha 1 of 255), a coloured cover shape.
    const map = new Uint8ClampedArray([10, 20, 30, 255, 200, 0, 200, 255, 255, 0, 255, 255, 1, 2, 3, 128]);
    const fog = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 1, 90, 80, 70, 255]);
    maskFogPixels(map, fog);
    expect([...map]).toEqual([10, 20, 30, 255, 0, 0, 0, 255, 0, 0, 0, 255, 90, 80, 70, 255]);
  });

  it('leaves nothing of the source under fog: different hidden pixels give identical output', () => {
    const fog = new Uint8ClampedArray(4 * 64).map((_, i) => (i % 4 === 3 ? 255 : 0));
    const a = maskFogPixels(new Uint8ClampedArray(4 * 64).map((_, i) => (i * 7) % 256), fog);
    const b = maskFogPixels(new Uint8ClampedArray(4 * 64).map((_, i) => (i * 13 + 5) % 256), fog);
    expect([...a]).toEqual([...b]);
  });
});

describe('limits', () => {
  it('match the limits the player enforces', () => {
    expect(LIMITS.backgroundMaxBytes).toBe(ASSET_LIMITS.background.maxBytes);
    expect(LIMITS.backgroundMaxDimension).toBe(ASSET_LIMITS.background.maxDimension);
    expect(LIMITS.backgroundMaxPixels).toBe(ASSET_LIMITS.background.maxPixels);
    expect(LIMITS.tokenMaxBytes).toBe(ASSET_LIMITS.token.maxBytes);
    expect(LIMITS.tokenMaxDimension).toBe(ASSET_LIMITS.token.maxDimension);
  });

  it('scale an oversized map down to fit, and never scale up', () => {
    expect(backgroundScale(2000, 1500)).toBe(1);
    for (const [w, h] of [[10000, 2000], [6000, 6000], [16384, 16384], [20000, 100]]) {
      const s = backgroundScale(w, h);
      // composePlayerBackground floors the scaled size, so it never exceeds either limit.
      expect(Math.floor(w * s)).toBeLessThanOrEqual(LIMITS.backgroundMaxDimension);
      expect(Math.floor(w * s) * Math.floor(h * s)).toBeLessThanOrEqual(LIMITS.backgroundMaxPixels);
    }
  });
});

describe('classifyTokenImage: what counts as custom art', () => {
  it.each([
    ['an uploaded image (data URL)', 'data:image/png;base64,iVBOR', 'inline'],
    ['a Character Manager token (data URL)', 'data:image/webp;base64,UklGR', 'inline'],
    ['a blob URL', 'blob:http://localhost:3100/abc', 'inline'],
    ['a built-in preset (same-origin path)', '/images/playerTokens/PlayerBardToken.png', 'generic'],
    ['a same-origin absolute URL', 'http://localhost:3100/images/enemyTokens/Goblin.png', 'generic'],
    ['another origin', 'https://cdn.example.com/art.png', 'external'],
    ['a javascript: URL', 'javascript:alert(1)', 'none'],
    ['a non-image data URL', 'data:text/html,<script>', 'none'],
    ['an empty source', '', 'none'],
    ['no source', undefined, 'none'],
  ])('%s -> %s', (_label, src, expected) => {
    expect(classifyTokenImage(src, ORIGIN)).toBe(expected);
  });
});

// ---- A fake canvas world -------------------------------------------------------------------------

// Every drawable has `content`; drawing appends it (and fills append their style) to the canvas's
// content; encoding returns bytes derived from that content, prefixed with a real image signature.
function makeWorld({ supportsWebp = true, encodeBytes = null } = {}) {
  const world = { encodes: 0, composes: 0, tainted: new Set() };
  world.createCanvas = (w, h) => {
    const canvas = { width: w, height: h, content: [], tainted: false };
    const ctx = {
      fillStyle: '#000',
      globalCompositeOperation: 'source-over',
      drawImage(src) {
        canvas.content.push(`img:${src.content}`);
        if (world.tainted.has(src.content)) canvas.tainted = true;
      },
      // Pixels are derived from what was drawn, so masking with a different fog gives different bytes.
      getImageData(x, y, gw, gh) {
        if (canvas.tainted) throw new Error('SecurityError: tainted');
        const seed = [...canvas.content.join(',')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
        return { data: new Uint8ClampedArray(Math.min(gw * gh, 4096) * 4).map((_, i) => (seed >>> (i % 24)) & 255) };
      },
      putImageData(img) {
        canvas.content.push(`put:${img.data.reduce((h, v, i) => (h + v * (i + 1)) >>> 0, 0)}`);
      },
      fillRect(...args) {
        canvas.content.push(`fill:${ctx.fillStyle}:${ctx.globalCompositeOperation}:${args.join(' ')}`);
      },
      fill() {
        canvas.content.push(`fill:${ctx.fillStyle}:${ctx.globalCompositeOperation}`);
      },
      save() {},
      restore() {},
      translate(x, y) {
        canvas.content.push(`t:${x},${y}`);
      },
      rotate(r) {
        canvas.content.push(`r:${r}`);
      },
      scale() {},
      beginPath() {},
      arc(...args) {
        canvas.content.push(`arc:${args.join(' ')}`);
      },
    };
    canvas.getContext = () => ctx;
    canvas.toBlob = (cb, type) => {
      world.encodes += 1;
      if (canvas.tainted) throw new Error('SecurityError: tainted canvas');
      const mime = type === 'image/webp' && supportsWebp ? 'image/webp' : 'image/png';
      const sig = mime === 'image/webp' ? 'RIFF\0\0\0\0WEBP' : '\x89PNG\r\n\x1a\n';
      const body = encodeBytes ? encodeBytes(canvas) : `${canvas.width}x${canvas.height}|${canvas.content.join(',')}`;
      const bytes = new TextEncoder().encode(sig + body);
      // Blob-like, resolved on microtasks (a real Blob's arrayBuffer() may take longer to settle).
      Promise.resolve().then(() => cb({ type: mime, arrayBuffer: async () => bytes.buffer }));
    };
    return canvas;
  };
  return world;
}

// A hand-driven clock and timers (async builds still run on real promises).
function fakeTime() {
  let t = 0;
  let timers = [];
  let next = 1;
  return {
    now: () => t,
    setTimer: (fn, ms) => {
      const id = next++;
      timers.push({ id, at: t + ms, fn });
      return id;
    },
    clearTimer: (id) => {
      timers = timers.filter((x) => x.id !== id);
    },
    pending: () => timers.length,
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const due = timers[0];
        if (!due || due.at > end) break;
        timers.shift();
        t = due.at;
        due.fn();
        await settle();
      }
      t = end;
      await settle();
    },
  };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

let world;
let time;
let battle; // a Battle Map-shaped state the inputs are read from
let assets;
let changes;

function setup(options = {}) {
  world = makeWorld(options);
  time = fakeTime();
  changes = 0;
  battle = {
    map: { image: null, width: 0, height: 0 },
    fogEnabled: true,
    fog: { width: 800, height: 600, content: 'fog-v0' },
    fogVersion: 0,
    fogShapes: [],
    tokens: [],
    grid: { size: 50 },
    mapTransform: { scale: 1, x: 0, y: 0 },
  };
  const loadImage = vi.fn(async (src, opts = {}) => {
    if (src.includes('unreachable')) throw new Error('load failed');
    if (src.startsWith('https://') && !opts.crossOrigin) throw new Error('expected a CORS load for an external image');
    if (src.includes('no-cors')) world.tainted.add(src);
    return { naturalWidth: 64, naturalHeight: 64, content: src };
  });
  assets = createShareAssets({
    getInputs: () => ({ map: battle.map, fogEnabled: battle.fogEnabled, fogCanvas: battle.fog, fogShapes: battle.fogShapes, fogVersion: battle.fogVersion, fogReady: battle.fogReady, tokens: battle.tokens }),
    onChange: () => (changes += 1),
    createCanvas: world.createCanvas,
    loadImage,
    subtle,
    pageOrigin: ORIGIN,
    now: time.now,
    setTimer: time.setTimer,
    clearTimer: time.clearTimer,
    ...options.assets,
  });
  return { loadImage };
}

const loadMap = (content = 'map-A', width = 800, height = 600) => {
  battle.map = { image: { content }, width, height };
};
const paintFog = (content) => {
  battle.fog.content = content;
  battle.fogVersion += 1;
};

describe('background lifecycle', () => {
  beforeEach(() => setup());

  it('has no background without a map; the structured map works without one', async () => {
    assets.check();
    await time.advance(2000);
    expect(assets.background()).toBeNull();
    expect(assets.diagnostics().background.status).toBe('none');
  });

  it('composes, encodes (WebP) and publishes the background with revision 1 and a SHA-256 id', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    const bg = assets.background();
    expect(bg).toEqual({ assetId: expect.stringMatching(/^[0-9a-f]{64}$/), revision: 1 });
    expect(changes).toBe(1);
    const asset = assets.getAsset(bg.assetId);
    expect(asset).toMatchObject({ assetId: bg.assetId, kind: 'background', mime: 'image/webp', width: 800, height: 600 });
    expect(await sha256Hex(asset.bytes, subtle)).toBe(bg.assetId); // the id is the hash of the bytes sent
    expect(assets.diagnostics().background).toMatchObject({ status: 'ready', revision: 1, mime: 'image/webp', bytes: asset.bytes.length });
  });

  it('does not rebuild for token moves, grid or map transform changes, or repeated checks', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    const bg = assets.background();
    const encodes = world.encodes;
    battle.tokens = [{ id: 't1', imgSrc: '/images/playerTokens/x.png', x: 10 }];
    battle.tokens[0].x = 500; // token move
    battle.grid.size = 70; // grid change
    battle.mapTransform = { scale: 2, x: 30, y: -10 }; // map transform
    for (let i = 0; i < 20; i++) assets.check();
    await time.advance(2000);
    expect(world.encodes).toBe(encodes);
    expect(assets.background()).toEqual(bg);
  });

  it('rebuilds after a fog change, with a new asset and revision 2', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    const first = assets.background();
    paintFog('fog-v1');
    assets.check();
    await time.advance(300);
    const second = assets.background();
    expect(second.revision).toBe(2);
    expect(second.assetId).not.toBe(first.assetId);
    expect(assets.hasAsset(first.assetId)).toBe(false); // the old background is gone
    expect(assets.hasAsset(second.assetId)).toBe(true);
  });

  it('rebuilds for fog shapes, fog on/off and a new map; not for fog while fog is off', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    let rev = assets.background().revision;
    const step = async (change) => {
      change();
      assets.check();
      await time.advance(300);
    };
    await step(() => battle.fogShapes.push({ id: 's', type: 'rect', x: 1, y: 2, w: 3, h: 4, mode: 'cover', color: '#000000' }));
    expect(assets.background().revision).toBe(++rev);
    await step(() => (battle.fogShapes[0].x = 50)); // a shape moved
    expect(assets.background().revision).toBe(++rev);
    await step(() => (battle.fogEnabled = false));
    expect(assets.background().revision).toBe(++rev);
    const encodes = world.encodes;
    await step(() => paintFog('fog-while-off'));
    expect(world.encodes).toBe(encodes); // fog is not shown, so not part of the background
    await step(() => loadMap('map-B'));
    expect(assets.background().revision).toBe(++rev);
    await step(() => (battle.map = { image: null, width: 0, height: 0 }));
    expect(assets.background()).toBeNull();
  });

  it('keeps the revision when a change produces identical pixels (content-derived id)', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    const bg = assets.background();
    battle.fogVersion += 1; // the bitmap was touched, but its content is the same
    assets.check();
    await time.advance(300);
    expect(assets.background()).toEqual(bg);
  });

  it('debounces bursts: one build 250 ms after the last change, at most 1 s apart while changes continue', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    const encodes = world.encodes;
    for (let i = 0; i < 10; i++) {
      paintFog(`stroke-${i}`);
      assets.check();
      await time.advance(50);
    }
    // 10 changes over 500 ms: none built yet (each pushed the debounce), then one.
    expect(world.encodes).toBe(encodes);
    await time.advance(250);
    expect(world.encodes).toBe(encodes + 1);
    expect(assets.background().revision).toBe(2);

    for (let i = 0; i < 30; i++) {
      paintFog(`long-${i}`);
      assets.check();
      await time.advance(50);
    }
    // 1.5 s of continuous painting: the max wait forced a build part-way through.
    expect(world.encodes).toBeGreaterThan(encodes + 1);
  });

  it('never publishes a stale composite: a change during encoding is rebuilt before anything is published', async () => {
    const w = makeWorld();
    const t = fakeTime();
    const state = { map: { image: { content: 'm' }, width: 100, height: 100 }, fogVersion: 0, fogContent: 'a' };
    let hookFired = false;
    const createCanvas = (cw, ch) => {
      const c = w.createCanvas(cw, ch);
      const encode = c.toBlob;
      c.toBlob = (cb, type) => {
        if (!hookFired) {
          hookFired = true;
          state.fogVersion += 1; // the DM covers something while the first composite encodes
          state.fogContent = 'b';
        }
        encode(cb, type);
      };
      return c;
    };
    const published = [];
    const a = createShareAssets({
      getInputs: () => ({ map: state.map, fogEnabled: true, fogCanvas: { width: 100, height: 100, content: state.fogContent }, fogShapes: [], fogVersion: state.fogVersion, tokens: [] }),
      onChange: () => published.push(a.background()),
      createCanvas,
      loadImage: async () => ({}),
      subtle,
      pageOrigin: ORIGIN,
      now: t.now,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    a.check();
    await t.advance(1000);
    expect(a.diagnostics().background.discardedStale).toBe(1);
    expect(published).toHaveLength(1); // only one background was ever published...
    // ...and it is the composite of the fog as it is now ('b'), not of the fog it started with ('a').
    const idOf = async (fogContent) => {
      const t2 = fakeTime();
      const b = createShareAssets({
        getInputs: () => ({ map: state.map, fogEnabled: true, fogCanvas: { width: 100, height: 100, content: fogContent }, fogShapes: [], fogVersion: 0, tokens: [] }),
        createCanvas: makeWorld().createCanvas,
        loadImage: async () => ({}),
        subtle,
        pageOrigin: ORIGIN,
        now: t2.now,
        setTimer: t2.setTimer,
        clearTimer: t2.clearTimer,
      });
      b.check();
      await t2.advance(1000);
      return b.background().assetId;
    };
    expect(published[0].assetId).toBe(await idOf('b'));
    expect(published[0].assetId).not.toBe(await idOf('a'));
  });

  it('falls back to no background (never a stale one) when the map cannot be read', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    expect(assets.background()).not.toBeNull();
    world.tainted.add('map-tainted');
    loadMap('map-tainted');
    assets.check();
    await time.advance(300);
    expect(assets.background()).toBeNull();
    expect(assets.diagnostics().background).toMatchObject({ status: 'failed', reason: 'unreadable' });
  });

  it('publishes nothing while a saved fog bitmap is still decoding, then the fogged background', async () => {
    loadMap();
    battle.fogReady = false; // the page is still decoding the saved fog
    assets.check();
    await time.advance(2000);
    expect(assets.background()).toBeNull(); // not the map without its fog
    expect(assets.diagnostics().background.status).toBe('waiting-for-fog');
    expect(world.encodes).toBe(0);
    paintFog('fog-from-save');
    battle.fogReady = true;
    assets.check();
    await time.advance(300);
    expect(assets.background()).toMatchObject({ revision: 1 });
  });

  it('uses PNG where the browser cannot encode WebP', async () => {
    setup({ supportsWebp: false });
    loadMap();
    assets.check();
    await time.advance(300);
    expect(assets.getAsset(assets.background().assetId).mime).toBe('image/png');
  });

  it('scales down, then gives up with "too-large", when the encoded background exceeds the byte limit', async () => {
    let sizes = [];
    setup({
      encodeBytes: (canvas) => {
        sizes.push(canvas.width);
        return 'x'.repeat(canvas.width >= 600 ? LIMITS.backgroundMaxBytes + 1 : 10);
      },
    });
    loadMap('big', 800, 600);
    assets.check();
    await time.advance(300);
    expect(sizes).toEqual([800, 560]); // retried at 70%, which fit
    expect(assets.getAsset(assets.background().assetId).width).toBe(560);

    let attempts = 0;
    setup({
      encodeBytes: () => {
        attempts += 1;
        return 'x'.repeat(LIMITS.backgroundMaxBytes + 1);
      },
    });
    loadMap('huge', 800, 600);
    assets.check();
    await time.advance(300);
    expect(attempts).toBe(4); // full size, then three smaller tries, then it stops
    expect(assets.background()).toBeNull();
    expect(assets.diagnostics().background).toMatchObject({ status: 'failed', reason: 'too-large' });
  });

  it('getAsset returns a copy, and nothing for unknown or malformed ids', async () => {
    loadMap();
    assets.check();
    await time.advance(300);
    const id = assets.background().assetId;
    const copy = assets.getAsset(id);
    copy.bytes.fill(0);
    expect(assets.getAsset(id).bytes.some((b) => b !== 0)).toBe(true);
    expect(assets.getAsset('0'.repeat(64))).toBeNull();
    expect(assets.getAsset('../etc/passwd')).toBeNull();
    expect(assets.getAsset(undefined)).toBeNull();
  });
});

describe('token assets', () => {
  let loadImage;
  beforeEach(() => ({ loadImage } = setup()));
  const flush = async () => {
    for (let i = 0; i < 10; i++) await settle();
  };

  it('generic (preset) art gets no asset and is never loaded for transfer', async () => {
    battle.tokens = [{ id: 't1', imgSrc: '/images/playerTokens/PlayerBardToken.png' }];
    assets.check();
    await flush();
    expect(assets.tokenAssetId(battle.tokens[0])).toBeNull();
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('uploaded art gets a content-derived asset; tokens sharing it share one asset', async () => {
    const src = 'data:image/png;base64,UPLOADED';
    battle.tokens = [
      { id: 't1', imgSrc: src },
      { id: 't2', imgSrc: src },
    ];
    assets.check();
    await flush();
    const id = assets.tokenAssetId(battle.tokens[0]);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(assets.tokenAssetId(battle.tokens[1])).toBe(id);
    expect(loadImage).toHaveBeenCalledTimes(1);
    expect(assets.getAsset(id)).toMatchObject({ kind: 'token', mime: 'image/webp', width: 64, height: 64 });
    expect(changes).toBe(1);
    expect(assets.diagnostics().tokens).toMatchObject({ prepared: 1, assets: 1 });
  });

  it('external art is loaded with CORS; unreadable or unreachable art falls back to the marker', async () => {
    battle.tokens = [
      { id: 'ok', imgSrc: 'https://cors.example/art.png' },
      { id: 'blocked', imgSrc: 'https://no-cors.example/art.png' },
      { id: 'gone', imgSrc: 'https://unreachable.example/art.png' },
    ];
    assets.check();
    await flush();
    expect(assets.tokenAssetId(battle.tokens[0])).toMatch(/^[0-9a-f]{64}$/);
    expect(assets.tokenAssetId(battle.tokens[1])).toBeNull();
    expect(assets.tokenAssetId(battle.tokens[2])).toBeNull();
    expect(loadImage).toHaveBeenCalledWith('https://cors.example/art.png', { crossOrigin: 'anonymous' });
    expect(assets.diagnostics().tokens.unreadable).toBe(2);
  });

  it('drops a token asset once no token uses its art', async () => {
    battle.tokens = [{ id: 't1', imgSrc: 'data:image/png;base64,A' }];
    assets.check();
    await flush();
    const id = assets.tokenAssetId(battle.tokens[0]);
    battle.tokens = [];
    assets.check();
    expect(assets.hasAsset(id)).toBe(false);
  });
});

describe('the player-safe projection with assets (Milestone 3 allowlist extension)', () => {
  const HEX = 'c'.repeat(64);
  const source = (assets) => ({
    state: {
      map: { imgSrc: 'data:image/png;base64,SOURCEMAP', img: {}, w: 800, h: 600 },
      tokens: [
        { id: 't1', imgSrc: 'data:image/png;base64,ART', x: 1, y: 2, w: 3, h: 4, rot: 0, hp: 9 },
        { id: 't2', imgSrc: 'https://third.party/x.png', x: 1, y: 2, w: 3, h: 4, rot: 0 },
      ],
    },
    persistentMeasurements: [],
    assets,
  });

  it('adds only background { assetId, revision } and token assetId', () => {
    const p = projectPlayerSafeState(source({ background: () => ({ assetId: HEX, revision: 7, bytes: [1, 2], mime: 'image/webp' }), tokenAssetId: (t) => (t.id === 't1' ? HEX : null) }));
    expect(p.background).toEqual({ assetId: HEX, revision: 7 });
    expect(p.tokens.map((t) => t.assetId)).toEqual([HEX, null]);
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/data:|SOURCEMAP|third\.party|imgSrc|bytes|mime|"hp"/);
  });

  it('drops anything that is not a content-derived id or a positive revision', () => {
    for (const bg of [{ assetId: 'data:image/png;base64,AAAA', revision: 1 }, { assetId: HEX, revision: 0 }, { assetId: HEX, revision: 1.5 }, { assetId: HEX.toUpperCase(), revision: 1 }, 'x', null]) {
      expect(projectPlayerSafeState(source({ background: () => bg, tokenAssetId: () => null })).background).toBeNull();
    }
    for (const id of ['https://third.party/x.png', 'data:image/png;base64,ART', { id: HEX }, 42, HEX + 'a']) {
      expect(projectPlayerSafeState(source({ background: () => null, tokenAssetId: () => id })).tokens[0].assetId).toBeNull();
    }
  });
});
