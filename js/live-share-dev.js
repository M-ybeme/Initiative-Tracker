/**
 * Live Share Milestone 0 page (liveshare-dev.html): networking proof of concept.
 *
 * Without `#room=...` the page is a host: it creates a room on the relay, and for every player
 * that joins it opens a WebRTC data channel and sends "hello". With `#room=...` the page is a
 * player: it joins that room, answers the host's offer and shows the message it receives.
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
 * kept or stored: there is no automatic reconnect yet (Milestone 7). The join
 * controls here are a working preview; the product join screen is 5B.3.
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

// What a refused join and an ended session mean to the player (fixed codes from the host).
const JOIN_REFUSED = {
  'bad-password': 'Wrong password.',
  'room-locked': 'The room is locked: no new players can join right now.',
  'seat-unavailable': 'That seat is taken. Pick another.',
  'seat-disabled': 'That seat is not open.',
  'unknown-seat': 'That seat no longer exists.',
  throttled: 'Too many attempts. Wait a minute and try again.',
  'session-ended': 'The session has ended.',
  'already-admitted': 'You have already joined.',
  'invalid-credential': 'Your seat could not be restored.',
  'malformed-request': 'The join request was not accepted.',
};
const SESSION_ENDED = {
  ended: 'The host ended the session.',
  kicked: 'The DM removed you from the session.',
  'seat-reset': 'The DM reset your seat.',
  'seat-disabled': 'The DM closed your seat.',
  left: 'You left the session.',
};

const sameMap = (a, b) =>
  a.map.width === b.map.width && a.map.height === b.map.height && a.mapTransform.scale === b.mapTransform.scale && a.mapTransform.x === b.mapTransform.x && a.mapTransform.y === b.mapTransform.y;

async function initPlayer(roomId) {
  diag.role = 'player';
  diag.roomFound = null;
  $('ls-player').classList.remove('d-none');
  let link = null;
  let ended = false;
  // This player's seat once admitted. The join-result's credential is not kept: without an automatic
  // reconnect nothing would use it (Milestone 7 decides whether and where a player keeps it).
  let seat = null;
  let joining = false;
  diag.admission = 'not joined';

  const setStatus = (text) => {
    $('ls-player-status').textContent = text;
  };
  const setJoinStatus = (text) => {
    $('ls-join-status').textContent = text;
  };
  const sendV1 = (type, fields) => {
    const encoded = encode(type, fields);
    return !!(encoded.ok && link && link.send(encoded.text));
  };

  // The host's admission state: one button per enabled seat, a password field if one is needed.
  let lastAdmission = null;
  const renderJoin = (state) => {
    lastAdmission = state;
    $('ls-join').classList.toggle('d-none', !!seat || ended);
    $('ls-join-password-row').classList.toggle('d-none', !state.passwordRequired);
    $('ls-join-note').textContent = state.locked
      ? 'The room is locked: no new players can join right now.'
      : state.seats.length === 0
        ? 'The DM has not opened any seats yet.'
        : 'Pick your seat to join.';
    const list = $('ls-join-seats');
    list.replaceChildren();
    for (const s of state.seats) {
      const b = document.createElement('button');
      b.className = 'btn btn-sm btn-outline-light';
      b.textContent = s.available ? s.name : `${s.name} (taken)`;
      b.dataset.testid = 'join-seat';
      b.dataset.seatId = s.id;
      b.disabled = !s.available || state.locked || joining;
      b.addEventListener('click', () => {
        if (joining || seat) return;
        const password = $('ls-join-password').value;
        joining = true;
        if (!sendV1('join-request', { seatId: s.id, ...(state.passwordRequired && password ? { password } : {}) })) joining = false;
        setJoinStatus(joining ? 'Joining…' : 'Not joined');
        renderJoin(lastAdmission);
      });
      list.append(b);
    }
  };

  // The Battle Map, if the host is sharing one: newest revision wins, older ones are ignored.
  let latest = null;
  const assets = createAssetCache({
    requestAssets: (ids) => link && seat && link.send(encodeAssetRequest(PROTOCOL_V1, ids)),
    onReady: () => draw(),
  });
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

  const leave = (status) => {
    if (ended) return;
    ended = true;
    $('ls-join').classList.add('d-none');
    markMapDisconnected();
    // The session is over: every received image is released; the structured map stays.
    assets.dispose();
    draw();
    if (link) link.close();
    if (signaling) signaling.close();
    $('ls-leave').disabled = true;
    if (status) setStatus(status);
    renderDiagnostics();
  };

  // Leave tells the host first, so the seat is released (not kept for a reconnect); the host answers
  // session-ended 'left', or the page leaves anyway after a second. Closing or reloading the page is
  // not a leave: the seat stays claimed-disconnected on the host.
  $('ls-leave').addEventListener('click', () => {
    if (seat && sendV1('leave', {})) {
      $('ls-leave').disabled = true;
      setStatus('Leaving…');
      setTimeout(() => leave('You left the session.'), 1000);
    } else leave('You left the session.');
  });
  window.addEventListener('pagehide', () => leave());

  // TURN credentials first: once the relay says "welcome" the host's offer follows at once, so the
  // peer connection must be ready to take it.
  setStatus('Preparing connection…');
  const iceServers = await prepareIceServers();
  if (ended) return;

  signaling = new SignalingClient({ relayUrl, roomId, role: 'peer' });
  trackSignaling(signaling);
  setStatus('Connecting to relay…');

  signaling.on('ready', () => {
    diag.roomFound = true;
    setStatus('Connecting to host…');
    link = new PeerLink({ role: 'player', sendSignal: (data) => signaling.sendSignal(data), iceServers, ...linkOptions });
    link.on('diagnostics', ({ snapshot }) => {
      diag.peers.host = snapshot;
      renderDiagnostics();
    });
    link.on('open', () => setStatus('Connected to host'));
    link.on('message', ({ data }) => {
      if (ended) return;
      const parsed = parseHostMessage(data);
      if (!parsed.ok) {
        // Legacy, development only: the Milestone 0 host's v0 "hello" (no game state).
        const legacy = typeof data === 'string' ? parseChannelMessage(data) : null;
        if (legacy && legacy.ok && legacy.message.type === 'hello') {
          $('ls-received').textContent = legacy.message.text;
          diag.lastReceived = legacy.message.text;
          renderDiagnostics();
          return;
        }
        diag.lastProtocolError = parsed.error;
        if (parsed.type === 'surface-snapshot') receiver.reject(parsed.error);
        diag.snapshots = receiver.stats();
        if (parsed.type && parsed.type.startsWith('asset-')) diag.assetProtocolErrors = (diag.assetProtocolErrors || 0) + 1;
        renderDiagnostics();
        return;
      }
      const { message } = parsed;
      if (message.type === 'admission-state') {
        if (!seat) renderJoin(message);
      } else if (message.type === 'join-result') {
        joining = false;
        if (message.accepted) {
          seat = message.seat;
          diag.admission = 'joined';
          setJoinStatus(`Joined as ${seat.name}`);
          $('ls-join').classList.add('d-none');
        } else {
          diag.admission = `refused: ${message.reason}`;
          setJoinStatus(JOIN_REFUSED[message.reason]);
          if (lastAdmission) renderJoin(lastAdmission);
        }
        renderDiagnostics();
      } else if (message.type === 'session-ended') {
        diag.sessionEnded = message.reason;
        setJoinStatus('Not joined');
        leave(SESSION_ENDED[message.reason]);
      } else if (message.type === 'surface-snapshot') {
        if (message.surface !== 'battle-map') return;
        receiver.receive(message.snapshot);
        diag.snapshots = receiver.stats();
        renderDiagnostics();
      } else if (message.type === 'asset-meta') {
        assets.handleMeta(message.asset);
      } else if (message.type === 'asset-chunk') {
        assets.handleChunk(message);
      } else if (message.type === 'asset-abort') {
        assets.handleAbort(message);
        diag.assets = assets.stats();
      }
    });
    link.on('failed', (failure) => leave(describeFailure(failure)));
    link.on('close', () => {
      if (ended) return;
      // When the host ends the session the data channel can close a moment before the relay's
      // "host left" arrives; keep listening briefly so the player is told the real reason.
      setStatus('Disconnected from the host.');
      markMapDisconnected();
      setTimeout(() => leave(), 2000);
    });
    link.start();
  });
  signaling.on('signal', ({ from, data }) => {
    if (from === 'host' && link) link.handleSignal(data);
  });
  signaling.on('closed', ({ error }) => {
    if (!error) return;
    if (error.code === 'no-host') diag.roomFound = false;
    leave(error.code === 'host-left' ? error.message : `Signaling failure: ${error.message}`);
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
