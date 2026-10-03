/**
 * Live Share session host page (live-share.html), Milestones 5A.2-5A.4.
 *
 * This tab owns the Live Share session: the room on the relay, the signaling socket, one PeerLink
 * (RTCPeerConnection + data channel) per player, the snapshot and asset senders, and the session's
 * lifetime (docs/live-share-session-host-architecture.md §5). Toolbox pages that share something (the
 * Battle Map now, the Initiative Tracker later) publish to it from their own tabs.
 *
 * What it is, and is not:
 *   - Ownership: one session host per browser profile, an exclusive Web Lock (session-host-lock.js).
 *     A second host page shows that Live Share is already running and starts nothing. Without Web
 *     Locks the page fails closed and cannot host.
 *   - Generic session machinery only, reused unchanged: HostSession / SignalingClient / PeerLink /
 *     ICE + TURN, SnapshotSender, AssetSender, protocol.js. Players connect with the existing player
 *     page and wire format.
 *   - Surface publications (5A.3): Toolbox pages publish player-safe state to this page over the
 *     surface boundary (session-host-boundary.js, BroadcastChannel). The host publication store
 *     (publication-store.js) keeps each surface's committed publication and its assets, assigns the
 *     revisions players see, and serves players from there: the snapshot sender reads the committed
 *     Battle Map snapshot, the asset sender its assets. A commit is sent from the commit event itself
 *     (sender.sendNow(), outcome B of the 5A.1 hidden-tab spike). The player wire format is unchanged,
 *     so the Battle Map is the only surface players can be sent. Since 5A.4 the Battle Map publishes
 *     its saved map here (js/battlemap-live-share.js); it owns no room or connection of its own.
 *   - No seats, password, admission, lock/kick/reset (5B / 5C), no recovery: closing or reloading this
 *     page ends the room (Milestone 7 adds host-refresh recovery).
 *
 * Development query parameters (carried into the join link):
 *   ?relay=ws://host:port  ?forceRelay=1  ?iceTimeoutMs=20000
 */
import { resolveRelayUrl } from './modules/live-share/config.js';
import { buildJoinUrl } from './modules/live-share/room-id.js';
import { HostSession } from './modules/live-share/host-session.js';
import { createSnapshotSender } from './modules/live-share/snapshot-sender.js';
import { createAssetSender } from './modules/live-share/asset-sender.js';
import { parseChannelMessage, PROTOCOL_VERSION } from './modules/live-share/protocol.js';
import { claimSessionHost, SESSION_HOST_WINDOW } from './modules/live-share/session-host-lock.js';
import { createPublicationStore } from './modules/live-share/publication-store.js';
import { createSessionHostBoundary } from './modules/live-share/session-host-boundary.js';
import { battleMapSurface, BATTLE_MAP_SURFACE } from './modules/live-share/battlemap-publication.js';


const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const relayUrl = resolveRelayUrl(location);
const linkOptions = {
  iceTransportPolicy: params.get('forceRelay') === '1' ? 'relay' : 'all',
  connectTimeoutMs: clampInt(params.get('iceTimeoutMs'), 2000, 120000, 20000),
};

// States, counts and revisions only: no room id or link, no IP addresses, no content.
const diag = { owner: 'claiming', signaling: 'idle', signalingError: null, turn: null, peers: {}, snapshots: null, assets: null, boundary: null, lastProtocolError: null };
const peers = new Map(); // peerId -> status text
const openPeers = new Set(); // peers whose data channel is open: the player count surfaces see
// The committed publications players are served from. Only the Battle Map reaches players while the
// player wire format is the Milestone 0-4 one (5B adds per-surface routing).
const store = createPublicationStore({ surfaces: [battleMapSurface] });
let boundary = null; // only while this tab owns the session host lock
let ownership = 'claiming'; // claiming | owner | busy | unsupported
let session = null;
let sender = null;
let assetSender = null;
let joinUrl = null;

function renderDiagnostics() {
  diag.owner = ownership;
  diag.snapshots = sender ? sender.diagnostics() : null;
  diag.assets = assetSender ? assetSender.diagnostics() : null;
  diag.boundary = boundary ? boundary.diagnostics() : null;
  $('ls-diag').textContent = JSON.stringify(diag, null, 2);
  renderSurfaces();
}

// ---- Shared pages (surfaces) ------------------------------------------------------------------
const SURFACE_NAMES = { 'battle-map': 'Battle Map', initiative: 'Initiative Tracker' };
function describeSurface(s) {
  if (!s.compatible) return 'a different version of the Toolbox: reload that tab';
  if (s.liveness === 'closed') return 'closed';
  if (s.liveness === 'not-responding') return 'not responding';
  return s.active ? 'open, publishing' : 'open in another tab (not publishing)';
}
function renderSurfaces() {
  const list = $('ls-surfaces');
  const surfaces = boundary ? boundary.surfaces() : [];
  const stored = diag.boundary ? diag.boundary.store : {};
  list.replaceChildren();
  if (surfaces.length === 0) {
    list.append(item('No Toolbox page is connected to this session.'));
    return;
  }
  for (const s of surfaces) {
    const committed = stored[s.surface] && stored[s.surface].committed;
    const li = item(`${SURFACE_NAMES[s.surface] || s.surface}: ${describeSurface(s)}${s.active && committed ? ` · players see revision ${committed.revision}` : ''}`);
    li.dataset.testid = 'surface';
    li.dataset.surface = s.surface;
    li.dataset.state = s.compatible ? (s.active ? 'active' : 'inactive') : 'incompatible';
    li.dataset.liveness = s.liveness;
    list.append(li);
  }
}
function startBoundary() {
  if (boundary) return;
  boundary = createSessionHostBoundary({
    store,
    supported: { [BATTLE_MAP_SURFACE]: battleMapSurface.versions },
    // A commit is a real event: send it now rather than on a timer a hidden tab may delay. A new
    // background also ends any transfer of the one it replaced.
    onCommitted: (surface) => {
      if (surface !== BATTLE_MAP_SURFACE || !sender) return;
      sender.sendNow();
      assetSender.assetsChanged();
    },
    onChange: renderDiagnostics,
  });
  boundary.start();
  setInterval(() => boundary.checkLiveness(), 5000);
}
// Surfaces may offer only while a room is open; ending the session clears every publication.
const reportSession = () => boundary && boundary.setSession({ running: !!(session && session.active && diag.signaling === 'ready'), players: openPeers.size });
const setStatus = (text) => {
  $('ls-host-status').textContent = text;
};
function renderPeers() {
  const list = $('ls-peers');
  list.replaceChildren();
  if (peers.size === 0) {
    list.append(item('No players connected.'));
    return;
  }
  let n = 0;
  for (const status of peers.values()) {
    const li = item(`Player ${++n}: ${status}`);
    li.dataset.testid = 'peer';
    list.append(li);
  }
}
function setPeer(peerId, status) {
  if (!peers.has(peerId)) return;
  peers.set(peerId, status);
  renderPeers();
}
function setRunning(running) {
  $('ls-start').disabled = running || ownership !== 'owner';
  $('ls-copy').disabled = $('ls-reveal').disabled = $('ls-end').disabled = !running;
  if (!running) $('ls-link').classList.add('d-none');
}

// ---- Ownership --------------------------------------------------------------------------------
function showOwnership(state, takeover = false) {
  ownership = state;
  const box = $('ls-owner');
  box.dataset.state = state;
  box.classList.remove('d-none', 'alert-info', 'alert-warning', 'alert-danger');
  if (state === 'owner') {
    window.name = SESSION_HOST_WINDOW;
    startBoundary(); // only the owner answers surfaces: a waiting tab must not
    box.classList.add('alert-info');
    box.textContent = takeover
      ? 'The other Live Share tab closed: this tab now keeps Live Share running. Start a session when you are ready.'
      : 'This tab keeps Live Share running. Keep it open while you share; closing or reloading it ends the session for everyone.';
  } else if (state === 'busy') {
    box.classList.add('alert-warning');
    box.textContent = 'Live Share is already running in another tab of this browser. Use that tab; this one starts nothing (it takes over only if the other tab closes).';
  } else if (state === 'unsupported') {
    box.classList.add('alert-danger');
    box.textContent = 'This browser cannot host Live Share: it does not support the Web Locks API, which keeps one Live Share tab in charge. Use a current Chrome, Edge, Firefox or Safari.';
  }
  setRunning(!!(session && session.active));
  renderDiagnostics();
}

// ---- Session ----------------------------------------------------------------------------------
function start() {
  if (ownership !== 'owner' || (session && session.active)) return;
  if (!relayUrl) return setStatus('No Live Share relay is configured for this site.');
  if (typeof RTCPeerConnection === 'undefined') return setStatus('This browser does not support WebRTC.');
  $('ls-start').disabled = true;
  diag.signalingError = null;
  diag.peers = {};
  peers.clear();
  openPeers.clear();
  renderPeers();
  // Players are served the committed Battle Map publication and its assets from the host store.
  store.clear();
  sender = createSnapshotSender({ getSnapshot: () => store.snapshot(BATTLE_MAP_SURFACE) });
  assetSender = createAssetSender({
    protocolVersion: PROTOCOL_VERSION,
    getAsset: (id) => store.getAsset(BATTLE_MAP_SURFACE, id),
    hasAsset: (id) => store.hasAsset(BATTLE_MAP_SURFACE, id),
  });
  session = new HostSession({ relayUrl, linkOptions });
  session.on('state', ({ state }) => {
    diag.signaling = state;
    reportSession();
    renderDiagnostics();
  });
  session.on('ready', () => {
    setStatus('Room open — waiting for players');
    setRunning(true);
    reportSession(); // surfaces announce themselves again; the active ones offer their state
  });
  session.on('turn', ({ turn }) => {
    diag.turn = turn;
  });
  session.on('peer-joined', ({ peerId }) => {
    peers.set(peerId, 'Preparing connection…');
    renderPeers();
  });
  session.on('peer-link', ({ peerId, link }) => {
    setPeer(peerId, 'Connecting…');
    link.on('diagnostics', ({ snapshot }) => {
      if (peers.has(peerId)) diag.peers[peerId] = snapshot;
    });
    // Players may send only asset requests (validated; answered from what is published: nothing yet).
    link.on('message', ({ data }) => {
      const parsed = parseChannelMessage(data);
      if (!parsed.ok || parsed.message.type !== 'asset-request') {
        diag.lastProtocolError = parsed.ok ? `unexpected ${parsed.message.type} from a player` : parsed.error;
        return;
      }
      assetSender.request(peerId, parsed.message.assetIds);
    });
    link.on('open', () => {
      assetSender.addPeer(peerId, link);
      sender.addPeer(peerId, link);
      openPeers.add(peerId);
      setPeer(peerId, 'Connected');
      reportSession();
      renderDiagnostics();
    });
    link.on('failed', (failure) => setPeer(peerId, `Connection failure (${failure.kind}): ${failure.message}`));
    link.on('close', () => {
      if (sender) sender.removePeer(peerId);
      if (assetSender) assetSender.removePeer(peerId);
      openPeers.delete(peerId);
      reportSession();
      if (!link.failure) setPeer(peerId, 'Disconnected');
    });
  });
  session.on('peer-left', ({ peerId }) => {
    if (sender) sender.removePeer(peerId);
    if (assetSender) assetSender.removePeer(peerId);
    peers.delete(peerId);
    openPeers.delete(peerId);
    delete diag.peers[peerId];
    reportSession();
    renderPeers();
    renderDiagnostics();
  });
  session.on('closed', ({ error }) => {
    if (!error) return;
    diag.signalingError = error;
    setStatus(`Signaling failure: ${error.message}`);
    disposeSenders();
    openPeers.clear();
    reportSession(); // the session is over: every publication is cleared
    setRunning(false);
    renderDiagnostics();
  });
  const roomId = session.start();
  joinUrl = buildJoinUrl(playerPageHref(), roomId);
  $('ls-link').textContent = joinUrl;
  setStatus('Connecting to relay…');
  renderDiagnostics();
}

function disposeSenders() {
  if (sender) sender.dispose();
  if (assetSender) assetSender.dispose();
}

function end() {
  if (!session || !session.active) return;
  session.end(); // the relay tells every player "the host ended the session", then links close
  disposeSenders();
  peers.clear();
  openPeers.clear();
  diag.peers = {};
  reportSession(); // the session is over: every publication is cleared
  renderPeers();
  setStatus('Session ended');
  setRunning(false);
  renderDiagnostics();
}

// The player page, in the same form (clean or .html) as this page, keeping the development
// parameters so host and player use the same relay and ICE settings. (The product join page is 5B/5C.)
function playerPageHref() {
  const url = new URL(location.pathname.endsWith('.html') ? 'liveshare-dev.html' : 'liveshare-dev', location.href);
  for (const key of ['relay', 'forceRelay', 'iceTimeoutMs']) if (params.has(key)) url.searchParams.set(key, params.get(key));
  return url.href;
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function item(text) {
  const li = document.createElement('li');
  li.className = 'list-group-item';
  li.textContent = text;
  return li;
}

// ---- Wiring -----------------------------------------------------------------------------------
$('ls-start').addEventListener('click', start);
$('ls-end').addEventListener('click', end);
$('ls-reveal').addEventListener('click', () => $('ls-link').classList.toggle('d-none'));
$('ls-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(joinUrl);
    $('ls-copy').textContent = 'Copied';
    setTimeout(() => ($('ls-copy').textContent = 'Copy join link'), 1500);
  } catch {
    $('ls-link').classList.remove('d-none');
  }
});
$('ls-copy-diag').addEventListener('click', () => navigator.clipboard.writeText(JSON.stringify(diag, null, 2)).catch(() => {}));
// Milestone 5: leaving or reloading this page ends the room (recovery is Milestone 7).
window.addEventListener('pagehide', () => {
  end();
  if (boundary) boundary.close(); // surfaces learn Live Share stopped
});
// Counters change with every send; a small refresh keeps the panel current.
setInterval(renderDiagnostics, 1000);

if (!relayUrl) {
  const box = $('ls-config-error');
  box.textContent = 'No Live Share relay is configured for this site yet (see relay/README.md).';
  box.classList.remove('d-none');
}
renderPeers();
setRunning(false);
// Read-only inspection: the committed snapshot players are sent now (player-safe, the current wire
// payload), or null. For diagnostics and the browser tests; it exposes nothing players don't get.
window.LiveShareSessionHost = Object.freeze({
  committedSnapshot: (surface = BATTLE_MAP_SURFACE) => {
    const snapshot = store.snapshot(surface);
    return snapshot ? structuredClone(snapshot) : null;
  },
});
claimSessionHost({
  onOwned: ({ takeover }) => showOwnership('owner', takeover),
  onBusy: () => showOwnership('busy'),
  onUnsupported: () => showOwnership('unsupported'),
});
renderDiagnostics();
