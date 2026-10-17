/**
 * Live Share session host page (live-share.html), Milestones 5A.2-5C.
 *
 * This tab owns the Live Share session: the room on the relay, the signaling socket, one PeerLink
 * (RTCPeerConnection + data channel) per player, the snapshot and asset senders, and the session's
 * lifetime (docs/live-share-session-host-architecture.md §5). Toolbox pages that share something (the
 * Battle Map now, the Initiative Tracker later) publish to it from their own tabs.
 *
 * What it is, and is not:
 *   - Ownership: one session host per browser profile, an exclusive Web Lock (session-host-lock.js).
 *     A second host page says Live Share is already open in another tab and starts nothing. Without
 *     Web Locks the page fails closed and cannot host.
 *   - Generic session machinery only: HostSession / SignalingClient / PeerLink / ICE + TURN. Players
 *     connect with the player page (liveshare-dev.html) and speak protocol v1 (protocol-v1.js).
 *   - Surface publications (5A.3): Toolbox pages publish player-safe state to this page over the
 *     surface boundary (session-host-boundary.js, BroadcastChannel). The host publication store
 *     (publication-store.js) keeps each surface's committed publication and its assets, assigns the
 *     revisions players see, and serves players from there. A commit is sent from the commit event
 *     itself (outcome B of the 5A.1 hidden-tab spike). The Battle Map is the only surface players can
 *     be sent. Since 5A.4 the Battle Map publishes its saved map here (js/battlemap-live-share.js); it
 *     owns no room or connection of its own. This page knows only what the boundary tells it (which
 *     tabs are open, which one publishes, what was committed), never the Battle Map's own state.
 *   - Admission (5B.2): the session's players (session-players.js) own one admission model per session
 *     and every open player link. A link that opens is unadmitted and gets only the admission state;
 *     the map and its assets go only to admitted players, through the admission gate.
 *   - The DM's controls (5C): the session status, the join link, the seats, the password, the lock
 *     and what is shared, in plain words. Every control calls the session players (the admission
 *     model decides); the page only shows the model's state. The seat cards are updated in place, not
 *     rebuilt, so a rename being typed, a focused button or an open confirmation survive the frequent
 *     updates. Destructive actions (kick, reset or disable a claimed seat, End Session) ask first.
 *   - Leaving the page: while a session is live, closing, reloading or navigating away asks the
 *     browser's standard "leave this page?" question (beforeunload), since that would end the session.
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
import { MAX_SEATS, MAX_SEAT_NAME, MAX_PASSWORD_LENGTH } from './modules/live-share/admission.js';
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
// The Battle Map tab this page opens or focuses (Open Battle Map).
const BATTLE_MAP_WINDOW = 'dmtoolbox-battlemap';

// States, counts and revisions only: no room id or link, no password, no seat names, no IP
// addresses, no content.
const diag = { owner: 'claiming', hostState: 'idle', leaveWarning: false, signaling: 'idle', signalingError: null, turn: null, peers: {}, connections: [], players: null, snapshots: null, assets: null, boundary: null, lastTeardown: null };
const peers = new Map(); // peerId -> connection status text (every player on the relay; diagnostics only)
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
const isLive = () => !!(players && !players.ended && hostState === 'live');

function renderDiagnostics() {
  diag.owner = ownership;
  const { snapshots = null, assets = null, ...rest } = players ? players.diagnostics() : {};
  diag.snapshots = snapshots;
  diag.assets = assets;
  diag.players = players ? rest : null;
  diag.boundary = boundary ? boundary.diagnostics() : null;
  diag.connections = [...peers.values()];
  $('ls-diag').textContent = JSON.stringify(diag, null, 2);
  renderSharing();
}

// ---- Session status ---------------------------------------------------------------------------
// idle | starting | live | ended | failed (never opened) | lost (stopped after it was live). The
// short label is the status; the detail says what it means for the DM. Technical detail goes only
// to the troubleshooting section.
let hostState = 'idle';
const KEEP_OPEN = 'Keep this tab open while you play: closing or reloading it ends the session for everyone.';
const HOST_STATES = {
  idle: ['Not running', `Start a session when you're ready, then add a seat for each player and send them the join link. ${KEEP_OPEN}`],
  starting: ['Starting…', 'Opening your room…'],
  live: ['Live', `Players can join with the join link. ${KEEP_OPEN}`],
  ended: ['Session ended', 'Players were disconnected, and the seats, password and join link were discarded. Your Battle Map is unchanged. You can start a new session.'],
  failed: ['Could not start Live Share', ''],
  lost: ['Connection problem', 'Live Share lost its connection to the Live Share server, so the session stopped and players were disconnected. Your Battle Map is unchanged. Start a new session to continue.'],
};
const START_FAILED = {
  unreachable: "Couldn't reach the Live Share server. Check your internet connection and try again.",
  timeout: "Couldn't reach the Live Share server. Check your internet connection and try again.",
  'no-relay': "Live Share isn't set up on this site yet.",
  'no-webrtc': "This browser can't run Live Share: it doesn't support WebRTC. Use a current Chrome, Edge, Firefox or Safari.",
};
const START_FAILED_OTHER = 'Something went wrong while opening the room. Try again; if it keeps happening, copy the troubleshooting details below into a bug report.';
function setHostState(state, detail = HOST_STATES[state][1]) {
  hostState = state;
  diag.hostState = state;
  $('ls-host-status').textContent = HOST_STATES[state][0];
  $('ls-host-status').dataset.state = state;
  $('ls-session-card').dataset.state = state;
  $('ls-host-detail').textContent = detail;
  updateLeaveWarning();
  renderControls();
}
const setProblem = (text) => {
  $('ls-host-problem').textContent = text;
};

// While a session is live, leaving this page would end it: the browser asks first (its own standard
// dialog; a custom message is ignored by modern browsers). Not before a session, not once it ended,
// and never in a tab that doesn't own the session.
let leaveWarning = false;
function warnBeforeLeaving(e) {
  e.preventDefault();
  e.returnValue = ''; // older browsers need it set
}
function updateLeaveWarning() {
  const armed = ownership === 'owner' && hostState === 'live' && !ending;
  if (armed === leaveWarning) return;
  leaveWarning = armed;
  diag.leaveWarning = armed;
  if (armed) window.addEventListener('beforeunload', warnBeforeLeaving);
  else window.removeEventListener('beforeunload', warnBeforeLeaving);
}

// What is shown and enabled follows the session state.
function renderControls() {
  const owner = ownership === 'owner';
  const live = isLive();
  $('ls-host-ui').classList.toggle('d-none', !owner);
  const start = $('ls-start');
  start.disabled = !owner || hostState === 'starting' || hostState === 'live';
  start.classList.toggle('d-none', hostState === 'live');
  start.textContent = hostState === 'starting' ? 'Starting…' : hostState === 'idle' ? 'Start Session' : 'Start New Session';
  $('ls-end').classList.toggle('d-none', !live);
  $('ls-end').disabled = !live;
  $('ls-link-box').classList.toggle('d-none', !live);
  $('ls-copy').disabled = $('ls-reveal').disabled = !live;
  if (!live) {
    showLink(false);
    $('ls-copy-status').textContent = '';
    closePasswordEditor();
    if ($('ls-confirm').open && confirmation && confirmation.needsSession) $('ls-confirm').close();
  }
  $('ls-players-card').classList.toggle('d-none', !live);
  $('ls-access-card').classList.toggle('d-none', !live);
  renderSeats();
  renderAccess();
  renderCounts();
  renderSharing();
}

// ---- Join link ----------------------------------------------------------------------------------
// The link is the invitation (planning doc §10): hidden by default, shown only on request, copied
// without showing it. It never carries the password.
function showLink(show) {
  $('ls-link').classList.toggle('d-none', !show);
  $('ls-reveal').setAttribute('aria-expanded', String(show));
  $('ls-reveal').textContent = show ? 'Hide Join Link' : 'Show Join Link';
}
let copyTimer = null;
function copyStatus(text) {
  clearTimeout(copyTimer);
  $('ls-copy-status').textContent = text;
  if (text) copyTimer = setTimeout(() => ($('ls-copy-status').textContent = ''), 4000);
}
async function copyLink() {
  if (!isLive() || !joinUrl) return;
  try {
    await navigator.clipboard.writeText(joinUrl);
    copyStatus('Join link copied.');
  } catch {
    // No clipboard access: show the link, selected, to copy by hand.
    showLink(true);
    const selection = window.getSelection();
    selection.selectAllChildren($('ls-link'));
    copyStatus("Couldn't copy automatically. The link is selected below: press Ctrl+C (⌘C on a Mac) to copy it.");
  }
}

// ---- Players and seats ------------------------------------------------------------------------
// Seat states in the DM's words (admission.js seatState()).
const SEAT_STATUS = {
  available: ['Available', ''],
  claimed: ['Joined', ''],
  'claimed-disconnected': ['Disconnected — seat reserved', 'Reset this seat if the player needs to join again (for example after reloading their page). Live Share does not reconnect players by itself yet.'],
  disabled: ['Disabled', "Players can't choose this seat."],
};
// A seat card's buttons, in one fixed order that never changes: a live update never puts a different
// action under the DM's pointer. The two every state has come first (Rename, and Enable / Disable,
// one button whose label follows the state); the ones only a claimed seat has come last, so hiding
// them moves nothing. Reset Seat is highlighted, not moved, on a reserved seat.
const SEAT_BUTTONS = ['rename', 'toggle', 'reset', 'kick'];
const ACTION_TEXT = { rename: 'Rename', kick: 'Kick', reset: 'Reset Seat', enable: 'Enable', disable: 'Disable' };
const shownIn = { rename: () => true, toggle: () => true, reset: (s) => s === 'claimed' || s === 'claimed-disconnected', kick: (s) => s === 'claimed' };
const actionOf = (button, state) => (button === 'toggle' ? (state === 'disabled' ? 'enable' : 'disable') : button);
const seatRows = new Map(); // seatId -> the seat's card (created once, updated in place)

function nextSeatName(seats) {
  const names = new Set(seats.map((s) => s.name));
  let n = 1;
  while (names.has(`Player ${n}`)) n += 1;
  return `Player ${n}`;
}

function createSeatRow(seatId) {
  const li = document.createElement('li');
  li.className = 'list-group-item ls-seat';
  li.dataset.testid = 'seat';
  li.dataset.seatId = seatId;
  const top = document.createElement('div');
  top.className = 'd-flex flex-wrap align-items-center gap-2';
  const label = document.createElement('div');
  label.className = 'me-auto';
  label.style.minWidth = '0';
  const name = document.createElement('span');
  name.className = 'ls-seat-name';
  name.dataset.testid = 'seat-label';
  const status = document.createElement('span');
  status.className = 'ls-seat-state small ms-2';
  status.dataset.testid = 'seat-state';
  label.append(name, status);
  // The buttons have their own left-aligned row (under the name, above the hint): a button shown or
  // hidden at the end of it, or a hint appearing, moves none of the others.
  const actions = document.createElement('div');
  actions.className = 'd-flex flex-wrap gap-1 mt-2';
  const buttons = {};
  for (const key of SEAT_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-sm btn-outline-light';
    b.dataset.seatId = seatId;
    b.hidden = true;
    buttons[key] = b;
    actions.append(b);
  }
  top.append(label);
  const hint = document.createElement('p');
  hint.className = 'small text-body-secondary mb-0 mt-1 d-none';
  hint.dataset.testid = 'seat-hint';
  // Rename, in place: Save / Cancel, Enter saves, Escape cancels.
  const edit = document.createElement('form');
  edit.className = 'ls-seat-edit mt-2 d-none';
  edit.noValidate = true;
  const inputId = `ls-rename-${seatId}`;
  edit.innerHTML = `<label class="form-label small mb-1" for="${inputId}">Seat name</label>
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <input id="${inputId}" class="form-control form-control-sm" maxlength="${MAX_SEAT_NAME}" autocomplete="off" data-testid="rename-input" />
      <button type="submit" class="btn btn-sm btn-primary" data-testid="rename-save">Save</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-testid="rename-cancel">Cancel</button>
    </div>
    <p class="small text-danger mb-0 mt-1" role="alert" data-testid="rename-error"></p>`;
  li.append(top, actions, hint, edit);
  const row = { li, name, status, hint, actions, buttons, edit, input: edit.querySelector('input'), error: edit.querySelector('[role="alert"]'), seatName: null, state: null };
  edit.addEventListener('submit', (e) => {
    e.preventDefault();
    saveRename(seatId);
  });
  edit.querySelector('[data-testid="rename-cancel"]').addEventListener('click', () => closeRename(seatId));
  row.input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeRename(seatId);
    }
  });
  seatRows.set(seatId, row);
  return row;
}

function renderSeats() {
  const list = $('ls-seats');
  if (!players || players.ended) {
    for (const row of seatRows.values()) row.li.remove();
    seatRows.clear();
    $('ls-no-seats').classList.add('d-none');
    $('ls-link-warning').classList.add('d-none');
    return;
  }
  const seats = players.seats();
  for (const seat of seats) {
    const row = seatRows.get(seat.id) || createSeatRow(seat.id);
    if (!row.li.isConnected) list.append(row.li);
    if (row.seatName !== seat.name || row.state !== seat.state) {
      const stateChanged = row.state !== seat.state;
      row.seatName = seat.name;
      row.state = seat.state;
      row.name.textContent = seat.name;
      row.li.dataset.state = seat.state;
      const [text, hint] = SEAT_STATUS[seat.state];
      row.status.textContent = text;
      row.hint.textContent = hint;
      row.hint.classList.toggle('d-none', !hint);
      // Shown, hidden and labelled in place: no button moves (only what changed is written).
      const focused = row.actions.contains(document.activeElement) ? document.activeElement : null;
      for (const key of SEAT_BUTTONS) {
        const b = row.buttons[key];
        const action = actionOf(key, seat.state);
        const hidden = !shownIn[key](seat.state);
        const label = `${ACTION_TEXT[action]} ${seat.name}`;
        if (b.hidden !== hidden) b.hidden = hidden;
        if (b.dataset.action !== action) b.dataset.action = action;
        if (b.textContent !== ACTION_TEXT[action]) b.textContent = ACTION_TEXT[action];
        if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
      }
      const resetClass = `btn btn-sm ${seat.state === 'claimed-disconnected' ? 'btn-warning' : 'btn-outline-light'}`;
      if (row.buttons.reset.className !== resetClass) row.buttons.reset.className = resetClass;
      if (stateChanged && focused && focused.hidden) row.buttons.rename.focus(); // a hidden button can't keep focus
    }
  }
  const empty = seats.length === 0;
  $('ls-no-seats').classList.toggle('d-none', !empty);
  $('ls-link-warning').classList.toggle('d-none', !empty);
  $('ls-seat-name').placeholder = nextSeatName(seats);
  const full = seats.length >= MAX_SEATS;
  $('ls-add-seat').disabled = full;
  $('ls-seat-name').disabled = full;
  if (full) $('ls-seat-error').textContent = `A session can have up to ${MAX_SEATS} seats.`;
  else if ($('ls-seat-error').dataset.kind === 'full') $('ls-seat-error').textContent = '';
  $('ls-seat-error').dataset.kind = full ? 'full' : '';
}

// Focus somewhere sensible on a seat's card after an action: its Rename button, always shown.
function focusSeat(seatId) {
  const row = seatRows.get(seatId);
  if (!row) return $('ls-seat-name').focus();
  row.buttons.rename.focus();
}

function openRename(seatId) {
  const row = seatRows.get(seatId);
  if (!row) return;
  row.input.value = row.seatName;
  row.error.textContent = '';
  row.edit.classList.remove('d-none');
  row.input.focus();
  row.input.select();
}
function closeRename(seatId, { focus = true } = {}) {
  const row = seatRows.get(seatId);
  if (!row) return;
  row.edit.classList.add('d-none');
  row.error.textContent = '';
  if (focus) row.buttons.rename.focus();
}
function saveRename(seatId) {
  const row = seatRows.get(seatId);
  if (!row || !isLive()) return;
  try {
    players.renameSeat(seatId, row.input.value); // the model's rules: 1-40 characters, not only spaces
    closeRename(seatId);
  } catch (e) {
    row.error.textContent = e.message === 'bad seat name' ? `A seat name is 1–${MAX_SEAT_NAME} characters (not only spaces).` : "That didn't work. Try again.";
    row.input.focus();
  }
}

// What a seat-changed confirmation tells the DM instead of acting.
const SEAT_CHANGED = 'That seat changed while this confirmation was open. Review it and try again.';

// A seat action. Removing a player (kick, or reset / disable of a claimed seat) asks first. The
// confirmation is about the seat as it was when it opened (its state and who was connected to it); if
// either changed by the time the DM confirms (the player left and someone else took the seat, or it
// was reset meanwhile), nothing is done and the DM is told to look again. A new player is never removed
// by a confirmation that was about the previous one.
function seatAction(action, seatId) {
  if (!isLive()) return;
  const seat = players.seats().find((s) => s.id === seatId);
  if (!seat) return;
  if (action === 'rename') return openRename(seatId);
  const expected = { state: seat.state, peerId: seat.peerId };
  const unchanged = () => {
    const now = players.seats().find((s) => s.id === seatId);
    return !!now && now.state === expected.state && now.peerId === expected.peerId;
  };
  const run = () => {
    if (!isLive()) return;
    try {
      if (action === 'enable') players.enableSeat(seatId);
      else if (action === 'disable') players.disableSeat(seatId);
      else if (action === 'kick') players.kickSeat(seatId);
      else if (action === 'reset') players.resetSeat(seatId);
      $('ls-seat-error').textContent = '';
    } catch {
      $('ls-seat-error').textContent = "That didn't work. Try again.";
    }
  };
  const confirmed = () => {
    if (!isLive()) return;
    if (!unchanged()) {
      $('ls-seat-error').textContent = SEAT_CHANGED;
      return;
    }
    run();
  };
  const ask = (title, body, ok) => askConfirm({ title, body, ok, needsSession: true, onConfirm: confirmed, returnFocus: () => focusSeat(seatId) });
  const joined = seat.state === 'claimed';
  const reserved = seat.state === 'claimed-disconnected';
  if (action === 'kick') {
    return ask(`Kick ${seat.name}?`, "They are disconnected from the session and the seat becomes available. This isn't a ban: they can join again with the join link (lock the room to stop new players joining).", 'Kick');
  }
  if (action === 'reset' && joined) {
    return ask(`Reset ${seat.name}?`, 'The player in this seat is disconnected and the seat becomes available for anyone to join. They can join again normally.', 'Reset Seat');
  }
  if (action === 'disable' && joined) {
    return ask(`Disable ${seat.name}?`, 'The player in this seat is disconnected, and nobody can join this seat until you enable it again.', 'Disable');
  }
  if (action === 'disable' && reserved) {
    return ask(`Disable ${seat.name}?`, 'This seat is reserved for a player who disconnected. Disabling it releases that reservation, and nobody can join this seat until you enable it again.', 'Disable');
  }
  run();
  focusSeat(seatId);
}

function addSeat() {
  if (!isLive()) return;
  const input = $('ls-seat-name');
  const name = input.value === '' ? nextSeatName(players.seats()) : input.value;
  try {
    players.createSeat(name);
    input.value = '';
    $('ls-seat-error').textContent = '';
  } catch (e) {
    $('ls-seat-error').textContent = e.message === 'too many seats' ? `A session can have up to ${MAX_SEATS} seats.` : `A seat name is 1–${MAX_SEAT_NAME} characters (not only spaces).`;
  }
  input.focus();
}

// Joined players, players waiting to join (connected, no seat yet) and reserved seats. A link being
// closed (kicked, reset, disabled) counts as neither.
function renderCounts() {
  const el = $('ls-player-count');
  const live = isLive();
  const counts = live ? players.counts() : { admitted: 0, waiting: 0 };
  const disconnected = live ? players.seats().filter((s) => s.state === 'claimed-disconnected').length : 0;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = [];
  if (counts.admitted) parts.push(plural(counts.admitted, 'player joined', 'players joined'));
  if (counts.waiting) parts.push(`${counts.waiting} waiting to join`);
  if (disconnected) parts.push(plural(disconnected, 'disconnected seat', 'disconnected seats'));
  const text = parts.length ? parts.join(' · ') : 'No players yet';
  if (el.textContent !== text) el.textContent = text;
  el.dataset.admitted = counts.admitted;
  el.dataset.waiting = counts.waiting;
  el.dataset.disconnected = disconnected;
}

// ---- Room access ------------------------------------------------------------------------------
function renderAccess() {
  if (!isLive()) return;
  const { locked, passwordRequired } = players.admissionState();
  const status = $('ls-password-status');
  status.textContent = passwordRequired ? 'Required' : 'Off';
  status.dataset.required = String(passwordRequired);
  $('ls-password-help').textContent = passwordRequired ? '— players need it to join.' : '— anyone with the join link can join an available seat.';
  const set = $('ls-set-password');
  const label = passwordRequired ? 'Change Password' : 'Set Password';
  if (set.textContent !== label) set.textContent = label;
  $('ls-clear-password').classList.toggle('d-none', !passwordRequired);
  const lock = $('ls-lock');
  lock.querySelector('span').textContent = locked ? 'Unlock Room' : 'Lock Room';
  lock.querySelector('i').className = `bi ${locked ? 'bi-unlock' : 'bi-lock'}`;
  const lockStatus = $('ls-lock-status');
  lockStatus.dataset.locked = String(locked);
  lockStatus.textContent = locked ? 'Locked: new players cannot join. Players already in the session stay connected.' : 'New players can join available seats.';
}

// The password editor: hidden by default, typed hidden (Show reveals it while editing), saved
// exactly as typed (1-128 characters; no trimming or case change), then cleared from the page.
function openPasswordEditor() {
  if (!isLive()) return;
  const required = players.admissionState().passwordRequired;
  $('ls-password-label').textContent = required ? 'New password' : 'Password';
  $('ls-password-form').classList.remove('d-none');
  $('ls-set-password').setAttribute('aria-expanded', 'true');
  $('ls-password-error').textContent = '';
  $('ls-password').focus();
}
function closePasswordEditor({ focus = false } = {}) {
  $('ls-password').value = '';
  $('ls-password').type = 'password';
  $('ls-show-password').textContent = 'Show password';
  $('ls-password-error').textContent = '';
  $('ls-password-form').classList.add('d-none');
  $('ls-set-password').setAttribute('aria-expanded', 'false');
  if (focus) $('ls-set-password').focus();
}
function savePassword() {
  if (!isLive()) return;
  const value = $('ls-password').value;
  if (value.length === 0) return passwordError('Enter a password, or press Cancel.');
  if (value.length > MAX_PASSWORD_LENGTH) return passwordError(`A password can be at most ${MAX_PASSWORD_LENGTH} characters.`);
  try {
    players.setPassword(value);
  } catch {
    return passwordError("That didn't work. Try again.");
  }
  closePasswordEditor({ focus: true });
}
function passwordError(text) {
  $('ls-password-error').textContent = text;
  $('ls-password').focus();
}

// ---- Confirmation -------------------------------------------------------------------------------
// One accessible dialog (a native <dialog>: focus stays in it, Escape cancels). Status updates
// behind it don't touch it, so a confirmation is never lost to a rerender.
let confirmation = null; // { onConfirm, returnFocus, needsSession }
function askConfirm({ title, body, ok, onConfirm, returnFocus = () => {}, needsSession = false }) {
  const dialog = $('ls-confirm');
  if (dialog.open) dialog.close();
  $('ls-confirm-title').textContent = title;
  $('ls-confirm-body').textContent = body;
  $('ls-confirm-ok').textContent = ok;
  confirmation = { onConfirm, returnFocus, needsSession };
  dialog.returnValue = '';
  dialog.showModal();
  dialog.querySelector('[data-testid="confirm-cancel"]').focus();
}
$('ls-confirm').addEventListener('close', () => {
  const done = confirmation;
  confirmation = null;
  if (!done) return;
  if ($('ls-confirm').returnValue === 'confirm') done.onConfirm();
  done.returnFocus();
});

// ---- Sharing (surfaces) -----------------------------------------------------------------------
// What players see, from the boundary's registry and the committed publication only.
const SURFACE_NAMES = { 'battle-map': 'Battle Map', initiative: 'Initiative Tracker' };
function describeSurface(s) {
  if (!s.compatible) return 'a different version of the Toolbox: reload that tab';
  if (s.liveness === 'closed') return 'closed';
  if (s.liveness === 'not-responding') return 'not responding';
  return s.active ? 'open, sharing' : 'open in another tab, not sharing';
}
const surfaceRows = new Map(); // instance -> li
function renderSurfaces(surfaces) {
  const list = $('ls-surfaces');
  // Open and not-responding tabs; a closed one only while no tab of its kind is open.
  const shown = surfaces.filter((s) => s.liveness !== 'closed' || !surfaces.some((o) => o.surface === s.surface && o.liveness !== 'closed'));
  const lastClosed = new Set();
  const rows = shown.filter((s) => {
    if (s.liveness !== 'closed') return true;
    if (lastClosed.has(s.surface)) return false; // newest first: keep the most recent closed one
    lastClosed.add(s.surface);
    return true;
  });
  const keep = new Set(rows.map((s) => s.instance));
  for (const [instance, li] of surfaceRows) {
    if (!keep.has(instance)) {
      li.remove();
      surfaceRows.delete(instance);
    }
  }
  if (rows.length === 0) {
    if (list.dataset.empty !== 'true') {
      list.replaceChildren(item('No Battle Map tab is open.'));
      list.dataset.empty = 'true';
    }
    return;
  }
  if (list.dataset.empty === 'true') {
    list.replaceChildren();
    list.dataset.empty = 'false';
  }
  let previous = null;
  for (const s of rows) {
    let li = surfaceRows.get(s.instance);
    if (!li) {
      li = item('');
      li.dataset.testid = 'surface';
      surfaceRows.set(s.instance, li);
    }
    const text = `${SURFACE_NAMES[s.surface] || s.surface}: ${describeSurface(s)}`;
    if (li.textContent !== text) li.textContent = text;
    li.dataset.surface = s.surface;
    li.dataset.state = s.compatible ? (s.active ? 'active' : 'inactive') : 'incompatible';
    li.dataset.liveness = s.liveness;
    if (previous && previous.nextSibling !== li) previous.after(li);
    else if (!previous && list.firstChild !== li) list.prepend(li);
    previous = li;
  }
}
function renderSharing() {
  const surfaces = boundary ? boundary.surfaces() : [];
  renderSurfaces(surfaces);
  const maps = surfaces.filter((s) => s.surface === BATTLE_MAP_SURFACE);
  const open = maps.filter((s) => s.liveness === 'open');
  const active = open.find((s) => s.active && s.compatible);
  const committed = !!store.snapshot(BATTLE_MAP_SURFACE);
  let state;
  let text;
  if (!isLive()) {
    state = 'not-running';
    text = open.length ? 'The Battle Map is open. Players will see its last saved map once the session starts.' : 'Open the Battle Map and save your map: players see it once the session starts.';
  } else if (committed && active) {
    state = 'sharing';
    text = open.length > 1 ? `Sharing your saved Battle Map from one of ${open.length} open Battle Map tabs ("Publish from this tab" on the Battle Map picks which).` : 'Sharing your saved Battle Map with players.';
  } else if (committed) {
    state = maps.some((s) => s.liveness === 'not-responding') && !open.length ? 'not-responding' : 'closed';
    text = state === 'not-responding' ? "The Battle Map tab isn't responding. Players still see the last map you shared." : 'The Battle Map is closed. Players still see the last map you shared.';
  } else if (open.length && !open.some((s) => s.compatible)) {
    state = 'incompatible';
    text = 'The Battle Map tab is a different version of the Toolbox. Reload it to share your map.';
  } else if (active && active.hasPublication) {
    state = 'preparing';
    text = 'Preparing your saved Battle Map for players…';
  } else if (active) {
    state = 'nothing-saved';
    text = 'The Battle Map has no saved map yet. Save your map there to share it.';
  } else {
    state = 'none';
    text = 'No Battle Map shared yet. Open the Battle Map and save your map to share it.';
  }
  const el = $('ls-share-status');
  el.dataset.state = state;
  if (el.textContent !== text) el.textContent = text;
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

// Opens the Battle Map in its own tab, or focuses the one this page opened before. An open Battle
// Map is never reloaded (that would lose unsaved edits); this tab never navigates away.
// A Battle Map the DM opened some other way can't be reached by name: the browser hands back a new
// blank window instead. If the boundary already had an open Battle Map when the button was pressed,
// that blank window is closed rather than made a second Battle Map (two editors of one saved map:
// the last save would win), and the DM is told. The check uses only what was registered before the
// click: a Battle Map this click opens registers later, so it is never mistaken for an existing one.
// Messages go to the button's own note, which the sharing status refresh never rewrites.
const battleMapNote = (text) => {
  $('ls-open-battlemap-note').textContent = text;
};
function openBattleMap() {
  const alreadyOpen = !!boundary && boundary.surfaces().some((s) => s.surface === BATTLE_MAP_SURFACE && s.liveness === 'open');
  const url = new URL(location.pathname.endsWith('.html') ? 'battlemap.html' : 'battlemap', location.href);
  for (const key of ['relay', 'forceRelay', 'iceTimeoutMs']) if (params.has(key)) url.searchParams.set(key, params.get(key));
  const win = window.open('', BATTLE_MAP_WINDOW);
  if (!win) return battleMapNote('Your browser blocked the Battle Map tab. Allow pop-ups and try again.');
  let blank = false;
  try {
    blank = win.location.href === 'about:blank';
  } catch {
    // Not readable: some other page under that name; leave it.
  }
  if (blank && alreadyOpen) {
    win.close();
    return battleMapNote('The Battle Map is already open in another tab.');
  }
  if (blank) win.location.href = url.href;
  battleMapNote('');
  win.focus();
}

// Surfaces may offer only while a room is open; ending the session clears every publication. The
// player count is admitted players: a connection that hasn't joined a seat is not a player.
const reportSession = () =>
  boundary && boundary.setSession({ running: !!(!ending && session && session.active && diag.signaling === 'ready'), players: players && !players.ended ? players.counts().admitted : 0 });
function setPeer(peerId, status) {
  if (!peers.has(peerId)) return;
  peers.set(peerId, status);
  renderCounts();
}

// ---- Ownership --------------------------------------------------------------------------------
function showOwnership(state, takeover = false) {
  ownership = state;
  const box = $('ls-owner');
  box.dataset.state = state;
  box.classList.remove('d-none', 'alert-secondary', 'alert-info', 'alert-warning', 'alert-danger');
  if (state === 'owner') {
    window.name = SESSION_HOST_WINDOW;
    startBoundary(); // only the owner answers surfaces: a waiting tab must not
    box.classList.toggle('d-none', !takeover);
    box.classList.add('alert-info');
    box.textContent = takeover ? 'The other Live Share tab closed, so this tab runs Live Share now. Start a session when you are ready.' : '';
  } else if (state === 'busy') {
    box.classList.add('alert-warning');
    box.textContent =
      'Live Share is already open in another tab of this browser. Switch to that tab to run your session (only one tab can). This tab takes over by itself if you close the other one.';
  } else if (state === 'unsupported') {
    box.classList.add('alert-danger');
    box.textContent = "This browser can't host Live Share: it doesn't support Web Locks, which keep one Live Share tab in charge. Use a current Chrome, Edge, Firefox or Safari.";
  }
  if (hostState === 'idle') setHostState('idle');
  else renderControls();
  updateLeaveWarning();
  renderDiagnostics();
}

// ---- Session ----------------------------------------------------------------------------------
function start() {
  finishEnding('restart'); // a session still waiting for its players to have session-ended goes now
  if (ownership !== 'owner' || (session && session.active)) return;
  if (!relayUrl) return failStart('no-relay', 'No Live Share relay is configured for this site.');
  if (typeof RTCPeerConnection === 'undefined') return failStart('no-webrtc', 'This browser does not support WebRTC.');
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
      renderSeats();
      renderAccess();
      renderCounts();
    },
  });
  session = new HostSession({ relayUrl, linkOptions });
  let opened = false;
  session.on('state', ({ state }) => {
    diag.signaling = state;
    reportSession();
    renderDiagnostics();
  });
  session.on('ready', () => {
    opened = true;
    setProblem('none');
    setHostState('live');
    reportSession(); // surfaces announce themselves again; the active ones offer their state
  });
  session.on('turn', ({ turn }) => {
    diag.turn = turn;
  });
  session.on('peer-joined', ({ peerId }) => {
    // A peer reaching a session that is ending is not counted (its link is still wired below, so it is
    // refused and closed, and counted in linksRefused).
    if (ending) return;
    peers.set(peerId, 'Preparing connection…');
    renderCounts();
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
      if (ending && openLinks.size === 0) finishEnding('players-closed'); // every player closed: session-ended arrived
      if (!link.failure) setPeer(peerId, 'Disconnected');
    });
  });
  session.on('peer-left', ({ peerId }) => {
    if (players) players.detach(peerId);
    peers.delete(peerId);
    delete diag.peers[peerId];
    reportSession();
    renderCounts();
    renderDiagnostics();
  });
  session.on('closed', ({ error }) => {
    // A relay error while an ended session waits for its players changes nothing: it is already over.
    if (!error || ending) return;
    diag.signalingError = error;
    setProblem(`Signaling failure: ${error.message}`);
    if (players) players.end();
    reportSession(); // the session is over: every publication is cleared
    peers.clear();
    if (opened) setHostState('lost');
    else setHostState('failed', START_FAILED[error.code] || START_FAILED_OTHER);
    renderDiagnostics();
  });
  const roomId = session.start();
  joinUrl = buildJoinUrl(playerPageHref(), roomId);
  $('ls-link').textContent = joinUrl;
  setHostState('starting');
  renderDiagnostics();
}
function failStart(code, problem) {
  setProblem(problem);
  setHostState('failed', START_FAILED[code] || START_FAILED_OTHER);
}

// End Session asks first (players are disconnected, the session's seats and link are discarded).
function confirmEnd() {
  if (!isLive()) return;
  askConfirm({
    title: 'End the session?',
    body: 'All players are disconnected, and the seats, password and join link are discarded. Your Battle Map and its saved map are unchanged.',
    ok: 'End Session',
    needsSession: true,
    onConfirm: () => end(),
    returnFocus: () => (isLive() ? $('ls-end') : $('ls-start')).focus(),
  });
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
    if (now) finishEnding('immediate');
    return;
  }
  // Ending first, so nothing reported while the players are told (players.end() reports a change)
  // shows the session as still running.
  ending = { session, timer: setTimeout(() => finishEnding('grace'), CLOSE_GRACE_MS) };
  if (players) players.end();
  if (now || openLinks.size === 0) finishEnding(now ? 'immediate' : 'players-closed');
  peers.clear();
  diag.peers = {};
  reportSession(); // the session is over: every publication is cleared
  setHostState('ended');
  renderDiagnostics();
}

// How an ended session's teardown finished, kept in the diagnostics: 'players-closed' (every player
// link closed, or there were none), 'grace' (CLOSE_GRACE_MS passed), 'immediate' (the page is going
// away) or 'restart' (Start was pressed during the wait).
function finishEnding(via) {
  if (!ending) return;
  clearTimeout(ending.timer);
  const ended = ending.session;
  ending = null;
  openLinks.clear();
  diag.lastTeardown = via;
  ended.end();
  renderDiagnostics();
}

// The player page, in the same form (clean or .html) as this page, keeping the development
// parameters so host and player use the same relay and ICE settings.
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
$('ls-end').addEventListener('click', confirmEnd);
$('ls-reveal').addEventListener('click', () => showLink($('ls-link').classList.contains('d-none')));
$('ls-copy').addEventListener('click', copyLink);
// A double click adds one seat, not two (its second click is ignored); Enter in the name field adds one.
$('ls-add-seat').addEventListener('click', (e) => {
  if (e.detail > 1) e.preventDefault();
});
$('ls-add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  addSeat();
});
$('ls-seats').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (b) seatAction(b.dataset.action, b.dataset.seatId);
});
$('ls-set-password').addEventListener('click', () => ($('ls-password-form').classList.contains('d-none') ? openPasswordEditor() : $('ls-password').focus()));
$('ls-password-form').addEventListener('submit', (e) => {
  e.preventDefault();
  savePassword();
});
$('ls-cancel-password').addEventListener('click', () => closePasswordEditor({ focus: true }));
$('ls-password').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePasswordEditor({ focus: true });
  }
});
$('ls-show-password').addEventListener('click', () => {
  const show = $('ls-password').type === 'password';
  $('ls-password').type = show ? 'text' : 'password';
  $('ls-show-password').textContent = show ? 'Hide password' : 'Show password';
  $('ls-password').focus();
});
$('ls-clear-password').addEventListener('click', () => {
  if (!isLive()) return;
  players.setPassword(null);
  closePasswordEditor();
  $('ls-set-password').focus();
});
$('ls-lock').addEventListener('click', () => isLive() && players.setLocked(!players.admissionState().locked));
$('ls-open-battlemap').addEventListener('click', openBattleMap);
$('ls-copy-diag').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
    $('ls-copy-diag-status').textContent = 'Copied.';
  } catch {
    window.getSelection().selectAllChildren($('ls-diag'));
    $('ls-copy-diag-status').textContent = 'Selected: press Ctrl+C (⌘C) to copy.';
  }
});
// Milestone 5: leaving or reloading this page ends the room (recovery is Milestone 7).
window.addEventListener('pagehide', () => {
  end({ now: true });
  if (boundary) boundary.close(); // surfaces learn Live Share stopped
});
// Counters change with every send; a small refresh keeps the panel current.
setInterval(renderDiagnostics, 1000);

if (!relayUrl) {
  const box = $('ls-config-error');
  box.textContent = "Live Share isn't set up on this site yet: no Live Share server is configured (see relay/README.md).";
  box.classList.remove('d-none');
}
setHostState('idle');
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
