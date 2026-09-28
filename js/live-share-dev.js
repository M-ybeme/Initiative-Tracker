/**
 * Live Share Milestone 0 page (liveshare-dev.html): networking proof of concept.
 *
 * Without `#room=...` the page is a host: it creates a room on the relay, and for every player
 * that joins it opens a WebRTC data channel and sends "hello". With `#room=...` the page is a
 * player: it joins that room, answers the host's offer and shows the message it receives.
 * No Battle Map integration and no admission model yet (planning doc §11, §24).
 *
 * Development query parameters (kept in join links, so host and player agree):
 *   ?relay=ws://host:port   use this relay instead of the default
 *   ?forceRelay=1           ICE may only use TURN relays; with none configured this forces an ICE
 *                           failure, which exercises the failure diagnostics
 *   ?iceTimeoutMs=20000     how long a peer may take to connect before it is reported as failed
 */
import { resolveRelayUrl } from './modules/live-share/config.js';
import { generateRoomId, buildJoinUrl, readRoomIdFromHash } from './modules/live-share/room-id.js';
import { SignalingClient } from './modules/live-share/signaling-client.js';
import { PeerLink } from './modules/live-share/peer-link.js';
import { encodeHello, parseChannelMessage } from './modules/live-share/protocol.js';

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
  peers: {},
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
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
  const label = failure.kind === 'signaling' ? 'Signaling failure' : failure.kind === 'ice' ? 'Connection failure (ICE)' : `Connection failure (${failure.kind})`;
  return `${label}: ${failure.message}`;
}

// ---- Host -------------------------------------------------------------------------------------

function initHost() {
  diag.role = 'host';
  diag.roomRegistered = false;
  diag.playersOnRelay = 0;
  $('ls-host').classList.remove('d-none');
  const peers = new Map(); // peerId -> { link, status }
  let joinUrl = null;

  const setStatus = (text) => {
    $('ls-host-status').textContent = text;
  };

  const renderPeers = () => {
    const list = $('ls-peers');
    list.replaceChildren();
    if (peers.size === 0) {
      const empty = document.createElement('li');
      empty.className = 'list-group-item text-body-secondary';
      empty.textContent = 'No players connected.';
      list.append(empty);
      return;
    }
    let n = 0;
    for (const [peerId, entry] of peers) {
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

  const dropPeer = (peerId) => {
    const entry = peers.get(peerId);
    if (!entry) return;
    entry.link.close();
    peers.delete(peerId);
    delete diag.peers[peerId];
    diag.playersOnRelay = peers.size;
    renderPeers();
    renderDiagnostics();
  };

  const addPeer = (peerId) => {
    const link = new PeerLink({ role: 'host', sendSignal: (data) => signaling.sendSignal(data, peerId), ...linkOptions });
    const entry = { link, status: 'Connecting…' };
    peers.set(peerId, entry);
    diag.playersOnRelay = peers.size;
    const update = (status) => {
      entry.status = status;
      renderPeers();
    };
    link.on('diagnostics', ({ snapshot }) => {
      diag.peers[peerId] = snapshot;
      renderDiagnostics();
    });
    link.on('open', () => {
      if (link.send(encodeHello('hello'))) diag.lastSent = 'hello';
      update('Connected — sent "hello"');
      renderDiagnostics();
    });
    link.on('failed', (failure) => update(describeFailure(failure)));
    link.on('close', () => {
      if (!link.failure) update('Disconnected');
    });
    renderPeers();
    link.start();
  };

  const endSession = () => {
    if (!signaling) return;
    // Close the relay first so players get "host ended the session" rather than a bare channel close.
    signaling.close();
    for (const peerId of [...peers.keys()]) dropPeer(peerId);
    setStatus('Session ended');
    $('ls-end').disabled = $('ls-copy').disabled = $('ls-reveal').disabled = true;
    $('ls-link').classList.add('d-none');
    $('ls-start').disabled = false;
  };

  $('ls-start').addEventListener('click', () => {
    $('ls-start').disabled = true;
    const roomId = generateRoomId();
    joinUrl = buildJoinUrl(location.href, roomId);
    $('ls-link').textContent = joinUrl;
    diag.signalingError = null;
    diag.peers = {};
    diag.roomRegistered = false;

    signaling = new SignalingClient({ relayUrl, roomId, role: 'host' });
    trackSignaling(signaling);
    setStatus('Connecting to relay…');
    signaling.on('ready', () => {
      diag.roomRegistered = true;
      setStatus('Room open — waiting for players');
      $('ls-end').disabled = $('ls-copy').disabled = $('ls-reveal').disabled = false;
    });
    signaling.on('peer-joined', ({ peerId }) => addPeer(peerId));
    signaling.on('peer-left', ({ peerId }) => dropPeer(peerId));
    signaling.on('signal', ({ from, data }) => {
      const entry = peers.get(from);
      if (entry) entry.link.handleSignal(data);
    });
    signaling.on('closed', ({ error }) => {
      if (error) {
        setStatus(`Signaling failure: ${error.message}`);
        for (const peerId of [...peers.keys()]) dropPeer(peerId);
        $('ls-end').disabled = $('ls-copy').disabled = $('ls-reveal').disabled = true;
        $('ls-start').disabled = false;
      }
    });
    signaling.connect();
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

function initPlayer(roomId) {
  diag.role = 'player';
  diag.roomFound = null;
  $('ls-player').classList.remove('d-none');
  let link = null;
  let ended = false;

  const setStatus = (text) => {
    $('ls-player-status').textContent = text;
  };

  const leave = (status) => {
    if (ended) return;
    ended = true;
    if (link) link.close();
    if (signaling) signaling.close();
    $('ls-leave').disabled = true;
    if (status) setStatus(status);
    renderDiagnostics();
  };

  signaling = new SignalingClient({ relayUrl, roomId, role: 'peer' });
  trackSignaling(signaling);
  setStatus('Connecting to relay…');

  signaling.on('ready', () => {
    diag.roomFound = true;
    setStatus('Connecting to host…');
    link = new PeerLink({ role: 'player', sendSignal: (data) => signaling.sendSignal(data), ...linkOptions });
    link.on('diagnostics', ({ snapshot }) => {
      diag.peers.host = snapshot;
      renderDiagnostics();
    });
    link.on('open', () => setStatus('Connected to host'));
    link.on('message', ({ data }) => {
      const parsed = parseChannelMessage(data);
      if (!parsed.ok) {
        diag.lastProtocolError = parsed.error;
        renderDiagnostics();
        return;
      }
      if (parsed.message.type === 'hello') {
        $('ls-received').textContent = parsed.message.text;
        diag.lastReceived = parsed.message.text;
        renderDiagnostics();
      }
    });
    link.on('failed', (failure) => leave(describeFailure(failure)));
    link.on('close', () => {
      if (ended) return;
      // When the host ends the session the data channel can close a moment before the relay's
      // "host left" arrives; keep listening briefly so the player is told the real reason.
      setStatus('Disconnected from the host.');
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

  $('ls-leave').addEventListener('click', () => leave('You left the session.'));
  window.addEventListener('pagehide', () => leave());
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
