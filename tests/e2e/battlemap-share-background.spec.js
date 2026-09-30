// Live Share Milestone 3: the player-visible background composition on real canvases
// (js/modules/battle-map-share-assets.js), in Chromium: painted fog, cover and reveal shapes, soft
// edges, fog off, and the encoded result. Pixels are read back after encoding and decoding, so what
// is checked is exactly what a player could recover from the bytes it receives.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/liveshare-dev');
  await page.addScriptTag({ url: '/js/modules/battle-map-share-assets.js' });
});

// Build a 400x300 map with a secret, compose it with the given fog, encode it, decode it, and
// return pixel samples (as [r, g, b, a]) at the requested points and regions.
function composeAndRead(page, { fog = [], shapes = [], fogEnabled = true, preferWebp = true, samples }) {
  return page.evaluate(
    async ({ fog, shapes, fogEnabled, preferWebp, samples }) => {
      const { composePlayerBackground, encodeCanvas } = window.BattleMapShareAssets;
      const createCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const map = createCanvas(400, 300);
      const m = map.getContext('2d');
      m.fillStyle = '#208040';
      m.fillRect(0, 0, 400, 300);
      // The secret: a fine magenta/white checkerboard in 100..200 x 100..200.
      for (let y = 100; y < 200; y += 4) for (let x = 100; x < 200; x += 4) {
        m.fillStyle = (x + y) % 8 === 0 ? '#ff00ff' : '#ffffff';
        m.fillRect(x, y, 4, 4);
      }
      const fogCanvas = createCanvas(400, 300);
      const f = fogCanvas.getContext('2d');
      for (const op of fog) {
        f.globalCompositeOperation = op.erase ? 'destination-out' : 'source-over';
        f.fillStyle = op.color || 'rgba(0,0,0,1)';
        f.beginPath();
        f.arc(op.x, op.y, op.r, 0, Math.PI * 2);
        f.fill();
      }
      const { canvas } = composePlayerBackground({ mapImage: map, mapWidth: 400, mapHeight: 300, fogEnabled, fogCanvas, fogShapes: shapes, createCanvas });
      const encoded = await encodeCanvas(canvas, preferWebp);
      const bitmap = await createImageBitmap(new Blob([encoded.bytes], { type: encoded.mime }));
      const out = createCanvas(bitmap.width, bitmap.height).getContext('2d');
      out.drawImage(bitmap, 0, 0);
      const read = ({ x, y, w = 1, h = 1 }) => {
        const d = out.getImageData(x, y, w, h).data;
        const px = [];
        for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
        return px;
      };
      return { mime: encoded.mime, bytes: encoded.bytes.length, samples: samples.map(read) };
    },
    { fog, shapes, fogEnabled, preferWebp, samples }
  );
}

const SECRET = { x: 100, y: 100, w: 100, h: 100 };
const near = (px, rgb, tol = 20) => rgb.every((v, i) => Math.abs(px[i] - v) <= tol);
const brightness = (px) => px[0] + px[1] + px[2];

test.describe('player-visible background composition (Milestone 3)', () => {
  test('painted fog hides the secret completely; nothing of it can be recovered from the encoded bytes', async ({ page }) => {
    const r = await composeAndRead(page, {
      fog: [{ x: 150, y: 150, r: 90 }], // covers the whole secret
      samples: [SECRET, { x: 10, y: 10 }, { x: 390, y: 290 }],
    });
    expect(r.mime).toBe('image/webp');
    const hidden = r.samples[0];
    for (const px of hidden) expect(brightness(px)).toBeLessThan(20);
    // Magenta and white cells decode to the same black: no trace of the pattern.
    const values = hidden.map(brightness);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(10);
    expect(near(r.samples[1][0], [0x20, 0x80, 0x40])).toBe(true);
    expect(near(r.samples[2][0], [0x20, 0x80, 0x40])).toBe(true);
  });

  test('the same holds losslessly (PNG): hidden pixels are exactly the fog colour, alpha 255', async ({ page }) => {
    const r = await composeAndRead(page, { fog: [{ x: 150, y: 150, r: 90 }], preferWebp: false, samples: [SECRET] });
    expect(r.mime).toBe('image/png');
    for (const px of r.samples[0]) expect(px).toEqual([0, 0, 0, 255]);
  });

  test('soft (anti-aliased) fog edges become fully opaque, never see-through', async ({ page }) => {
    // A fog edge crossing the secret: pixels along it have partial fog alpha in the fog bitmap.
    const r = await composeAndRead(page, {
      fog: [{ x: 100, y: 150, r: 60.5 }],
      preferWebp: false,
      samples: [{ x: 100, y: 100, w: 70, h: 100 }],
    });
    // Lossless: every pixel across the edge is either pure fog or exactly the source; none is a blend
    // that would let the map show through partially.
    const allowed = ['0,0,0', '255,0,255', '255,255,255'];
    const blends = r.samples[0].map((px) => px.slice(0, 3).join(',')).filter((c) => !allowed.includes(c));
    expect(blends).toEqual([]);
    expect(r.samples[0].some((px) => px[0] === 0 && px[2] === 0)).toBe(true); // fogged part
    expect(r.samples[0].some((px) => px[0] === 255)).toBe(true); // visible part past the edge
  });

  test('cover shapes are opaque in their colour (even a see-through colour); reveal shapes cut through fog', async ({ page }) => {
    const r = await composeAndRead(page, {
      fog: [{ x: 150, y: 150, r: 90 }],
      shapes: [
        { id: 'c', type: 'rect', x: 250, y: 20, w: 100, h: 60, rot: 0, mode: 'cover', color: 'rgba(200, 30, 30, 0.3)' },
        { id: 'r', type: 'circle', x: 130, y: 130, r: 20, mode: 'reveal' }, // reveals 130..170 around (150, 150)
      ],
      preferWebp: false,
      samples: [{ x: 300, y: 50 }, { x: 150, y: 150, w: 1, h: 1 }, { x: 105, y: 105 }],
    });
    // Opaque in the shape's colour (within premultiplied-alpha rounding), not blended with the green
    // map underneath (a 30% blend would put green near 98).
    const cover = r.samples[0][0];
    expect(cover[3]).toBe(255);
    expect(near(cover, [200, 30, 30], 2)).toBe(true);
    const revealed = r.samples[1][0];
    expect(near(revealed, [0xff, 0x00, 0xff], 0) || near(revealed, [0xff, 0xff, 0xff], 0)).toBe(true); // the map shows through
    expect(r.samples[2][0]).toEqual([0, 0, 0, 255]); // still fogged outside the reveal
  });

  test('with fog off the map shows as the DM sees it (fog is not drawn)', async ({ page }) => {
    const r = await composeAndRead(page, { fog: [{ x: 150, y: 150, r: 90 }], fogEnabled: false, preferWebp: false, samples: [{ x: 101, y: 101 }] });
    expect(near(r.samples[0][0], [0xff, 0x00, 0xff], 0) || near(r.samples[0][0], [0xff, 0xff, 0xff], 0)).toBe(true);
  });

  test('an oversized map is composed at a reduced scale within the limits', async ({ page }) => {
    const size = await page.evaluate(() => {
      const { composePlayerBackground, LIMITS } = window.BattleMapShareAssets;
      const createCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const map = createCanvas(9000, 3000);
      const { width, height } = composePlayerBackground({ mapImage: map, mapWidth: 9000, mapHeight: 3000, fogEnabled: false, fogCanvas: null, fogShapes: [], createCanvas });
      return { width, height, maxDim: LIMITS.backgroundMaxDimension, maxPixels: LIMITS.backgroundMaxPixels };
    });
    expect(size.width).toBeLessThanOrEqual(size.maxDim);
    expect(size.width * size.height).toBeLessThanOrEqual(size.maxPixels);
    expect(size.width / size.height).toBeCloseTo(3, 1);
  });

  test('a map the host cannot read (a cross-origin image) is refused, not sent', async ({ page }) => {
    const error = await page.evaluate(async () => {
      const { composePlayerBackground } = window.BattleMapShareAssets;
      const createCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = 'http://127.0.0.1:3100/images/BGMap.png'; // another origin, no CORS
      });
      try {
        composePlayerBackground({ mapImage: img, mapWidth: 100, mapHeight: 100, fogEnabled: false, fogCanvas: null, fogShapes: [], createCanvas });
        return null;
      } catch (err) {
        return err.name;
      }
    });
    expect(error).toBe('SecurityError');
  });
});
