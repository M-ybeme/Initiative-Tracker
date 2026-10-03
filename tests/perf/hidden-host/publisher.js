// TEST ONLY (Live Share Milestone 5A.1 spike): the visible publisher tab, standing in for the Battle Map.
//
// It builds player-safe snapshots with the real Battle Map projection (projectPlayerSafeState) and
// posts them, with 16 MiB player-visible backgrounds, to the session owner over BroadcastChannel. It
// acts only on commands the spike's orchestrator queues at the local collector (long-polled), so its
// own timers play no part in the measurements.
const params = new URLSearchParams(location.search);
const collector = params.get('collector');
const id = params.get('id') || 'pub';
let retired = false;
const W = () => performance.timeOrigin + performance.now();
const channel = new BroadcastChannel('dmtoolbox.live-share.spike');
const prepared = []; // { assetId, mime, width, height, bytes: ArrayBuffer }
const MAX_BYTES = 16 * 1024 * 1024; // the background limit (asset-protocol.js)

function report(type, data = {}) {
  return fetch(`${collector}/event`, { method: 'POST', body: JSON.stringify({ source: 'publisher', id, type, t: W(), visibility: document.visibilityState, ...data }) }).catch(() => {});
}

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

// A PNG of random noise (incompressible) as close under 16 MiB as the encoder allows.
async function noisePng(seedOffset) {
  let side = 2320;
  for (let attempt = 0; attempt < 8; attempt++) {
    const c = Object.assign(document.createElement('canvas'), { width: side, height: side });
    const g = c.getContext('2d');
    const img = g.createImageData(side, side);
    for (let i = 0; i < img.data.length; i += 65536) crypto.getRandomValues(img.data.subarray(i, Math.min(img.data.length, i + 65536)));
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    img.data[0] = seedOffset & 255; // distinct even if the generator repeated
    g.putImageData(img, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    if (blob.size <= MAX_BYTES && blob.size >= MAX_BYTES * 0.94) {
      const bytes = await blob.arrayBuffer();
      return { assetId: hex(await crypto.subtle.digest('SHA-256', bytes)), mime: 'image/png', width: side, height: side, bytes };
    }
    side = Math.floor(side * Math.sqrt((MAX_BYTES * 0.985) / blob.size));
  }
  throw new Error('could not size the noise PNG');
}

function content(seq, bg) {
  return globalThis.BattleMapShareState.projectPlayerSafeState({
    state: {
      map: { w: bg ? bg.width : 2000, h: bg ? bg.height : 2000 },
      mapTransform: { scale: 1, x: 0, y: 0 },
      grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
      tokens: [{ id: 't_spike', name: `pub ${seq}`, showLabel: true, imgSrc: '', x: 100 + (seq % 20) * 50, y: 100, w: 50, h: 50, rot: 0 }],
    },
    persistentMeasurements: [],
    assets: { background: () => (bg ? { assetId: bg.assetId, revision: seq } : null), tokenAssetId: () => null },
  });
}

let currentBg = null;
const run = {
  retire() {
    retired = true;
    channel.close();
  },
  async prepare({ count }) {
    for (let i = prepared.length; i < count; i++) prepared.push(await noisePng(i + 1));
    await report('prepared', { assets: prepared.map((a) => ({ assetId: a.assetId, bytes: a.bytes.byteLength, side: a.width })) });
  },
  publish({ seq }) {
    channel.postMessage({ type: 'publish', seq, content: content(seq, currentBg), tPost: W() });
    report('posted', { seq });
  },
  burst({ seqs }) {
    for (const seq of seqs) channel.postMessage({ type: 'publish', seq, content: content(seq, currentBg), tPost: W() });
    report('posted', { seqs });
  },
  publishAsset({ seq, index }) {
    const bg = prepared[index];
    currentBg = bg;
    channel.postMessage({ type: 'publish-asset', seq, content: content(seq, bg), asset: { mime: bg.mime, width: bg.width, height: bg.height, bytes: bg.bytes }, tPost: W() });
    report('posted', { seq, asset: bg.assetId, bytes: bg.bytes.byteLength });
  },
};

async function loop() {
  while (!retired) {
    let cmds = [];
    try {
      cmds = await (await fetch(`${collector}/cmd?id=${id}`)).json();
    } catch {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    for (const cmd of cmds) {
      try {
        await run[cmd.op](cmd);
      } catch (e) {
        await report('error', { op: cmd.op, message: String(e && e.message) });
      }
    }
  }
}
report('loaded', { userAgent: navigator.userAgent });
document.getElementById('state').textContent = `collector ${collector}`;
loop();
