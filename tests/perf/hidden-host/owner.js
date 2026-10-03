// TEST ONLY (Live Share Milestone 5A.1 spike): the future session owner, in its smallest form.
//
// It uses the real production modules (HostSession → SignalingClient + PeerLink, SnapshotSender,
// AssetSender, protocol) exactly as js/battlemap-live-share.js does, but takes its publications from
// another tab (publisher.js) over BroadcastChannel instead of from the Battle Map seam. Everything it
// observes is reported to the spike's local collector over HTTP; nothing is shown to players that the
// real protocol wouldn't send.
//
// Query: ?relay=ws://localhost:PORT&collector=http://localhost:PORT[&fault=...]
// Faults (mutation checks only): no-bc | no-flush | stall-assets | starve | close-dc
import { HostSession } from '/js/modules/live-share/host-session.js';
import { createSnapshotSender } from '/js/modules/live-share/snapshot-sender.js';
import { createAssetSender } from '/js/modules/live-share/asset-sender.js';
import { parseChannelMessage, PROTOCOL_VERSION } from '/js/modules/live-share/protocol.js';
import { buildJoinUrl } from '/js/modules/live-share/room-id.js';

const params = new URLSearchParams(location.search);
const relayUrl = params.get('relay');
const collector = params.get('collector');
const fault = params.get('fault') || '';
const W = () => performance.timeOrigin + performance.now();

function report(type, data = {}) {
  const body = JSON.stringify({ source: 'owner', type, t: W(), visibility: document.visibilityState, ...data });
  fetch(`${collector}/event`, { method: 'POST', body, keepalive: body.length < 60000 }).catch(() => {});
}

// ---- Lifecycle and timers -------------------------------------------------------------------
for (const type of ['visibilitychange', 'freeze', 'resume', 'pagehide', 'pageshow']) {
  document.addEventListener(type, () => report(`lifecycle-${type}`, { hidden: document.hidden }), { capture: true });
  window.addEventListener(type, () => report(`lifecycle-${type}`, { hidden: document.hidden, on: 'window' }), { capture: true });
}
// A plain 100 ms interval: how this page's timers really run, summarised every ~10 s of wall time.
{
  let last = W();
  let windowStart = last;
  let gaps = [];
  setInterval(() => {
    const now = W();
    gaps.push(now - last);
    last = now;
    if (now - windowStart >= 10000) {
      const s = [...gaps].sort((a, b) => a - b);
      report('timer-window', { count: s.length, medianGapMs: Math.round(s[Math.floor(s.length / 2)]), maxGapMs: Math.round(s[s.length - 1]), windowMs: Math.round(now - windowStart) });
      gaps = [];
      windowStart = now;
    }
  }, 100);
}
// The senders' own timers, through their setTimer option: requested vs actual delay.
const timed = (who) => (fn, ms) => {
  const at = W();
  return setTimeout(() => {
    report('sender-timer', { who, requestedMs: ms, actualMs: Math.round(W() - at) });
    fn();
  }, ms);
};

// ---- The publication the owner currently holds (latest wins) -------------------------------
let current = null; // player-safe snapshot content, without revision
let revision = 0;
const assets = new Map(); // assetId -> { assetId, kind, mime, width, height, bytes }
let transfer = null; // { assetId, total, sent, startedAt }
let heldForStarve = false;

const sender = createSnapshotSender({
  getSnapshot: () => (current && fault !== 'no-flush' ? { ...current, revision } : current ? { ...current, revision: 1 } : null),
  setTimer: timed('snapshot'),
});
const assetSender = createAssetSender({
  protocolVersion: PROTOCOL_VERSION,
  getAsset: (id) => assets.get(id) || null,
  hasAsset: (id) => assets.has(id),
  setTimer: timed('asset'),
});

function commit(seq, kind) {
  revision += 1;
  report('commit', { seq, revision, kind });
  if (fault === 'starve' && transfer && transfer.sent < transfer.total) {
    heldForStarve = true; // mutation: hold structured sends until the asset finishes
    return;
  }
  sender.notifyChanged();
}

const channel = new BroadcastChannel('dmtoolbox.live-share.spike');
channel.onmessage = async (e) => {
  const msg = e.data;
  if (fault === 'no-bc') return;
  const tRecv = W();
  if (msg.type === 'publish') {
    report('bc-received', { seq: msg.seq, kind: 'structured', deliveryMs: Math.round(tRecv - msg.tPost), transferInFlight: transfer ? { sent: transfer.sent, total: transfer.total } : null });
    current = msg.content;
    commit(msg.seq, 'structured');
  } else if (msg.type === 'publish-asset') {
    const bytes = new Uint8Array(msg.asset.bytes);
    const tHash = W();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const id = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
    const hashMs = Math.round(W() - tHash);
    const ok = id === msg.content.background.assetId;
    report('bc-received', { seq: msg.seq, kind: 'asset', bytes: bytes.length, deliveryMs: Math.round(tRecv - msg.tPost), hashMs, hashOk: ok });
    if (!ok) return;
    for (const old of assets.keys()) assets.delete(old); // only the current publication's asset is held
    assets.set(id, { assetId: id, kind: 'background', mime: msg.asset.mime, width: msg.asset.width, height: msg.asset.height, bytes });
    current = msg.content;
    commit(msg.seq, 'asset');
    assetSender.assetsChanged();
  }
};

// ---- The room -------------------------------------------------------------------------------
const session = new HostSession({ relayUrl });
session.on('state', ({ state }) => report('signaling', { state }));
session.on('closed', ({ error }) => report('signaling-closed', { error: error ? String(error.message || error) : null }));
session.on('peer-link', ({ peerId, link }) => {
  let lastDiag = '';
  link.on('diagnostics', ({ snapshot }) => {
    const d = { connectionState: snapshot.connectionState, iceConnectionState: snapshot.iceConnectionState, dataChannelState: snapshot.dataChannelState, local: snapshot.localCandidateType, remote: snapshot.remoteCandidateType };
    const key = JSON.stringify(d);
    if (key !== lastDiag) {
      lastDiag = key;
      report('link', d);
    }
  });
  let drains = 0;
  link.on('drain', () => {
    drains += 1;
  });
  // Observe what actually leaves on the channel (the senders call link.send).
  const send = link.send.bind(link);
  link.send = (data) => {
    if (typeof data === 'string') {
      let m = null;
      try {
        m = JSON.parse(data);
      } catch {}
      if (m && m.type === 'battlemap-snapshot') report('snapshot-sent', { revision: m.payload.revision, bytes: data.length });
      if (m && m.type === 'asset-meta') {
        transfer = { assetId: m.asset.assetId, total: m.asset.chunkCount, sent: 0, startedAt: W(), drains0: drains };
        report('asset-meta-sent', { assetId: m.asset.assetId, chunks: m.asset.chunkCount });
      }
    } else if (transfer) {
      transfer.sent += 1;
      if (transfer.sent === 1) report('chunks-first', { assetId: transfer.assetId });
      if (transfer.sent === transfer.total) {
        report('chunks-last', { assetId: transfer.assetId, chunks: transfer.total, ms: Math.round(W() - transfer.startedAt), drainEvents: drains - transfer.drains0, snapshotSender: sender.diagnostics(), assetSender: assetSender.diagnostics() });
        if (heldForStarve) {
          heldForStarve = false;
          setTimeout(() => sender.notifyChanged(), 1000); // as if queued behind another second of chunks
        }
      }
    }
    return send(data);
  };
  link.on('message', ({ data }) => {
    const parsed = parseChannelMessage(data);
    if (!parsed.ok) return report('player-bad-message', { error: parsed.error });
    if (parsed.message.type === 'asset-request') {
      report('asset-request', { ids: parsed.message.assetIds.length });
      if (fault !== 'stall-assets') assetSender.request(peerId, parsed.message.assetIds);
    } else if (parsed.message.type === 'hello') {
      report('player-hello', { text: parsed.message.text });
    }
  });
  link.on('open', () => {
    assetSender.addPeer(peerId, link);
    sender.addPeer(peerId, link);
    report('peer-open');
    if (fault === 'close-dc') setTimeout(() => link.close && link.close(), 15000);
  });
  link.on('failed', (f) => report('peer-failed', { kind: f.kind, message: f.message }));
  link.on('close', () => report('peer-close'));
});
session.on('ready', () => {
  const page = new URL('/liveshare-dev', location.origin);
  page.searchParams.set('relay', relayUrl);
  report('ready', { joinUrl: buildJoinUrl(page.href, session.roomId), userAgent: navigator.userAgent });
});
session.start();
report('loaded', { userAgent: navigator.userAgent });
document.getElementById('state').textContent = `relay ${relayUrl}${fault ? `, fault ${fault}` : ''}`;
