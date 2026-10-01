/**
 * Live Share Milestone 2 on the Battle Map: the DM's page hosts a development room and sends the
 * map's player-safe snapshots to the player (who uses liveshare-dev.html). Development prototype
 * only (planning doc §11, §24): it does nothing unless the page is opened with `?liveshare=1`, and
 * then adds a small panel. No seats, passwords or admission yet (Milestone 5).
 *
 * Privacy boundary: this file only touches window.BattleMapLiveShare, the Milestone 1 seam
 * (getPlayerSafeState / onShareableStateChanged). It never reads Battle Map state directly, and
 * sends the seam's snapshot unchanged, so only what projectPlayerSafeState() allowlists can leave
 * the page. Sending is throttled, backpressure-aware and latest-state-wins (snapshot-sender.js).
 *
 * What the seam reports is the Battle Map's PUBLISHED state: the last successful save (2.3.27,
 * js/modules/battle-map-publication.js). That is a Battle Map policy; nothing here knows about
 * saving. This file sends whatever the seam says players may see, whenever it says that changed,
 * as any Live Share surface would (a future Initiative Tracker surface signals on every change).
 *
 * Milestone 3: players ask for the assets a snapshot references (the player-visible background,
 * custom token art) and the asset sender answers from seam.getAsset(id): bytes the Battle Map side
 * already prepared, never the map image, fog or token image sources (asset-sender.js).
 *
 * Development query parameters, carried into the join link like on liveshare-dev.html:
 *   ?relay=ws://host:port  ?forceRelay=1  ?iceTimeoutMs=20000
 */
import { resolveRelayUrl } from './modules/live-share/config.js';
import { buildJoinUrl } from './modules/live-share/room-id.js';
import { HostSession } from './modules/live-share/host-session.js';
import { createSnapshotSender } from './modules/live-share/snapshot-sender.js';
import { createAssetSender } from './modules/live-share/asset-sender.js';
import { parseChannelMessage, PROTOCOL_VERSION } from './modules/live-share/protocol.js';

const params = new URLSearchParams(location.search);

if (params.get('liveshare') === '1' && window.BattleMapLiveShare) initLiveShareHost(window.BattleMapLiveShare);

function initLiveShareHost(seam) {
  const relayUrl = resolveRelayUrl(location);
  const linkOptions = {
    iceTransportPolicy: params.get('forceRelay') === '1' ? 'relay' : 'all',
    connectTimeoutMs: clampInt(params.get('iceTimeoutMs'), 2000, 120000, 20000),
  };
  const ui = buildPanel();
  const peers = new Map(); // peerId -> status text
  let session = null;
  let joinUrl = null;

  const sender = createSnapshotSender({ getSnapshot: () => seam.getPlayerSafeState() });
  const assetSender = createAssetSender({ protocolVersion: PROTOCOL_VERSION, getAsset: seam.getAsset, hasAsset: seam.hasAsset });
  // The seam's one "player-visible state changed" signal: the only trigger for later snapshots. A
  // new background also ends any transfer of the one it replaced.
  seam.onShareableStateChanged(() => {
    sender.notifyChanged();
    assetSender.assetsChanged();
  });

  // States, counts and revisions only: no room id or link, no IP addresses, no snapshot content.
  const diag = { signaling: 'idle', signalingError: null, turn: null, peers: {}, snapshots: null, assets: null, preparedAssets: null, lastProtocolError: null };
  const renderDiagnostics = () => {
    diag.snapshots = sender.diagnostics();
    diag.assets = assetSender.diagnostics();
    diag.preparedAssets = seam.getAssetDiagnostics ? seam.getAssetDiagnostics() : null;
    ui.diag.textContent = JSON.stringify(diag, null, 2);
  };
  // Counters change with every send; a small refresh keeps the panel current without hooking sends.
  setInterval(renderDiagnostics, 500);

  const setStatus = (text) => {
    ui.status.textContent = text;
  };
  const renderPeers = () => {
    ui.peers.replaceChildren();
    if (peers.size === 0) {
      ui.peers.append(item('No players connected.'));
      return;
    }
    let n = 0;
    for (const status of peers.values()) {
      const li = item(`Player ${++n}: ${status}`);
      li.dataset.testid = 'peer';
      ui.peers.append(li);
    }
  };
  const setPeer = (peerId, status) => {
    if (!peers.has(peerId)) return;
    peers.set(peerId, status);
    renderPeers();
  };
  const setButtons = (running) => {
    ui.start.disabled = running;
    ui.copy.disabled = ui.reveal.disabled = ui.end.disabled = !running;
    if (!running) ui.link.hidden = true;
  };

  // The save button says what saving does while players are watching.
  const markSaveButton = (active) => {
    const btn = document.getElementById('saveMapBtn');
    if (!btn) return;
    btn.dataset.liveShare = active ? 'active' : '';
    const saveLabel = active ? 'Save changes and update players' : 'Save map';
    btn.title = `${btn.dataset.state === 'dirty' ? 'Unsaved changes. ' : ''}${saveLabel} (Ctrl+S)`;
    btn.setAttribute('aria-label', btn.title);
  };

  const start = () => {
    if (!relayUrl) return setStatus('No Live Share relay is configured for this site.');
    if (typeof RTCPeerConnection === 'undefined') return setStatus('This browser does not support WebRTC.');
    // Players only ever see a saved map; a map that was never saved has nothing to share yet.
    const problem = seam.savedMapProblem ? seam.savedMapProblem() : null;
    if (problem === 'unreadable') {
      return setStatus('The saved map could not be loaded (its image is unreadable), so there is nothing safe to share. Load the map image again and save.');
    }
    if (problem === 'loading') return setStatus('The saved map is still loading. Try again in a moment.');
    if (seam.hasPublishedState && !seam.hasPublishedState()) {
      return setStatus('Save the map first (Save button or Ctrl+S): players only see saved maps.');
    }
    ui.start.disabled = true;
    diag.signalingError = null;
    diag.peers = {};
    session = new HostSession({ relayUrl, linkOptions });
    session.on('state', ({ state }) => {
      diag.signaling = state;
      renderDiagnostics();
    });
    session.on('ready', () => {
      setStatus('Room open — waiting for players');
      setButtons(true);
      markSaveButton(true);
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
      // The player gets the current map as soon as its channel opens, then every change.
      // Players send only asset requests (untrusted: validated, and answered from the seam only).
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
        setPeer(peerId, 'Connected — sharing the map');
        renderDiagnostics();
      });
      link.on('failed', (failure) => setPeer(peerId, `Connection failure (${failure.kind}): ${failure.message}`));
      link.on('close', () => {
        sender.removePeer(peerId);
        assetSender.removePeer(peerId);
        if (!link.failure) setPeer(peerId, 'Disconnected');
      });
    });
    session.on('peer-left', ({ peerId }) => {
      sender.removePeer(peerId);
      assetSender.removePeer(peerId);
      peers.delete(peerId);
      delete diag.peers[peerId];
      renderPeers();
      renderDiagnostics();
    });
    session.on('closed', ({ error }) => {
      if (!error) return;
      diag.signalingError = error;
      setStatus(`Signaling failure: ${error.message}`);
      setButtons(false);
      markSaveButton(false);
      renderDiagnostics();
    });
    const roomId = session.start();
    joinUrl = buildJoinUrl(playerPageHref(), roomId);
    ui.link.textContent = joinUrl;
    setStatus('Connecting to relay…');
  };

  const end = () => {
    if (!session || !session.active) return;
    session.end();
    sender.dispose();
    assetSender.dispose();
    setStatus('Session ended');
    setButtons(false);
    markSaveButton(false);
    renderDiagnostics();
  };

  ui.start.addEventListener('click', start);
  ui.end.addEventListener('click', end);
  ui.reveal.addEventListener('click', () => (ui.link.hidden = !ui.link.hidden));
  ui.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      ui.copy.textContent = 'Copied';
      setTimeout(() => (ui.copy.textContent = 'Copy join link'), 1500);
    } catch {
      ui.link.hidden = false;
    }
  });
  window.addEventListener('pagehide', end);
  renderPeers();
  renderDiagnostics();
}

// The player page, in the same form (clean or .html) the server used for this page, keeping the
// development parameters so host and player use the same relay and ICE settings.
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
  li.textContent = text;
  return li;
}

function buildPanel() {
  // A collapsible corner panel, so it can be folded away from the map.
  const panel = document.createElement('details');
  panel.id = 'bm-live-share';
  panel.open = true;
  panel.setAttribute('aria-label', 'Live Share (development)');
  panel.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:1080;width:320px;max-height:70vh;overflow:auto;background:#0f1620;color:#e6edf3;border:1px solid #2a3a4c;border-radius:8px;padding:8px 12px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.5)';
  const title = document.createElement('summary');
  title.style.cssText = 'font-weight:600;margin-bottom:4px;cursor:pointer';
  title.textContent = 'Live Share — development prototype';
  const note = document.createElement('div');
  note.style.cssText = 'color:#fbbf24;font-size:12px;margin-bottom:6px';
  note.textContent = 'Anyone with the link can watch this map. Players see your last SAVED map (Save or Ctrl+S updates them), with fog baked in; hidden tokens, the uncovered map, HP and DM-only data are never sent.';
  const status = document.createElement('div');
  status.dataset.testid = 'host-status';
  status.textContent = 'Not started';

  const button = (text, testid) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-sm btn-outline-light';
    b.textContent = text;
    b.dataset.testid = testid;
    return b;
  };
  const start = button('Start room', 'start-room');
  const copy = button('Copy join link', 'copy-link');
  const reveal = button('Reveal link', 'reveal-link');
  const end = button('End', 'end-session');
  copy.disabled = reveal.disabled = end.disabled = true;
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:6px 0';
  buttons.append(start, copy, reveal, end);

  const link = document.createElement('div');
  link.dataset.testid = 'join-link';
  link.hidden = true;
  link.style.cssText = 'word-break:break-all;font-size:11px;color:#9fb3c8;margin-bottom:6px';

  const peers = document.createElement('ul');
  peers.dataset.testid = 'peer-list';
  peers.style.cssText = 'list-style:none;padding:0;margin:0 0 6px';

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Diagnostics';
  const diag = document.createElement('pre');
  diag.dataset.testid = 'diagnostics';
  diag.style.cssText = 'font-size:11px;white-space:pre-wrap;max-height:30vh;overflow:auto;color:#9fb3c8;margin:4px 0 0';
  details.append(summary, diag);

  panel.append(title, note, status, buttons, link, peers, details);
  document.body.append(panel);
  return { status, start, copy, reveal, end, link, peers, diag };
}
