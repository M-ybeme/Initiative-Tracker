/**
 * Live Share session host page (live-share.html), Milestone 5A.2.
 *
 * This tab owns the Live Share session: the room on the relay, the signaling socket, one PeerLink
 * (RTCPeerConnection + data channel) per player, the snapshot and asset senders, and the session's
 * lifetime (docs/live-share-session-host-architecture.md §5). Toolbox pages that share something (the
 * Battle Map now, the Initiative Tracker later) will publish to it from their own tabs.
 *
 * What 5A.2 is, and is not:
 *   - Ownership: one session host per browser profile, an exclusive Web Lock (session-host-lock.js).
 *     A second host page shows that Live Share is already running and starts nothing. Without Web
 *     Locks the page fails closed and cannot host.
 *   - Generic session machinery only, reused unchanged: HostSession / SignalingClient / PeerLink /
 *     ICE + TURN, SnapshotSender, AssetSender, protocol.js. Players connect with the existing player
 *     page and wire format.
 *   - No surface publications yet: nothing here receives Battle Map state. Until the surface boundary
 *     (5A.3) exists, the senders have nothing to send (no snapshot, no assets), so a connected player
 *     sees no map. When it does, a committed publication will call sender.sendNow() (outcome B of the
 *     5A.1 hidden-tab spike).
 *   - No seats, password, admission, lock/kick/reset (5B / 5C), no recovery: closing or reloading this
 *     page ends the room (Milestone 7 adds host-refresh recovery).
 *   - Transitional: the Milestone 0–4 Battle Map prototype host (battlemap.html?liveshare=1,
 *     js/battlemap-live-share.js) still exists and still shares the map in its own room. It becomes a
 *     thin publisher to this page in 5A.4. The two are separate rooms; don't run both for one table.
 *
 * Development query parameters (carried into the join link, as on the Battle Map prototype):
 *   ?relay=ws://host:port  ?forceRelay=1  ?iceTimeoutMs=20000
 */
import { resolveRelayUrl } from './modules/live-share/config.js';
import { buildJoinUrl } from './modules/live-share/room-id.js';
import { HostSession } from './modules/live-share/host-session.js';
import { createSnapshotSender } from './modules/live-share/snapshot-sender.js';
import { createAssetSender } from './modules/live-share/asset-sender.js';
import { parseChannelMessage, PROTOCOL_VERSION } from './modules/live-share/protocol.js';
import { claimSessionHost } from './modules/live-share/session-host-lock.js';

// The fixed window name surfaces will use to open or focus this page (ADR §5.1).
export const SESSION_HOST_WINDOW = 'dmtoolbox-live-share';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const relayUrl = resolveRelayUrl(location);
const linkOptions = {
  iceTransportPolicy: params.get('forceRelay') === '1' ? 'relay' : 'all',
  connectTimeoutMs: clampInt(params.get('iceTimeoutMs'), 2000, 120000, 20000),
};

// States, counts and revisions only: no room id or link, no IP addresses, no content.
const diag = { owner: 'claiming', signaling: 'idle', signalingError: null, turn: null, peers: {}, snapshots: null, assets: null, lastProtocolError: null };
const peers = new Map(); // peerId -> status text
let ownership = 'claiming'; // claiming | owner | busy | unsupported
let session = null;
let sender = null;
let assetSender = null;
let joinUrl = null;

function renderDiagnostics() {
  diag.owner = ownership;
  diag.snapshots = sender ? sender.diagnostics() : null;
  diag.assets = assetSender ? assetSender.diagnostics() : null;
  $('ls-diag').textContent = JSON.stringify(diag, null, 2);
}
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
  renderPeers();
  // Nothing is published here until the surface boundary exists (5A.3): no snapshot, no assets.
  sender = createSnapshotSender({ getSnapshot: () => null });
  assetSender = createAssetSender({ protocolVersion: PROTOCOL_VERSION, getAsset: () => null, hasAsset: () => false });
  session = new HostSession({ relayUrl, linkOptions });
  session.on('state', ({ state }) => {
    diag.signaling = state;
    renderDiagnostics();
  });
  session.on('ready', () => {
    setStatus('Room open — waiting for players');
    setRunning(true);
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
      setPeer(peerId, 'Connected');
      renderDiagnostics();
    });
    link.on('failed', (failure) => setPeer(peerId, `Connection failure (${failure.kind}): ${failure.message}`));
    link.on('close', () => {
      if (sender) sender.removePeer(peerId);
      if (assetSender) assetSender.removePeer(peerId);
      if (!link.failure) setPeer(peerId, 'Disconnected');
    });
  });
  session.on('peer-left', ({ peerId }) => {
    if (sender) sender.removePeer(peerId);
    if (assetSender) assetSender.removePeer(peerId);
    peers.delete(peerId);
    delete diag.peers[peerId];
    renderPeers();
    renderDiagnostics();
  });
  session.on('closed', ({ error }) => {
    if (!error) return;
    diag.signalingError = error;
    setStatus(`Signaling failure: ${error.message}`);
    disposeSenders();
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
  diag.peers = {};
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
window.addEventListener('pagehide', end);
// Counters change with every send; a small refresh keeps the panel current.
setInterval(renderDiagnostics, 1000);

if (!relayUrl) {
  const box = $('ls-config-error');
  box.textContent = 'No Live Share relay is configured for this site yet (see relay/README.md).';
  box.classList.remove('d-none');
}
renderPeers();
setRunning(false);
claimSessionHost({
  onOwned: ({ takeover }) => showOwnership('owner', takeover),
  onBusy: () => showOwnership('busy'),
  onUnsupported: () => showOwnership('unsupported'),
});
renderDiagnostics();
