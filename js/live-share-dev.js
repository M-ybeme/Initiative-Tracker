/**
 * Live Share player page (liveshare-dev.html), and the Milestone 0 networking test host.
 *
 * With `#room=...` (a join link from the Live Share page) the page is the player: since 5B.3 the
 * product join flow (see "Player" below). Without it, the page is the Milestone 0 networking test
 * host, a development tool: it creates a room on the relay, and for every player that joins it opens
 * a WebRTC data channel and sends "hello".
 *
 * Milestone 2: the Live Share session page (live-share.html; until 5A.4 the Battle Map itself) shares
 * the Battle Map, and its join links open this page as a player. The player then draws each Battle Map snapshot it
 * receives, read-only, keeping only the newest revision (battlemap-snapshot.js, battlemap-view.js).
 * Milestone 3: it then asks for the assets that snapshot references and it doesn't have yet (the
 * player-visible background, custom token art), fills them in as they arrive, and releases them all
 * when the session ends (asset-cache.js). The structured map never waits for them.
 * Milestone 5B.2: the player speaks protocol v1 (protocol-v1.js). Once connected it is shown the
 * host's admission state (seats, lock, whether a password is needed), joins a seat, and only then is
 * sent the map (surface-snapshot) and may ask for assets. The seat credential the host returns is not
 * kept or stored: there is no automatic reconnect yet (Milestone 7).
 * Milestone 5B.3: the product join screen (seat, password when required, Join Room), its progress
 * and its reason-specific messages; diagnostics move into a collapsed troubleshooting section.
 * Legacy, development only: the Milestone 0 host below still sends a v0 "hello" (the networking
 * harness); the player accepts that one message and nothing else of v0. It goes when that harness moves
 * to the session host.
 *
 * Development query parameters (kept in join links, so host and player agree):
 *   ?relay=ws://host:port   use this relay instead of the default
 *   ?forceRelay=1           ICE may only use TURN relay candidates (debug/test only: normal use
 *                           keeps "all", so direct paths win); with no TURN available the browser
 *                           gathers nothing, which exercises the "WebRTC blocked" diagnostics
 *
 * TURN: before each connection the page fetches short-lived TURN credentials from the relay
 * (ice-config.js). If that fails the connection goes ahead STUN-only, with a notice.
 *   ?iceTimeoutMs=20000     how long a peer may take to connect before it is reported as failed
 */
import { resolveRelayUrl } from './modules/live-share/config.js';
import { buildJoinUrl, readRoomIdFromHash } from './modules/live-share/room-id.js';
import { SignalingClient } from './modules/live-share/signaling-client.js';
import { PeerLink } from './modules/live-share/peer-link.js';
import { HostSession } from './modules/live-share/host-session.js';
import { resolveIceServers } from './modules/live-share/ice-config.js';
import { encodeHello, parseChannelMessage } from './modules/live-share/protocol.js';
import { PROTOCOL_V1, parseHostMessage, encode } from './modules/live-share/protocol-v1.js';
import { encodeAssetRequest } from './modules/live-share/asset-protocol.js';
import { createAssetCache } from './modules/live-share/asset-cache.js';
import { createSnapshotReceiver } from './modules/live-share/battlemap-snapshot.js';
import { renderBattleMapSnapshot, setPlayerView, computeViewBox } from './modules/live-share/battlemap-view.js';
import { createPlayerView } from './modules/live-share/player-view.js';
// Built-in token images by preset id (2.3.30); published as globalThis.BattleMapTokenPresets.
import './modules/battle-map-token-presets.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const relayUrl = resolveRelayUrl(location);
const linkOptions = {
  iceTransportPolicy: params.get('forceRelay') === '1' ? 'relay' : 'all',
  connectTimeoutMs: clampInt(params.get('iceTimeoutMs'), 2000, 120000, 20000),
};

let signaling = null;
// Diagnostics hold states and prototype messages only: never the room id or join link, and
// peer-link.js reports candidate types rather than IP addresses.
const diag = {
  role: null,
  relay: relayUrl ? new URL(relayUrl.replace(/^ws/, 'http')).host : null,
  signaling: 'idle',
  signalingError: null,
  lastProtocolError: null,
  lastSent: null,
  lastReceived: null,
  // TURN availability only ({configured, status, message}); credentials are never kept here.
  turn: null,
  peers: {},
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// Show whether the TURN fallback is available for the connection being prepared.
function showTurn(turn) {
  diag.turn = turn;
  const note = $('ls-turn-note');
  note.textContent = turn.message;
  note.classList.toggle('d-none', turn.status === 'available');
  renderDiagnostics();
}

// Fetch this connection's ICE servers (the host's HostSession does the same for each player).
async function prepareIceServers() {
  const { iceServers, turn } = await resolveIceServers({ relayUrl });
  showTurn(turn);
  return iceServers;
}

function renderDiagnostics() {
  // Includes non-fatal relay problems (ignored frames, messages for a peer that already left).
  if (signaling && signaling.lastError) diag.signalingError = signaling.lastError;
  $('ls-diag').textContent = JSON.stringify(diag, null, 2);
}

function trackSignaling(client) {
  diag.signaling = client.state;
  client.on('state', ({ state }) => {
    diag.signaling = state;
    renderDiagnostics();
  });
  client.on('closed', ({ error }) => {
    diag.signalingError = error;
    renderDiagnostics();
  });
}

function describeFailure(failure) {
  const label =
    failure.kind === 'signaling'
      ? 'Signaling failure'
      : failure.kind === 'ice'
        ? 'Connection failure (ICE)'
        : failure.kind === 'no-candidates'
          ? 'WebRTC blocked in this browser'
          : `Connection failure (${failure.kind})`;
  return `${label}: ${failure.message}`;
}

// ---- Host -------------------------------------------------------------------------------------

function initHost() {
  diag.role = 'host';
  // The networking test host is a development tool, not the way to share with players.
  $('ls-dev-note').classList.remove('d-none');
  $('ls-title').lastChild.textContent = ' Live Share — networking test';
  document.title = "The DM's Toolbox: Live Share networking test";
  diag.roomRegistered = false;
  diag.playersOnRelay = 0;
  $('ls-host').classList.remove('d-none');
  const rows = new Map(); // peerId -> { status }
  let session = null;
  let joinUrl = null;

  const setStatus = (text) => {
    $('ls-host-status').textContent = text;
  };

  const renderPeers = () => {
    const list = $('ls-peers');
    list.replaceChildren();
    if (rows.size === 0) {
      const empty = document.createElement('li');
      empty.className = 'list-group-item text-body-secondary';
      empty.textContent = 'No players connected.';
      list.append(empty);
      return;
    }
    let n = 0;
    for (const [peerId, entry] of rows) {
      const item = document.createElement('li');
      item.className = 'list-group-item d-flex justify-content-between';
      item.dataset.peerId = peerId;
      item.dataset.testid = 'peer';
      const name = document.createElement('span');
      name.textContent = `Player ${++n}`;
      const status = document.createElement('span');
      status.textContent = entry.status;
      item.append(name, status);
      list.append(item);
    }
  };

  const onPeerLink = ({ peerId, link }) => {
    const entry = rows.get(peerId);
    const update = (status) => {
      entry.status = status;
      renderPeers();
    };
    update('Connecting…');
    link.on('diagnostics', ({ snapshot }) => {
      if (!rows.has(peerId)) return;
      diag.peers[peerId] = snapshot;
      renderDiagnostics();
    });
    link.on('open', () => {
      if (link.send(encodeHello('hello'))) diag.lastSent = 'hello';
      update('Connected — sent "hello"');
      renderDiagnostics();
    });
    link.on('failed', (failure) => {
      update(describeFailure(failure));
      // The player's row goes when it leaves; keep the last failure so the diagnosis survives.
      diag.lastPeerFailure = failure;
      // Gathering no candidates is about this browser, not the player: say so on the host itself.
      if (failure.kind === 'no-candidates') setStatus(describeFailure(failure));
      renderDiagnostics();
    });
    link.on('close', () => {
      if (!link.failure) update('Disconnected');
    });
  };

  const endSession = () => {
    if (!session || !session.active) return;
    session.end();
    setStatus('Session ended');
    $('ls-end').disabled = $('ls-copy').disabled = $('ls-reveal').disabled = true;
    $('ls-link').classList.add('d-none');
    $('ls-start').disabled = false;
  };

  $('ls-start').addEventListener('click', () => {
    $('ls-start').disabled = true;
    diag.signalingError = null;
    diag.peers = {};
    diag.roomRegistered = false;

    session = new HostSession({ relayUrl, linkOptions });
    session.on('ready', () => {
      diag.roomRegistered = true;
      setStatus('Room open — waiting for players');
      $('ls-end').disabled = $('ls-copy').disabled = $('ls-reveal').disabled = false;
    });
    session.on('peer-joined', ({ peerId }) => {
      rows.set(peerId, { status: 'Preparing connection…' });
      diag.playersOnRelay = rows.size;
      renderPeers();
    });
    session.on('turn', ({ turn }) => showTurn(turn));
    session.on('peer-link', onPeerLink);
    session.on('peer-left', ({ peerId }) => {
      rows.delete(peerId);
      delete diag.peers[peerId];
      diag.playersOnRelay = rows.size;
      renderPeers();
      renderDiagnostics();
    });
    session.on('closed', ({ error }) => {
      if (error) {
        setStatus(`Signaling failure: ${error.message}`);
        $('ls-end').disabled = $('ls-copy').disabled = $('ls-reveal').disabled = true;
        $('ls-start').disabled = false;
      }
    });
    const roomId = session.start();
    signaling = session.signaling;
    trackSignaling(signaling);
    joinUrl = buildJoinUrl(location.href, roomId);
    $('ls-link').textContent = joinUrl;
    setStatus('Connecting to relay…');
    renderDiagnostics();
  });

  $('ls-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      $('ls-copy').textContent = 'Copied';
      setTimeout(() => ($('ls-copy').textContent = 'Copy join link'), 1500);
    } catch {
      $('ls-link').classList.remove('d-none');
    }
  });
  $('ls-reveal').addEventListener('click', () => $('ls-link').classList.toggle('d-none'));
  $('ls-end').addEventListener('click', endSession);
  window.addEventListener('pagehide', endSession);
}

// ---- Player -----------------------------------------------------------------------------------
//
// Milestone 5B.3: the product join flow. The page has a presentation state (data-state on #ls-player)
// that only decides what is shown; whether this player is admitted is the host's decision alone, and
// nothing about the map is drawn or requested before the host's accepted join-result.
//
//   connecting        preparing the connection, reaching the relay and the host
//   waiting-for-room  connected; waiting for the host's room state
//   ready-to-join     the join form (seat, password if required, Join Room)
//   joining           one join request sent; the form is held until the host answers
//   join-rejected     the host refused; still on the join form, with the reason
//   joined-loading    admitted; waiting for the shared map
//   connected         admitted and showing the map (or told that none is shared yet)
//   session-ended     the host ended it, removed this player, or the player left
//   host-disconnected the connection to the host was lost
//   unable-to-connect the session could not be reached
//
// There is no reconnect (Milestone 7): reloading or losing the connection leaves this player's seat
// reserved on the host, and the page says to ask the DM to reset it. The seat credential in the
// join-result is not kept.

const STATES = Object.freeze(['connecting', 'waiting-for-room', 'ready-to-join', 'joining', 'join-rejected', 'joined-loading', 'connected', 'session-ended', 'host-disconnected', 'unable-to-connect']);

// What a refused join means to the player (protocol-v1 JOIN_REJECT_REASONS; fixed codes only).
const JOIN_REFUSED = {
  'bad-password': 'That password is incorrect.',
  'room-locked': "The room is locked. The DM isn't letting new players join right now.",
  'seat-unavailable': 'That seat is no longer available. Choose another seat. If it was your seat, ask the DM to reset it.',
  'seat-disabled': 'That seat is disabled. Choose another seat.',
  'unknown-seat': 'That seat no longer exists. Choose another seat.',
  throttled: 'Too many attempts. Try again shortly.',
  'session-ended': 'This session has ended.',
  'already-admitted': "You have already joined this session. Reload the page if it doesn't show the map.",
  'invalid-credential': "Your seat couldn't be restored. Choose a seat to join.",
  'malformed-request': 'The join request could not be accepted. Try again.',
};
// Why the session ended for this player (protocol-v1 SESSION_END_REASONS).
const SESSION_ENDED = {
  ended: 'The host ended the session.',
  kicked: 'You were removed from the session.',
  'seat-reset': 'Your seat was reset by the host.',
  'seat-disabled': 'Your seat was disabled by the host.',
  left: 'You left the session.',
};
const VERSION_MISMATCH = "The host is using a different version of The DM's Toolbox. Reload this page and try again.";
const CONNECTION_LOST = 'Connection to the host was lost.';
// Connection problems the player can act on, by signaling error code; anything else is generic.
const SIGNALING_FAILED = {
  'no-host': "This Live Share session isn't running. The link may be old, or your DM hasn't started it yet.",
  'room-full': 'This Live Share room is full.',
  'host-left': 'The host ended the session.',
};
const UNABLE_TO_CONNECT = 'Unable to connect to this Live Share session.';
function describePlayerFailure(failure) {
  if (failure.kind === 'no-candidates') return 'This browser is blocking the connection Live Share needs (WebRTC). A VPN or privacy extension can cause this.';
  if (failure.kind === 'ice') return "Couldn't reach the host's browser. Your network may be blocking the connection.";
  return UNABLE_TO_CONNECT;
}

const sameMap = (a, b) =>
  a.map.width === b.map.width && a.map.height === b.map.height && a.mapTransform.scale === b.mapTransform.scale && a.mapTransform.x === b.mapTransform.x && a.mapTransform.y === b.mapTransform.y;

async function initPlayer(roomId) {
  diag.role = 'player';
  diag.roomFound = null;
  $('ls-player').classList.remove('d-none');
  let link = null;
  let ended = false;
  let seat = null; // { id, name } once admitted (the credential is not kept)
  let room = null; // the host's last admission state
  let mapShared = null; // from session-state: whether the DM shares a Battle Map (null: not told yet)
  diag.admission = 'not joined';

  // ---- Presentation state ----
  let state = 'connecting';
  const setState = (next) => {
    if (!STATES.includes(next)) return;
    state = next;
    $('ls-player').dataset.state = next;
    diag.playerState = next;
    const joinForm = next === 'ready-to-join' || next === 'joining' || next === 'join-rejected';
    $('ls-join').classList.toggle('d-none', !joinForm);
    $('ls-session').classList.toggle('d-none', !seat);
    renderDiagnostics();
  };
  const setStatus = (text) => {
    $('ls-player-status').textContent = text;
  };
  // Technical detail of the last connection problem, for troubleshooting only (never the main text).
  const setDetail = (text) => {
    $('ls-player-status-detail').textContent = text;
  };
  const sendV1 = (type, fields) => {
    const encoded = encode(type, fields);
    return !!(encoded.ok && link && link.send(encoded.text));
  };

  // ---- Join form ----
  // Updated in place from each admission state, never rebuilt, so the focused control, the selected
  // seat and a typed password survive updates about other seats.
  const select = $('ls-join-seat');
  const password = $('ls-join-password');
  const submit = $('ls-join-submit');
  const setError = (text) => {
    $('ls-join-error').textContent = text;
  };
  const chosen = () => (room ? room.seats.find((s) => s.id === select.value) || null : null);
  const canSubmit = () => {
    const s = chosen();
    return !!(room && !room.locked && s && s.available && (!room.passwordRequired || password.value.length > 0) && state !== 'joining');
  };
  const refreshSubmit = () => {
    submit.disabled = !canSubmit();
  };
  let lastSeatsKey = null;
  const renderSeats = (seats) => {
    const key = JSON.stringify(seats);
    if (key === lastSeatsKey) return;
    lastSeatsKey = key;
    const keep = select.value;
    const options = [...select.options].slice(1); // the "Choose a seat…" placeholder stays
    // Reuse an option per seat id; drop the seats that went away; keep the host's order.
    const byId = new Map(options.map((o) => [o.value, o]));
    for (const o of options) if (!seats.some((s) => s.id === o.value)) o.remove();
    let before = select.options[0];
    for (const s of seats) {
      const option = byId.get(s.id) || document.createElement('option');
      option.value = s.id;
      option.textContent = s.available ? s.name : `${s.name} — taken`;
      option.disabled = !s.available;
      if (before.nextSibling !== option) before.after(option);
      before = option;
    }
    select.value = keep;
    if (select.value !== keep) select.value = '';
    $('ls-join-seat-help').classList.toggle('d-none', !seats.some((s) => !s.available));
  };
  // A new room state from the host: what is shown, and what a stale choice now means.
  const renderRoom = (next) => {
    const previous = room;
    room = next;
    const wasChosen = previous && previous.seats.find((s) => s.id === select.value);
    renderSeats(next.seats);
    if (wasChosen && wasChosen.available) {
      const now = next.seats.find((s) => s.id === wasChosen.id);
      if (!now || !now.available) {
        select.value = '';
        setError(!now ? 'The seat you chose was removed. Choose another seat.' : 'The seat you chose was just taken. Choose another seat.');
      }
    }
    const row = $('ls-join-password-row');
    if (!next.passwordRequired && !row.classList.contains('d-none')) password.value = ''; // no longer asked for
    row.classList.toggle('d-none', !next.passwordRequired);
    $('ls-join-note').textContent = next.locked
      ? "The room is locked. The DM isn't letting new players join right now."
      : next.seats.length === 0
        ? 'No seats are available yet. Waiting for the host…'
        : next.seats.some((s) => s.available)
          ? 'Choose your seat to join the session.'
          : 'Every seat is taken right now. Waiting for the host…';
    $('ls-join').dataset.locked = String(next.locked);
    if (state === 'waiting-for-room') setState('ready-to-join');
    refreshSubmit();
  };
  select.addEventListener('change', () => {
    if (state === 'join-rejected') setError('');
    refreshSubmit();
  });
  password.addEventListener('input', refreshSubmit);
  $('ls-join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canSubmit()) return; // also stops a second Enter / click while joining
    const s = chosen();
    const fields = { seatId: s.id, ...(room.passwordRequired ? { password: password.value } : {}) };
    if (!sendV1('join-request', fields)) return;
    setError('');
    $('ls-join-fields').disabled = true;
    setState('joining');
    setStatus('Joining…');
    refreshSubmit();
  });
  const joinRefused = (reason) => {
    diag.admission = `refused: ${reason}`;
    $('ls-join-fields').disabled = false;
    setState('join-rejected');
    setStatus('Connected to host');
    setError(JOIN_REFUSED[reason] || JOIN_REFUSED['malformed-request']);
    if (reason === 'seat-unavailable' || reason === 'seat-disabled' || reason === 'unknown-seat') select.value = '';
    refreshSubmit();
    // Focus where the player fixes it.
    (reason === 'bad-password' && room && room.passwordRequired ? password : select).focus();
  };
  const joinAccepted = (accepted) => {
    seat = accepted;
    password.value = ''; // not needed any more, and not left in the page
    setError('');
    diag.admission = 'joined';
    $('ls-join-status').textContent = `Joined as ${seat.name}`;
    setStatus('Connected to host');
    setState('joined-loading');
    showMapWaiting();
    $('ls-join-status').focus();
  };

  // ---- Map ----
  // The Battle Map, once admitted: newest revision wins, older ones are ignored.
  let latest = null;
  const assets = createAssetCache({
    requestAssets: (ids) => link && seat && link.send(encodeAssetRequest(PROTOCOL_V1, ids)),
    onReady: () => draw(),
  });
  const showMapWaiting = () => {
    const waiting = $('ls-map-waiting');
    const text = latest ? '' : mapShared === false ? "The DM isn't sharing a map yet. It will appear here when they do." : seat ? 'Loading map…' : '';
    waiting.textContent = text;
    waiting.classList.toggle('d-none', !text || !seat || ended);
    if (seat && !ended && (latest || mapShared === false)) setState('connected');
  };
  // The player's own pan / zoom (2.3.30). Local only: it changes which part of the map this screen
  // shows, never the snapshot, and nothing about it is ever sent to the host.
  let viewFrame = 0;
  const camera = createPlayerView({
    element: $('ls-map'),
    getFit: () => (latest ? computeViewBox(latest) : null),
    // Pointer moves can come faster than frames: redraw the view at most once per frame.
    onView: () => {
      if (viewFrame) return;
      viewFrame = requestAnimationFrame(() => {
        viewFrame = 0;
        if (latest) setPlayerView($('ls-map'), latest, camera.view());
        diag.view = camera.stats();
      });
    },
    // A click or tap that did not pan: reserved for player pings (Milestone 6); for now it is only
    // counted in the diagnostics.
    onTap: () => {
      diag.view = camera.stats();
      renderDiagnostics();
    },
  });
  $('ls-map-fit').addEventListener('click', () => {
    camera.reset();
    renderDiagnostics();
  });
  diag.view = camera.stats();
  // Structured state first; the background and token art fill in whenever they are here.
  const presetUrl = (id) => globalThis.BattleMapTokenPresets.presetSrc(id);
  const draw = () => {
    if (!latest) return;
    const background = assets.backgroundFor(latest);
    renderBattleMapSnapshot($('ls-map'), latest, { background, tokenUrl: (id) => assets.url(id), presetUrl }, camera.view());
    diag.view = camera.stats();
    const status = latest.background ? assets.status(latest.background.assetId) : null;
    $('ls-map-assets').textContent = !latest.background
      ? 'No map image shared.'
      : background && background.current
        ? 'Map image shown.'
        : status === 'failed'
          ? 'The map image could not be loaded.' // never an older image in its place
          : background
            ? 'Updating the map image…'
            : 'Loading the map image…';
    diag.assets = assets.stats();
    renderDiagnostics();
  };
  const receiver = createSnapshotReceiver({
    onApply: (snapshot) => {
      // A different map (another image size or map transform) starts fitted; any other update
      // (tokens, overlays, grid, fog) keeps the player's pan and zoom.
      if (latest && camera.view() && !sameMap(latest, snapshot)) camera.reset();
      latest = snapshot;
      assets.sync(snapshot);
      draw();
      $('ls-map-section').classList.remove('d-none');
      setMapStatus(`Live — revision ${snapshot.revision}`);
      showMapWaiting();
    },
  });
  diag.snapshots = receiver.stats();
  diag.assets = assets.stats();
  const setMapStatus = (text) => {
    $('ls-map-status').textContent = text;
  };
  // A lost connection keeps the last map on screen, marked as no longer live.
  const markMapDisconnected = () => {
    if (receiver.lastAppliedRevision > 0) {
      setMapStatus(`Disconnected — showing the last map received (revision ${receiver.lastAppliedRevision})`);
      $('ls-map-section').classList.add('ls-map-disconnected');
    }
  };

  // ---- Ending ----
  const leave = (status, next = 'session-ended') => {
    if (ended) return;
    ended = true;
    password.value = '';
    markMapDisconnected();
    // The session is over: every received image is released; the structured map stays.
    assets.dispose();
    draw();
    if (link) link.close();
    if (signaling) signaling.close();
    $('ls-leave').disabled = true;
    $('ls-map-waiting').classList.add('d-none');
    if (status) setStatus(status);
    setState(next);
  };

  // Leave Session tells the host first, so the seat is released (not kept for a reconnect); the host
  // answers session-ended 'left', or the page leaves anyway after a second. Closing or reloading the
  // page is not a leave: no leave is sent, and the seat stays reserved on the host.
  $('ls-leave').addEventListener('click', () => {
    if (seat && sendV1('leave', {})) {
      $('ls-leave').disabled = true;
      setStatus('Leaving…');
      setTimeout(() => leave('You left the session.'), 1000);
    } else leave('You left the session.');
  });
  window.addEventListener('pagehide', () => leave());

  // ---- Connection ----
  // TURN credentials first: once the relay says "welcome" the host's offer follows at once, so the
  // peer connection must be ready to take it.
  setState('connecting');
  setStatus('Connecting to the host…');
  const iceServers = await prepareIceServers();
  if (ended) return;

  signaling = new SignalingClient({ relayUrl, roomId, role: 'peer' });
  trackSignaling(signaling);

  signaling.on('ready', () => {
    diag.roomFound = true;
    link = new PeerLink({ role: 'player', sendSignal: (data) => signaling.sendSignal(data), iceServers, ...linkOptions });
    link.on('diagnostics', ({ snapshot }) => {
      diag.peers.host = snapshot;
      renderDiagnostics();
    });
    link.on('open', () => {
      setStatus('Connected to host');
      setState('waiting-for-room');
      $('ls-join-note').textContent = 'Waiting for the room…';
    });
    link.on('message', ({ data }) => {
      if (ended) return;
      const parsed = parseHostMessage(data);
      if (!parsed.ok) {
        // Legacy, development only: the Milestone 0 test host's v0 "hello" (no game state).
        const legacy = typeof data === 'string' ? parseChannelMessage(data) : null;
        if (legacy && legacy.ok && legacy.message.type === 'hello') {
          $('ls-received').textContent = legacy.message.text;
          $('ls-hello').classList.remove('d-none');
          diag.lastReceived = legacy.message.text;
          renderDiagnostics();
          return;
        }
        diag.lastProtocolError = parsed.error;
        // A host speaking another protocol version: a different build of the Toolbox.
        if (parsed.error === 'unsupported protocol version' && !diag.versionMismatch) {
          diag.versionMismatch = true;
          setStatus(VERSION_MISMATCH);
          setDetail('The host sent a message in another Live Share protocol version.');
        }
        if (parsed.type === 'surface-snapshot') receiver.reject(parsed.error);
        diag.snapshots = receiver.stats();
        if (parsed.type && parsed.type.startsWith('asset-')) diag.assetProtocolErrors = (diag.assetProtocolErrors || 0) + 1;
        renderDiagnostics();
        return;
      }
      const { message } = parsed;
      if (message.type === 'admission-state') {
        if (!seat) renderRoom(message);
      } else if (message.type === 'join-result') {
        if (seat) return;
        // Accepted: the host has admitted this connection, so the page follows it. A refusal is shown
        // only as the answer to the request this form is waiting on.
        if (message.accepted) joinAccepted(message.seat);
        else if (state === 'joining') joinRefused(message.reason);
      } else if (message.type === 'session-state') {
        const map = message.surfaces.find((s) => s.surface === 'battle-map');
        mapShared = !!(map && map.available);
        showMapWaiting();
      } else if (message.type === 'session-ended') {
        diag.sessionEnded = message.reason;
        leave(SESSION_ENDED[message.reason]);
      } else if (message.type === 'surface-snapshot') {
        if (message.surface !== 'battle-map' || !seat) return;
        receiver.receive(message.snapshot);
        diag.snapshots = receiver.stats();
        renderDiagnostics();
      } else if (message.type === 'asset-meta') {
        if (seat) assets.handleMeta(message.asset);
      } else if (message.type === 'asset-chunk') {
        if (seat) assets.handleChunk(message);
      } else if (message.type === 'asset-abort') {
        if (seat) assets.handleAbort(message);
        diag.assets = assets.stats();
      }
    });
    link.on('failed', (failure) => {
      setDetail(describeFailure(failure));
      leave(describePlayerFailure(failure), 'unable-to-connect');
    });
    link.on('close', () => {
      if (ended) return;
      // When the host ends the session the data channel can close a moment before the relay's
      // "host left" arrives; keep listening briefly so the player is told the real reason.
      setStatus(CONNECTION_LOST);
      markMapDisconnected();
      setTimeout(() => leave(null, 'host-disconnected'), 2000);
    });
    link.start();
  });
  signaling.on('signal', ({ from, data }) => {
    if (from === 'host' && link) link.handleSignal(data);
  });
  signaling.on('closed', ({ error }) => {
    if (!error) return;
    if (error.code === 'no-host') diag.roomFound = false;
    setDetail(`Signaling failure: ${error.message}`);
    if (error.code === 'host-left') return leave(SIGNALING_FAILED['host-left']);
    // Lost after connecting: the host is gone; never connected: the session couldn't be reached.
    if (link && link.opened) return leave(CONNECTION_LOST, 'host-disconnected');
    leave(SIGNALING_FAILED[error.code] || UNABLE_TO_CONNECT, 'unable-to-connect');
  });

  signaling.connect();
  renderDiagnostics();
}

// ---- Start ------------------------------------------------------------------------------------

$('ls-copy-diag').addEventListener('click', () => {
  navigator.clipboard.writeText(JSON.stringify(diag, null, 2)).catch(() => {});
});

if (!relayUrl) {
  const box = $('ls-config-error');
  box.textContent = 'No Live Share relay is configured for this site yet (see relay/README.md).';
  box.classList.remove('d-none');
} else if (typeof RTCPeerConnection === 'undefined') {
  const box = $('ls-config-error');
  box.textContent = 'This browser does not support WebRTC, which Live Share needs.';
  box.classList.remove('d-none');
} else {
  const roomId = readRoomIdFromHash(location.hash);
  if (roomId) initPlayer(roomId);
  else if (location.hash.includes('room=')) {
    const box = $('ls-config-error');
    box.textContent = 'This join link is malformed.';
    box.classList.remove('d-none');
  } else initHost();
}
renderDiagnostics();
