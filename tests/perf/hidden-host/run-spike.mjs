// TEST ONLY — Live Share Milestone 5A.1 spike: does a HIDDEN session-owner tab keep working?
//
//   node tests/perf/hidden-host/run-spike.mjs --browser chrome|firefox [--quick] [--fault <name>]
//   node tests/perf/hidden-host/run-spike.mjs --manual [--quick]      (any browser, e.g. Safari on macOS:
//        the script prints the URLs to open and says when to switch tabs / minimize; see the ADR §9)
//
// Topology (the future shape, docs/live-share-session-host-architecture.md):
//   publisher tab (visible, owner.html's sibling)  ──BroadcastChannel──▶  owner tab (HIDDEN)
//   owner tab: real HostSession / SignalingClient / PeerLink / SnapshotSender / AssetSender
//   owner ──WebRTC (local relay for signaling)──▶ player (the real liveshare-dev.html player page)
//
// Why not Playwright for the owner: Playwright keeps every page it drives focused and visible (and its
// Chromium launch disables background throttling), so a Playwright page never becomes really hidden.
// Tabs created over CDP stayed "visible" too (checked). So the owner and publisher run in the REAL
// installed browser with a throwaway profile and NO automation or remote-debugging protocol at all:
// tabs are opened the way the OS opens a link, by handing a URL to the already-running browser, which
// opens it as the new active tab. Sequence: publisher tab → control tab → owner tab opened in front
// (owner visible) → a second publisher tab opened in front, the first one retires (owner genuinely
// hidden behind another tab, as a DM's session page would be) → finally the window is minimized.
//
// One environment setting, not a throttling setting: each browser's native "window covered by other
// windows" (occlusion) detection is turned off (Chrome: --disable-features=CalculateNativeWinOcclusion;
// Firefox: widget.windows.window_occlusion_tracking.enabled=false). On this automated desktop it
// misjudged windows (a front tab reported hidden, later tabs never hid), checked by experiment. With
// it off, tab switching and minimizing still hide pages exactly as for a user; timer throttling,
// background-tab policies and everything else stay at the browser's defaults. The owner reports what it sees (visibility,
// lifecycle events, timers, sends) to a local HTTP collector. The player is a Playwright headless
// Chromium page (its own visibility is not under test).
//
// Results: perf-results/hidden-host/<browser>[-<fault>].json and a summary on stdout.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startRelay } from '../../../relay/node-relay.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};
const MANUAL = !!opt('manual', false);
const BROWSER = MANUAL ? 'manual' : opt('browser', 'chrome');
const QUICK = !!opt('quick', false);
const FAULT = opt('fault', '');
// How long one step may take before it counts as failed (shorter for the mutation runs).
const STEP_MS = Number(opt('step-timeout', 180000));
const STATIC_PORT = 3150;
const COLLECTOR_PORT = 3151;
const RELAY_PORT = 8790;
const DEBUG_PORT = BROWSER === 'chrome' ? 9555 : 9556;
const ORIGIN = `http://localhost:${STATIC_PORT}`;
const COLLECTOR = `http://localhost:${COLLECTOR_PORT}`;
const RELAY = `ws://localhost:${RELAY_PORT}`;
const BROWSERS = {
  chrome: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  firefox: 'C:/Program Files/Mozilla Firefox/firefox.exe',
};
const W = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const median = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};

// ---- Static server (the repository) and collector ---------------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const staticServer = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
  if (!path.extname(p)) p += '.html'; // clean URLs (/liveshare-dev)
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

const events = []; // from owner and publisher
const queues = new Map(); // publisher id -> { commands, waiter }
const queue = (id) => {
  if (!queues.has(id)) queues.set(id, { commands: [], waiter: null });
  return queues.get(id);
};
let activePublisher = 'pub1';
const collector = http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  const url = new URL(req.url, COLLECTOR);
  if (url.pathname === '/event' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const ev = JSON.parse(body);
        ev.receivedAt = W();
        events.push(ev);
      } catch {}
      res.writeHead(204, cors).end();
    });
    return;
  }
  if (url.pathname === '/cmd') {
    const q = queue(url.searchParams.get('id'));
    const flush = () => {
      res.writeHead(200, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify(q.commands.splice(0)));
    };
    if (q.commands.length) return flush();
    const timer = setTimeout(() => {
      q.waiter = null;
      flush();
    }, 20000);
    q.waiter = () => {
      clearTimeout(timer);
      q.waiter = null;
      flush();
    };
    return;
  }
  res.writeHead(404, cors).end();
});
function command(op, data = {}, id = activePublisher) {
  const q = queue(id);
  q.commands.push({ op, ...data });
  if (q.waiter) q.waiter();
}

async function waitFor(fn, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`timeout (${timeoutMs} ms) waiting for ${what}`);
    await sleep(20);
  }
}
const ownerEvent = (pred) => events.find((e) => e.source === 'owner' && pred(e));
const ownerEvents = (pred) => events.filter((e) => e.source === 'owner' && pred(e));
const ownerVisibility = () => {
  const last = [...events].reverse().find((e) => e.source === 'owner' && e.visibility);
  return last ? last.visibility : null;
};

// ---- Browser control: none at page level -------------------------------------------------------
function powershell(script) {
  return new Promise((resolve) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', () => resolve(out.trim()));
  });
}

function manualBrowser() {
  let n = 0;
  const say = (text) => console.log(`\n>>> ${text}\n`);
  return {
    open(url) {
      n += 1;
      say(n === 1 ? `Open this URL in a NEW window of the browser under test (e.g. Safari):\n    ${url}` : `Open this URL in a NEW TAB of that same window (it must become the front tab):\n    ${url}`);
    },
    windows: async () => '(manual)',
    minimize: async () => {
      say('Now MINIMIZE that browser window (Safari: Cmd+M) and leave it minimized.');
      return 'minimize requested';
    },
    kill: async () => say('Done: you can close the browser window.'),
  };
}

async function launchBrowser() {
  if (MANUAL) return manualBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `ls-spike-${BROWSER}-`));
  const exe = BROWSERS[BROWSER];
  // Defaults only: no throttling-related switches or prefs, no remote debugging.
  const base =
    BROWSER === 'chrome'
      ? [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-features=CalculateNativeWinOcclusion']
      : ['-profile', profile];
  if (BROWSER === 'firefox') {
    fs.writeFileSync(
      path.join(profile, 'user.js'),
      [
        ['browser.shell.checkDefaultBrowser', false],
        ['browser.aboutwelcome.enabled', false],
        ['datareporting.policy.dataSubmissionEnabled', false],
        ['toolkit.telemetry.reportingpolicy.firstRun', false],
        ['browser.startup.homepage_override.mstone', 'ignore'],
        ['trailhead.firstrun.didSeeAboutWelcome', true],
        ['browser.tabs.warnOnClose', false],
        ['widget.windows.window_occlusion_tracking.enabled', false],
      ]
        .map(([k, v]) => `user_pref(${JSON.stringify(k)}, ${JSON.stringify(v)});`)
        .join('\n')
    );
  }
  let proc = null;
  return {
    profile,
    // The first URL starts the browser; later ones are handed to the running browser (a new active tab).
    open(url) {
      // Later URLs carry only the profile, so the running browser opens them as a tab, not a window.
      const argv = proc ? (BROWSER === 'chrome' ? [`--user-data-dir=${profile}`, url] : ['-profile', profile, url]) : [...base, url];
      const p = spawn(exe, argv, { stdio: 'ignore', detached: false });
      if (!proc) proc = p;
    },
    windows: () =>
      powershell(`
        Add-Type -Namespace W2 -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); public delegate bool CB(IntPtr h, IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, IntPtr l); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p); [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);'
        $ids = @((Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match [regex]::Escape('${path.basename(profile)}') }).ProcessId)
        $out = New-Object System.Collections.ArrayList
        [W2.U]::EnumWindows({ param($h, $l) $p = 0; [W2.U]::GetWindowThreadProcessId($h, [ref]$p) | Out-Null; if ($ids -contains [int]$p -and [W2.U]::IsWindowVisible($h)) { $sb = New-Object System.Text.StringBuilder 256; [W2.U]::GetWindowText($h, $sb, 256) | Out-Null; if ($sb.Length -gt 0) { [void]$out.Add($sb.ToString()) } }; return $true }, [IntPtr]::Zero) | Out-Null
        ($out -join ' || ')`),
    minimize: () =>
      powershell(`
        Add-Type -Namespace W3 -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);'
        $ids = (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match [regex]::Escape('${path.basename(profile)}') }).ProcessId
        $n = 0
        foreach ($id in $ids) { $pr = Get-Process -Id $id -ErrorAction SilentlyContinue; if ($pr -and $pr.MainWindowHandle -ne 0) { [W3.U]::ShowWindow($pr.MainWindowHandle, 6) | Out-Null; $n++ } }
        "minimized $n"`),
    kill: () =>
      powershell(`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match [regex]::Escape('${path.basename(profile)}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; "killed"`),
  };
}

// ---- Player (Playwright headless Chromium: the real liveshare-dev player page) -----------------
function playerProbe() {
  const W = () => performance.timeOrigin + performance.now();
  window.__ev = [];
  const ev = (type, d = {}) => window.__ev.push({ type, t: W(), ...d });
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = function (...a) {
    const pc = new PC(...a);
    pc.addEventListener('datachannel', (e) => {
      window.__dc = e.channel;
      let expect = 0;
      let got = 0;
      let asset = null;
      e.channel.addEventListener('message', (m) => {
        if (typeof m.data === 'string') {
          const msg = JSON.parse(m.data);
          if (msg.type === 'asset-meta') {
            asset = msg.asset.assetId;
            expect = msg.asset.chunkCount;
            got = 0;
          }
          ev('recv', { kind: msg.type, revision: msg.payload && msg.payload.revision });
        } else {
          got += 1;
          if (got === 1) ev('chunk-first', { assetId: asset });
          if (got === expect) ev('chunk-last', { assetId: asset, chunks: got });
        }
      });
    });
    return pc;
  };
  const digest = SubtleCrypto.prototype.digest;
  SubtleCrypto.prototype.digest = function (alg, data) {
    return digest.call(this, alg, data).then((r) => {
      ev('digest', { bytes: data.byteLength });
      return r;
    });
  };
  document.addEventListener('DOMContentLoaded', () => {
    const svg = document.querySelector('[data-testid="player-map"]');
    let rev = null;
    let bg = null;
    new MutationObserver(() => {
      const r = svg.getAttribute('data-revision');
      if (r !== rev) {
        rev = r;
        const name = svg.querySelector('.ls-token-name');
        ev('applied', { revision: Number(r), name: name ? name.textContent : null });
      }
      const img = svg.querySelector('.ls-background-image');
      const id = img && img.getAttribute('data-asset-id');
      if (id && id !== bg) {
        bg = id;
        ev('bg-attached', { assetId: id });
      }
    }).observe(svg, { attributes: true, childList: true, subtree: true });
  });
}

// ---- The tests ---------------------------------------------------------------------------------
async function main() {
  const relay = await startRelay({ port: RELAY_PORT, allowedOrigins: ORIGIN, turnEnv: {} });
  await new Promise((r) => staticServer.listen(STATIC_PORT, r));
  await new Promise((r) => collector.listen(COLLECTOR_PORT, r));
  const browser = await launchBrowser();
  const result = { browser: BROWSER, fault: FAULT || null, quick: QUICK, startedAt: new Date().toISOString(), phases: [], failures: [] };
  let player;
  let playerBrowser;
  try {
    const q = `relay=${encodeURIComponent(RELAY)}&collector=${encodeURIComponent(COLLECTOR)}${FAULT ? `&fault=${FAULT}` : ''}`;
    const pubUrl = (id) => `${ORIGIN}/tests/perf/hidden-host/publisher.html?${q}&id=${id}`;
    // --owner-first (visible baseline where the browser opens handed-over URLs as background tabs,
    // as Firefox did here): the owner starts the browser as its front tab; the others load behind it.
    const ownerFirst = !!opt('owner-first', false);
    if (ownerFirst) browser.open(`${ORIGIN}/tests/perf/hidden-host/owner.html?${q}`);
    // 1. A publisher tab (starts the browser, unless the owner did).
    browser.open(pubUrl('pub1'));
    await waitFor(() => events.find((e) => e.source === 'publisher' && e.type === 'loaded' && e.id === 'pub1'), MANUAL ? 600000 : 60000, 'publisher loaded');
    // A control tab (no WebRTC): it shows what the browser does to an ordinary background tab here.
    // Served from another site (127.0.0.1, not localhost), so it never shares the owner's renderer process.
    browser.open(`http://127.0.0.1:${STATIC_PORT}/tests/perf/hidden-host/control.html?${q}`);
    await waitFor(() => events.find((e) => e.source === 'control' && e.type === 'loaded'), MANUAL ? 600000 : 60000, 'control loaded');
    // 2. The owner tab opens in front of them.
    if (!ownerFirst) browser.open(`${ORIGIN}/tests/perf/hidden-host/owner.html?${q}`);
    const ready = await waitFor(() => ownerEvent((e) => e.type === 'ready'), MANUAL ? 600000 : 60000, 'owner room ready');
    log(`top-level windows: ${await browser.windows()}`);
    result.ownerUserAgent = ready.userAgent;
    log(`owner: ${ready.userAgent}`);

    if (opt('no-player', false)) {
      // Diagnostic: the same tabs, but the owner never gets a WebRTC connection.
      browser.open(pubUrl('pub2'));
      await sleep(15000);
      const last = (src) => [...events].reverse().find((e) => e.source === src && e.visibility);
      const timers = (src) => events.filter((e) => e.source === src && e.type === 'timer-window').slice(-1).map((e) => `${e.medianGapMs}ms`);
      log(`no player: windows ${await browser.windows()}; owner ${last('owner').visibility} ${timers('owner')}; control ${last('control').visibility} ${timers('control')}`);
      fs.mkdirSync(path.join(ROOT, 'perf-results/hidden-host'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'perf-results/hidden-host/no-player-events.json'), JSON.stringify(events.map((e) => ({ s: e.source, id: e.id, type: e.type, v: e.visibility, g: e.medianGapMs, at: Math.round(e.receivedAt - events[0].receivedAt) })), null, 0));
      return;
    }
    playerBrowser = await chromium.launch();
    const ctx = await playerBrowser.newContext();
    await ctx.addInitScript(playerProbe);
    player = await ctx.newPage();
    await player.goto(ready.joinUrl);
    await waitFor(() => ownerEvent((e) => e.type === 'peer-open'), 60000, 'player connected');
    const pev = () => player.evaluate(() => window.__ev);
    const playerSend = (text) => player.evaluate((text) => {
      const t = performance.timeOrigin + performance.now();
      window.__dc.send(JSON.stringify({ v: 0, type: 'hello', text }));
      return t;
    }, text);

    command('prepare', { count: QUICK ? 2 : 4 });
    let prep = await waitFor(() => events.find((e) => e.source === 'publisher' && e.type === 'prepared' && e.id === 'pub1'), STEP_MS, 'publisher prepared assets');
    result.assets = prep.assets;
    log(`assets: ${prep.assets.map((a) => `${(a.bytes / 1048576).toFixed(2)} MiB`).join(', ')}`);

    let seq = 0;
    let assetIndex = 0;
    let pingN = 0;
    const commitOf = (s) => ownerEvent((e) => e.type === 'commit' && e.seq === s);

    async function structured(phase, n) {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const s = ++seq;
        command('publish', { seq: s });
        try {
          const c = await waitFor(() => commitOf(s), STEP_MS, `owner commit of ${s}`);
          const bc = ownerEvent((e) => e.type === 'bc-received' && e.seq === s);
          const applied = await waitFor(async () => (await pev()).find((e) => e.type === 'applied' && e.revision === c.revision), STEP_MS, `player applied rev ${c.revision}`);
          const sent = ownerEvent((e) => e.type === 'snapshot-sent' && e.revision === c.revision);
          const tPost = bc.t - bc.deliveryMs;
          rows.push({ seq: s, bcMs: bc.deliveryMs, commitToSentMs: sent ? Math.round(sent.t - c.t) : null, totalMs: Math.round(applied.t - tPost), nameOk: applied.name === `pub ${s}` });
        } catch (e) {
          result.failures.push(`${phase}: structured ${s}: ${e.message}`);
          rows.push({ seq: s, error: e.message });
        }
        await sleep(1500);
      }
      return rows;
    }

    async function burst(phase) {
      const seqs = [++seq, ++seq, ++seq];
      const before = (await pev()).length;
      const t0 = W();
      command('burst', { seqs });
      try {
        const final = await waitFor(async () => (await pev()).slice(before).find((e) => e.type === 'applied' && e.name === `pub ${seqs[2]}`), STEP_MS, `burst final pub ${seqs[2]}`);
        await sleep(1000);
        const applied = (await pev()).slice(before).filter((e) => e.type === 'applied').map((e) => e.revision);
        const lastCommit = commitOf(seqs[2]);
        const ordered = applied.every((r, i) => i === 0 || r > applied[i - 1]);
        const stillFinal = (await pev()).filter((e) => e.type === 'applied').slice(-1)[0].name === `pub ${seqs[2]}`;
        const ok = ordered && stillFinal && final.revision === lastCommit.revision;
        if (!ok) result.failures.push(`${phase}: burst not latest-wins (${JSON.stringify(applied)})`);
        return { seqs, appliedRevisions: applied, finalRevision: final.revision, expectedRevision: lastCommit.revision, ordered, stillFinal, totalMs: Math.round(final.t - t0) };
      } catch (e) {
        result.failures.push(`${phase}: burst: ${e.message}`);
        return { seqs, error: e.message };
      }
    }

    async function inbound(phase, n) {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const text = `ping-${++pingN}`;
        try {
          const tSend = await playerSend(text);
          const got = await waitFor(() => ownerEvent((e) => e.type === 'player-hello' && e.text === text), STEP_MS, `owner got ${text}`);
          rows.push({ text, ms: Math.round(got.t - tSend) });
        } catch (e) {
          result.failures.push(`${phase}: inbound ${text}: ${e.message}`);
          rows.push({ text, error: e.message });
        }
        await sleep(700);
      }
      return rows;
    }

    async function asset(phase) {
      const s = ++seq;
      const index = assetIndex++ % prep.assets.length;
      const id = prep.assets[index].assetId;
      const evBefore = events.length;
      const pBefore = (await pev()).length;
      command('publishAsset', { seq: s, index });
      const out = { seq: s, bytes: prep.assets[index].bytes };
      try {
        const c = await waitFor(() => commitOf(s), STEP_MS, `owner commit of asset ${s}`);
        const bc = ownerEvent((e) => e.type === 'bc-received' && e.seq === s);
        Object.assign(out, { bcDeliveryMs: bc.deliveryMs, ownerHashMs: bc.hashMs, hashOk: bc.hashOk });
        const first = await waitFor(() => events.slice(evBefore).find((e) => e.source === 'owner' && e.type === 'chunks-first' && e.assetId === id), STEP_MS, 'owner first chunk');
        // D: a newer structured publication while the background is in flight.
        const sd = ++seq;
        command('publish', { seq: sd });
        const cd = await waitFor(() => commitOf(sd), STEP_MS, `owner commit of ${sd}`);
        const bcd = ownerEvent((e) => e.type === 'bc-received' && e.seq === sd);
        const appliedD = await waitFor(async () => (await pev()).slice(pBefore).find((e) => e.type === 'applied' && e.revision === cd.revision), STEP_MS, 'player applied D');
        const last = await waitFor(() => events.slice(evBefore).find((e) => e.source === 'owner' && e.type === 'chunks-last' && e.assetId === id), STEP_MS, 'owner last chunk');
        const pLast = await waitFor(async () => (await pev()).slice(pBefore).find((e) => e.type === 'chunk-last' && e.assetId === id), STEP_MS, 'player last chunk');
        const attached = await waitFor(async () => (await pev()).slice(pBefore).find((e) => e.type === 'bg-attached' && e.assetId === id), STEP_MS, 'player shows the background');
        const req = events.slice(evBefore).find((e) => e.source === 'owner' && e.type === 'asset-request');
        const timers = events.slice(evBefore).filter((e) => e.source === 'owner' && e.type === 'sender-timer' && e.who === 'asset');
        const tPostD = bcd.t - bcd.deliveryMs;
        Object.assign(out, {
          commitToRequestMs: req ? Math.round(req.t - c.t) : null,
          requestToFirstChunkMs: req ? Math.round(first.t - req.t) : null,
          ownerSendMs: last.ms,
          transferToPlayerMs: req ? Math.round(pLast.t - req.t) : null,
          playerVerifyAndShowMs: Math.round(attached.t - pLast.t),
          saveToVisibleMs: Math.round(attached.t - (bc.t - bc.deliveryMs)),
          chunks: last.chunks,
          drainEvents: last.drainEvents,
          assetFallbackTimers: timers.length,
          assetFallbackTimerMaxMs: timers.length ? Math.max(...timers.map((x) => x.actualMs)) : null,
          d: {
            totalMs: Math.round(appliedD.t - tPostD),
            transferInFlightAtPublish: bcd.transferInFlight,
            appliedBeforeAssetComplete: appliedD.t < pLast.t,
          },
        });
        // Starved = the newer structured state waited for the asset rather than for the sender's own
        // throttle timer: its snapshot left later than the timer that released it, by > 300 ms.
        // (Waiting for the throttle timer, ~1 s in a hidden tab, is timer behavior, reported apart.)
        const sentD = events.slice(evBefore).find((e) => e.source === 'owner' && e.type === 'snapshot-sent' && e.revision === cd.revision);
        const timerD = sentD && [...events.slice(evBefore)].reverse().find((e) => e.source === 'owner' && e.type === 'sender-timer' && e.who === 'snapshot' && e.receivedAt <= sentD.receivedAt + 50 && e.t >= bcd.t);
        out.d.ownerWaitMs = sentD ? Math.round(sentD.t - bcd.t) : null;
        out.d.gatingTimerMs = timerD ? timerD.actualMs : 0;
        out.d.starvationExtraMs = sentD ? Math.round(sentD.t - bcd.t - (timerD ? timerD.actualMs : 0)) : null;
        out.d.snapshotSenderAtEnd = last.snapshotSender;
        if (bcd.transferInFlight && bcd.transferInFlight.sent < bcd.transferInFlight.total && out.d.starvationExtraMs > 300) result.failures.push(`${phase}: structured state starved behind the asset (+${out.d.starvationExtraMs} ms beyond its sender timer)`);
        if (out.d.totalMs > 5000) result.failures.push(`${phase}: structured state during asset took ${out.d.totalMs} ms`);
        if (!bc.hashOk) result.failures.push(`${phase}: asset hash mismatch at the owner`);
      } catch (e) {
        result.failures.push(`${phase}: asset ${s}: ${e.message}`);
        out.error = e.message;
      }
      return out;
    }

    async function phase(name, { structuredN, withAsset }) {
      const startEv = events.length;
      const vis = ownerVisibility();
      const linkState = [...events].reverse().find((e) => e.source === 'owner' && e.type === 'link');
      const controlVis = [...events].reverse().find((e) => e.source === 'control' && e.visibility);
      const p = { name, ownerVisibility: vis, controlVisibility: controlVis ? controlVis.visibility : null, hiddenForS: hiddenAt ? Math.round((Date.now() - hiddenAt) / 1000) : 0, link: linkState || null };
      log(`phase ${name}: owner reports ${vis}, control tab reports ${p.controlVisibility}`);
      p.structured = await structured(name, structuredN);
      p.burst = await burst(name);
      p.inbound = await inbound(name, 5);
      if (withAsset) p.asset = await asset(name);
      p.ownerVisibilityAfter = ownerVisibility();
      p.timerWindows = events.slice(startEv).filter((e) => e.source === 'owner' && e.type === 'timer-window').map((e) => ({ medianGapMs: e.medianGapMs, maxGapMs: e.maxGapMs, count: e.count, visibility: e.visibility }));
      p.controlTimerWindows = events.slice(startEv).filter((e) => e.source === 'control' && e.type === 'timer-window').map((e) => ({ medianGapMs: e.medianGapMs, maxGapMs: e.maxGapMs, count: e.count, visibility: e.visibility }));
      p.snapshotTimers = events.slice(startEv).filter((e) => e.source === 'owner' && e.type === 'sender-timer' && e.who === 'snapshot').map((e) => e.actualMs);
      p.lifecycle = events.slice(startEv).filter((e) => e.source === 'owner' && e.type.startsWith('lifecycle-')).map((e) => `${e.type}:${e.visibility}`);
      // The owner's own report is recorded, not asserted: a browser may keep a WebRTC tab "visible".
      // What must hold is that the tab group really is backgrounded: the control tab says so.
      if (name !== 'visible' && p.controlVisibility !== 'hidden') result.failures.push(`${name}: the control tab was not hidden (${p.controlVisibility}): the owner may not be backgrounded`);
      if (name === 'visible' && vis !== 'visible') result.failures.push(`visible: owner was not visible (${vis})`);
      result.phases.push(p);
      log(`  structured median ${median(p.structured.map((r) => r.totalMs))} ms, inbound median ${median(p.inbound.map((r) => r.ms))} ms${p.asset ? `, asset save→visible ${p.asset.saveToVisibleMs} ms, D ${p.asset.d && p.asset.d.totalMs} ms` : ''}`);
      fs.writeFileSync(outFile, JSON.stringify({ ...result, events: undefined }, null, 2));
    }

    const outDir = path.join(ROOT, 'perf-results/hidden-host');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${BROWSER}${FAULT ? `-${FAULT}` : ''}${QUICK ? '-quick' : ''}${opt('owner-first', false) ? '-visible-baseline' : ''}.json`);
    let hiddenAt = null;

    // Phase 1: owner visible (its tab in front; the first publisher is a background tab).
    await waitFor(() => ownerVisibility() === 'visible', 15000, 'owner visible').catch(() => {});
    await sleep(2000);
    await phase('visible', { structuredN: 5, withAsset: true });
    if (ownerFirst) {
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
      log(`written ${path.relative(ROOT, outFile)} (visible baseline only); failures: ${result.failures.length}`);
      for (const f of result.failures) log(`  FAIL ${f}`);
      return;
    }

    // Phase 2: the DM goes to the publishing page: a second publisher tab opens in front, the first
    // retires. The owner tab is now really hidden.
    browser.open(pubUrl('pub2'));
    await waitFor(() => events.find((e) => e.source === 'publisher' && e.type === 'loaded' && e.id === 'pub2'), MANUAL ? 600000 : 60000, 'second publisher loaded');
    command('retire', {}, 'pub1');
    activePublisher = 'pub2';
    command('prepare', { count: QUICK ? 2 : 4 });
    prep = await waitFor(() => events.find((e) => e.source === 'publisher' && e.type === 'prepared' && e.id === 'pub2'), STEP_MS, 'second publisher prepared assets');
    assetIndex = 0;
    log(`top-level windows: ${await browser.windows()}`);
    hiddenAt = Date.now();
    await waitFor(() => ownerEvent((e) => e.type === 'lifecycle-visibilitychange' && e.visibility === 'hidden'), 15000, 'owner reports hidden').catch(() => {});
    await sleep(3000);
    await phase('hidden-0', { structuredN: 5, withAsset: true });
    if (!QUICK) {
      const until = async (s) => {
        while (Date.now() - hiddenAt < s * 1000) await sleep(1000);
      };
      await until(65);
      await phase('hidden-1min', { structuredN: 5, withAsset: false });
      await until(305);
      await phase('hidden-5min', { structuredN: 10, withAsset: true });
      await until(605);
      await phase('hidden-10min', { structuredN: 5, withAsset: true });
    }
    // Last: the DM minimizes the browser window (every tab of it is backgrounded).
    log(await browser.minimize());
    await sleep(QUICK ? 5000 : 65000);
    await phase(QUICK ? 'minimized-5s' : 'minimized-1min', { structuredN: 5, withAsset: true });
    result.ownerLifecycleAll = ownerEvents((e) => e.type.startsWith('lifecycle-') || e.type === 'peer-close' || e.type === 'peer-failed' || e.type === 'signaling-closed').map((e) => ({ type: e.type, visibility: e.visibility, atS: hiddenAt ? Math.round((e.receivedAt - hiddenAt) / 1000) : null }));
    result.linkStates = ownerEvents((e) => e.type === 'link').map((e) => ({ ...e, source: undefined, t: undefined }));
    result.playerDiag = JSON.parse(await player.getByTestId('diagnostics').textContent());
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    log(`written ${path.relative(ROOT, outFile)}; failures: ${result.failures.length}`);
    for (const f of result.failures) log(`  FAIL ${f}`);
  } finally {
    if (playerBrowser) await playerBrowser.close().catch(() => {});
    await browser.kill();
    await relay.close().catch(() => {});
    staticServer.close();
    collector.close();
    setTimeout(() => process.exit(result.failures.length ? 1 : 0), 500);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
