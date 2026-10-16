/**
 * Live Share session host page (live-share.html), Milestones 5A.2-5B.2.
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
 *   - Generic session machinery only: HostSession / SignalingClient / PeerLink / ICE + TURN. Players
 *     connect with the player page (liveshare-dev.html) and speak protocol v1 (protocol-v1.js).
 *   - Surface publications (5A.3): Toolbox pages publish player-safe state to this page over the
 *     surface boundary (session-host-boundary.js, BroadcastChannel). The host publication store
 *     (publication-store.js) keeps each surface's committed publication and its assets, assigns the
 *     revisions players see, and serves players from there. A commit is sent from the commit event
 *     itself (outcome B of the 5A.1 hidden-tab spike). The Battle Map is the only surface players can
 *     be sent. Since 5A.4 the Battle Map publishes its saved map here (js/battlemap-live-share.js); it
 *     owns no room or connection of its own.
 *   - Admission (5B.2): the session's players (session-players.js) own one admission model per session
 *     and every open player link. A link that opens is unadmitted and gets only the admission state;
 *     the map and its assets go only to admitted players, through the admission gate. The seat,
 *     password and lock controls below are functional, not the product UI (5B.3).
 *   - No recovery: closing or reloading this page ends the room (Milestone 7 adds host-refresh
 *     recovery).
 *
 * Development query parameters (carried into the join link):
 *   ?relay=ws://host:port  ?forceRelay=1  ?iceTimeoutMs=20000
 */
import { resolveRelayUrl } from './modules/live-share/config.js';
import { buildJoinUrl } from './modules/live-share/room-id.js';
import { HostSession } from './modules/live-share/host-session.js';
import { createSessionPlayers, CLOSE_GRACE_MS } from './modules/live-share/session-players.js';
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
const diag = { owner: 'claiming', signaling: 'idle', signalingError: null, turn: null, peers: {}, players: null, snapshots: null, assets: null, boundary: null };
const peers = new Map(); // peerId -> connection status text (every player on the relay)
// The committed publications players are served from (only the Battle Map has a player validator).
const store = createPublicationStore({ surfaces: [battleMapSurface] });
let boundary = null; // only while this tab owns the session host lock
let ownership = 'claiming'; // claiming | owner | busy | unsupported
let session = null;
let players = null; // the session's players and admission model (one per started session)
const openLinks = new Set(); // this session's player links whose data channel is open
// An ended session whose teardown waits until its players have its session-ended (see end()).
let ending = null; // { session, timer }
let joinUrl = null;

function renderDiagnostics() {
  diag.owner = ownership;
  const { snapshots = null, assets = null, ...rest } = players ? players.diagnostics() : {};
  diag.snapshots = snapshots;
  diag.assets = assets;
  diag.players = players ? rest : null;
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
      if (surface === BATTLE_MAP_SURFACE && players) players.committed();
    },
    onChange: renderDiagnostics,
  });
  boundary.start();
  setInterval(() => boundary.checkLiveness(), 5000);
}
// Surfaces may offer only while a room is open; ending the session clears every publication. The
// player count is admitted players: a connection that hasn't joined a seat is not a player.
const reportSession = () =>
  boundary && boundary.setSession({ running: !!(!ending && session && session.active && diag.signaling === 'ready'), players: players && !players.ended ? players.counts().admitted : 0 });
const setStatus = (text) => {
  $('ls-host-status').textContent = text;
};
function renderPeers() {
  const list = $('ls-peers');
  list.replaceChildren();
  const counts = players && !players.ended ? players.counts() : { admitted: 0, waiting: 0 };
  $('ls-player-count').textContent = `${counts.admitted} joined · ${counts.waiting} connected, not joined`;
  $('ls-player-count').dataset.admitted = counts.admitted;
  $('ls-player-count').dataset.waiting = counts.waiting;
  if (peers.size === 0) {
    list.append(item('No players connected.'));
    return;
  }
  const seatOf = new Map((players && !players.ended ? players.seats() : []).filter((s) => s.peerId).map((s) => [s.peerId, s.name]));
  let n = 0;
  for (const [peerId, status] of peers) {
    const state = players ? players.peerState(peerId) : null;
    const joined = state === 'admitted' ? ` · joined as ${seatOf.get(peerId)}` : state === 'unadmitted' ? ' · not joined' : '';
    const li = item(`Connection ${++n}: ${status}${joined}`);
    li.dataset.testid = 'peer';
    li.dataset.admission = state || 'none';
    list.append(li);
  }
}

// ---- Seats, password, lock (5B.2: functional controls; the product UI is 5B.3) ---------------------
const SEAT_STATE_TEXT = { available: 'available', claimed: 'joined', 'claimed-disconnected': 'disconnected (seat kept)', disabled: 'disabled' };
function renderSeats() {
  const list = $('ls-seats');
  list.replaceChildren();
  const live = !!(players && !players.ended);
  for (const id of ['ls-seat-name', 'ls-add-seat', 'ls-password', 'ls-set-password', 'ls-clear-password', 'ls-lock']) $(id).disabled = !live;
  if (!live) {
    list.append(item('Seats exist while a session runs.'));
    $('ls-password-status').textContent = '';
    return;
  }
  const state = players.admissionState();
  $('ls-lock').checked = state.locked;
  $('ls-password-status').textContent = state.passwordRequired ? 'A password is required to join.' : 'No password.';
  $('ls-password-status').dataset.required = String(state.passwordRequired);
  const seats = players.seats();
  if (seats.length === 0) list.append(item('No seats yet: add one for each player.'));
  for (const seat of seats) {
    const li = item('');
    li.className = 'list-group-item d-flex flex-wrap gap-2 align-items-center';
    li.dataset.testid = 'seat';
    li.dataset.seatId = seat.id;
    li.dataset.state = seat.state;
    const label = document.createElement('span');
    label.className = 'me-auto';
    label.dataset.testid = 'seat-label';
    label.textContent = `${seat.name}: ${SEAT_STATE_TEXT[seat.state]}`;
    li.append(label);
    const button = (action, text, enabled = true) => {
      const b = document.createElement('button');
      b.className = 'btn btn-sm btn-outline-light';
      b.dataset.action = action;
      b.dataset.seatId = seat.id;
      b.textContent = text;
      b.disabled = !enabled;
      li.append(b);
    };
    const claimed = seat.state === 'claimed' || seat.state === 'claimed-disconnected';
    button('rename', 'Rename to the name above');
    button(seat.state === 'disabled' ? 'enable' : 'disable', seat.state === 'disabled' ? 'Enable' : 'Disable');
    button('kick', 'Kick', claimed);
    button('reset', 'Reset', claimed);
    list.append(li);
  }
}
function seatAction(action, seatId) {
  if (!players || players.ended) return;
  const name = $('ls-seat-name').value;
  try {
    if (action === 'rename') players.renameSeat(seatId, name);
    else if (action === 'enable') players.enableSeat(seatId);
    else if (action === 'disable') players.disableSeat(seatId);
    else if (action === 'kick') players.kickSeat(seatId);
    else if (action === 'reset') players.resetSeat(seatId);
    $('ls-seat-error').textContent = '';
  } catch (e) {
    $('ls-seat-error').textContent = e.message === 'bad seat name' ? 'A seat name is 1–40 characters.' : 'That did not work.';
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
  renderSeats();
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
  finishEnding(); // a session still waiting for its players to have session-ended goes now
  if (ownership !== 'owner' || (session && session.active)) return;
  if (!relayUrl) return setStatus('No Live Share relay is configured for this site.');
  if (typeof RTCPeerConnection === 'undefined') return setStatus('This browser does not support WebRTC.');
  $('ls-start').disabled = true;
  diag.signalingError = null;
  diag.peers = {};
  peers.clear();
  openLinks.clear();
  // Admitted players are served the committed Battle Map publication and its assets from the store.
  store.clear();
  players = createSessionPlayers({
    getSnapshot: () => store.snapshot(BATTLE_MAP_SURFACE),
    getAsset: (id) => store.getAsset(BATTLE_MAP_SURFACE, id),
    hasAsset: (id) => store.hasAsset(BATTLE_MAP_SURFACE, id),
    onChange: () => {
      reportSession();
      renderPeers();
      renderSeats();
    },
  });
  renderPeers();
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
    // An open channel is not a player: it is registered unadmitted and sent only the admission
    // state; what it may send and be sent is the session players' (and the admission gate's) business.
    const sessionPlayers = players;
    link.on('open', () => {
      if (players !== sessionPlayers) return link.close(); // a link of an earlier session
      if (sessionPlayers.attach(peerId, link)) {
        openLinks.add(link);
        setPeer(peerId, 'Connected');
      }
      renderDiagnostics();
    });
    link.on('failed', (failure) => setPeer(peerId, `Connection failure (${failure.kind}): ${failure.message}`));
    link.on('close', () => {
      sessionPlayers.detach(peerId); // an admitted player's seat stays claimed-disconnected
      openLinks.delete(link);
      if (ending && openLinks.size === 0) finishEnding(); // every player has closed: session-ended arrived
      if (!link.failure) setPeer(peerId, 'Disconnected');
    });
  });
  session.on('peer-left', ({ peerId }) => {
    if (players) players.detach(peerId);
    peers.delete(peerId);
    delete diag.peers[peerId];
    reportSession();
    renderPeers();
    renderDiagnostics();
  });
  session.on('closed', ({ error }) => {
    if (!error) return;
    diag.signalingError = error;
    setStatus(`Signaling failure: ${error.message}`);
    if (players) players.end();
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

// Ending a session: every open link is sent session-ended ('ended') and the admission model forgets
// every seat, credential and the password, at once; the page shows the session ended at once. The
// connections are torn down (relay first, so players also hear "the host ended the session", then the
// links) only once every player link has closed, which a player does on receiving session-ended, or
// after CLOSE_GRACE_MS for one that doesn't. Closing them in the same call would drop a session-ended
// still queued on the channel, and the relay's "host left" could reach a player first. A page that is
// going away (pagehide) can't wait: { now: true } tears down at once, and players learn it from the relay.
function end({ now = false } = {}) {
  if (!session || !session.active || ending) {
    if (now) finishEnding();
    return;
  }
  if (players) players.end();
  ending = { session, timer: setTimeout(finishEnding, CLOSE_GRACE_MS) };
  if (now || openLinks.size === 0) finishEnding();
  peers.clear();
  diag.peers = {};
  reportSession(); // the session is over: every publication is cleared
  renderPeers();
  setStatus('Session ended');
  setRunning(false);
  renderDiagnostics();
}

function finishEnding() {
  if (!ending) return;
  clearTimeout(ending.timer);
  const ended = ending.session;
  ending = null;
  openLinks.clear();
  ended.end();
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
$('ls-end').addEventListener('click', () => end());
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
$('ls-add-seat').addEventListener('click', () => {
  if (!players || players.ended) return;
  try {
    players.createSeat($('ls-seat-name').value);
    $('ls-seat-name').value = '';
    $('ls-seat-error').textContent = '';
  } catch (e) {
    $('ls-seat-error').textContent = e.message === 'too many seats' ? 'A session has at most 32 seats.' : 'A seat name is 1–40 characters.';
  }
});
$('ls-seats').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (b) seatAction(b.dataset.action, b.dataset.seatId);
});
$('ls-set-password').addEventListener('click', () => {
  if (!players || players.ended) return;
  try {
    players.setPassword($('ls-password').value);
    $('ls-password').value = '';
    $('ls-seat-error').textContent = '';
  } catch {
    $('ls-seat-error').textContent = 'A password is 1–128 characters.';
  }
});
$('ls-clear-password').addEventListener('click', () => players && !players.ended && players.setPassword(null));
$('ls-lock').addEventListener('change', () => players && !players.ended && players.setLocked($('ls-lock').checked));
$('ls-copy-diag').addEventListener('click', () => navigator.clipboard.writeText(JSON.stringify(diag, null, 2)).catch(() => {}));
// Milestone 5: leaving or reloading this page ends the room (recovery is Milestone 7).
window.addEventListener('pagehide', () => {
  end({ now: true });
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
