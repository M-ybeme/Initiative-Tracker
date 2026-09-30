// Live Share Milestone 3: benchmark the player-visible background encoding (WebP vs PNG) in
// Chromium, on the inputs available in the repository. Run: node scripts/bench-live-share-background.mjs
//
// Inputs (there are no real battle-map fixtures in the repository, so these stand in for them):
//   art        images/BGMap.png (1536x1024 painted art texture), upscaled to 3072x2048
//   art-fog    the same image with ~70% of it covered by opaque fog (a fog-heavy composite)
//   dungeon    a generated flat, simple map (rooms, corridors, grid) at 3000x2000
//   noise      generated fine detail at 2048x2048: a worst case for any encoder, not a real map
// Each input is encoded 3 times per setting; the median time is reported.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const art = `data:image/png;base64,${readFileSync(new URL('../images/BGMap.png', import.meta.url)).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const results = await page.evaluate(async (artUrl) => {
  const load = (src) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
  const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

  const inputs = {};
  const img = await load(artUrl);
  {
    const c = canvas(3072, 2048);
    c.getContext('2d').drawImage(img, 0, 0, 3072, 2048);
    inputs.art = c;
  }
  {
    const c = canvas(3072, 2048);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 3072, 2048);
    g.fillStyle = '#000';
    g.fillRect(0, 0, 3072 * 0.7, 2048);
    g.beginPath();
    g.arc(2700, 600, 300, 0, Math.PI * 2);
    g.fill();
    inputs['art-fog'] = c;
  }
  {
    const c = canvas(3000, 2000);
    const g = c.getContext('2d');
    g.fillStyle = '#2b2b2b';
    g.fillRect(0, 0, 3000, 2000);
    g.fillStyle = '#c9b48a';
    for (const [x, y, w, h] of [[200, 200, 800, 600], [1200, 300, 900, 500], [400, 1100, 1100, 700], [1800, 1000, 900, 800], [1000, 450, 200, 100], [900, 800, 100, 300]]) g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let x = 0; x <= 3000; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 2000); g.stroke(); }
    for (let y = 0; y <= 2000; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(3000, y); g.stroke(); }
    inputs.dungeon = c;
  }
  {
    const c = canvas(2048, 2048);
    const g = c.getContext('2d');
    const data = g.createImageData(2048, 2048);
    let s = 1;
    for (let i = 0; i < data.data.length; i += 4) {
      s = (s * 1103515245 + 12345) >>> 0;
      const v = 90 + ((s >>> 16) % 80);
      data.data[i] = v; data.data[i + 1] = v * 0.9; data.data[i + 2] = v * 0.6; data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
    inputs.noise = c;
  }

  const encode = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
  const settings = [['image/png'], ['image/webp', 0.8], ['image/webp', 0.85], ['image/webp', 0.9], ['image/webp', 1.0]];
  const out = [];
  for (const [name, c] of Object.entries(inputs)) {
    for (const [type, q] of settings) {
      const times = [];
      let blob;
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        blob = await encode(c, type, q);
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      out.push({ input: name, size: `${c.width}x${c.height}`, setting: q === undefined ? 'png' : `webp q=${q}`, actualType: blob.type, kib: Math.round(blob.size / 1024), ms: Math.round(times[1]) });
    }
  }
  return out;
}, art);
await browser.close();

console.log('| input | pixels | setting | bytes (KiB) | encode ms (median of 3) |');
console.log('|---|---|---|---|---|');
for (const r of results) console.log(`| ${r.input} | ${r.size} | ${r.setting}${r.actualType.endsWith(r.setting.startsWith('png') ? 'png' : 'webp') ? '' : ` (got ${r.actualType})`} | ${r.kib} | ${r.ms} |`);
