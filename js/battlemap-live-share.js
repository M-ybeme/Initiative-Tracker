/**
 * Live Share on the Battle Map (Milestone 5A.4): the Battle Map's publisher to the Live Share session
 * page (live-share.html, js/live-share-host.js), over the surface boundary
 * (docs/live-share-session-host-architecture.md §6, §14).
 *
 * The session page owns the room, signaling, every player connection, the senders and the session's
 * lifetime. This file owns none of that: it creates no room, socket, peer connection or data channel,
 * and sends nothing to players. It only offers the Battle Map's player-safe publication to the session
 * page (createSurfacePublisher), answers its requests for asset bytes, and shows the DM the state of
 * Live Share. So the Battle Map can close or reload while the room, the players and the last published
 * map stay with the session page.
 *
 * What is published stays the Battle Map's policy (2.3.27): only the last SAVED map, never the
 * working draft. This file reads the seam (window.BattleMapLiveShare), never Battle Map state:
 *   getPlayerSafeState()        the saved map's allowlisted projection (the seam's local revisions are
 *                               dropped: the session page assigns the revisions players see)
 *   onShareableStateChanged()   a save was published: offer it
 *   getAsset() / getAssetMeta() player-safe asset bytes / metadata by content-derived id
 *   hasPublishedState()         whether there is a saved map at all
 *   setLiveShareActive()        assets (background composite, custom token art) are prepared only
 *                               while a session runs; turning it on republishes the saved record
 *   isLiveShareReady() / onLiveShareReady()
 *                               the published state was made with its assets in this session: only
 *                               then is it offered (never one published before the session, without
 *                               assets, or one whose saved map turned out unreadable)
 *
 * Duplicate Battle Map tabs follow the session page's role rule (session-host-boundary.js): one tab
 * publishes; the others save locally without updating players, and "Publish from this tab" claims the
 * role (the claimed tab then offers its last saved map, never unsaved edits).
 *
 * The small Live Share panel appears once a session page is open in this browser (or, for development,
 * with ?liveshare=1). Without one, the Battle Map behaves exactly as without Live Share.
 *
 * Development query parameters, passed on to the session page by "Open Live Share":
 *   ?relay=ws://host:port  ?forceRelay=1  ?iceTimeoutMs=20000
 */
import { createSurfacePublisher } from './modules/live-share/surface-publisher.js';
import { fromProjection, BATTLE_MAP_SURFACE, BATTLE_MAP_SURFACE_VERSION } from './modules/live-share/battlemap-publication.js';
import { SESSION_HOST_WINDOW } from './modules/live-share/session-host-lock.js';

const params = new URLSearchParams(location.search);
const REJECTION_TEXT = {
  'no-session': 'Live Share is not running.',
  inactive: 'another Battle Map tab is publishing.',
  incompatible: 'the Live Share page is a different version: reload both pages.',
  stale: 'a newer save was already sent.',
  invalid: 'the saved map could not be shared.',
  limit: 'the saved map is too large to share.',
  'asset-invalid': 'a map image failed its check.',
  superseded: 'a newer save replaced it.',
};

if (window.BattleMapLiveShare) initLiveShare(window.BattleMapLiveShare);

function initLiveShare(seam) {
  let ui = null;
  let running = false;

  // The saved map, as offered to the session page: revisionless content plus its assets' metadata.
  // Null until it is ready for the running session (prepared with its assets), or when nothing is saved.
  function currentPublication() {
    if (!seam.isLiveShareReady()) return null;
    const snapshot = seam.getPlayerSafeState();
    if (!snapshot) return null;
    const structured = fromProjection(snapshot);
    const ids = [structured.background && structured.background.assetId, ...structured.tokens.map((t) => t.assetId)].filter(Boolean);
    const assets = [];
    for (const id of new Set(ids)) {
      const meta = seam.getAssetMeta(id);
      if (!meta) return null; // referenced but not held: never offer a publication that can't complete
      assets.push(meta);
    }
    return { structured, assets };
  }

  const publisher = createSurfacePublisher({
    surface: BATTLE_MAP_SURFACE,
    surfaceVersion: BATTLE_MAP_SURFACE_VERSION,
    getPublication: currentPublication,
    // A saved map counts even while its assets are being prepared, but not one that can't be read.
    hasPublication: () => seam.hasPublishedState() && seam.savedMapProblem() !== 'unreadable',
    getAsset: (id) => seam.getAsset(id),
    onStatus: (status) => {
      followSession(status.running);
      render(status);
    },
  });

  // Asset preparation follows the session: on while one runs, off when it ends. Once the saved map is
  // ready (published with its assets), it is offered.
  function followSession(nowRunning) {
    if (nowRunning === running) return;
    running = nowRunning;
    seam.setLiveShareActive(running);
  }

  // Each save published while ready is offered once; inactive tabs don't offer (at most they tell the
  // session page, once, that they have a map).
  const offerIfReady = () => {
    if (seam.isLiveShareReady()) publisher.publish();
    else render(publisher.status());
  };
  seam.onLiveShareReady(offerIfReady);
  seam.onShareableStateChanged(offerIfReady);

  publisher.start();
  if (params.get('liveshare') === '1') render(publisher.status()); // development: show the panel at once
  // The saved map's own state (loading, unreadable) changes without an event: refresh the panel.
  setInterval(() => ui && render(publisher.status()), 1000);

  function render(status) {
    const heardHost = status.roleReason !== null || status.running || status.lastCommitted || status.lastRejected;
    if (!ui) {
      if (!heardHost && params.get('liveshare') !== '1') return; // no session page: no Live Share UI
      ui = buildPanel();
      ui.open.addEventListener('click', openLiveShare);
      ui.claim.addEventListener('click', () => publisher.claim());
    }
    const incompatible = status.roleReason === 'incompatible';
    let state;
    let text;
    if (!status.running) {
      state = 'not-running';
      text = heardHost ? 'Live Share is open but not running. Start it on the Live Share page.' : 'Live Share is not running.';
    } else if (incompatible) {
      state = 'incompatible';
      text = 'The Live Share page is a different version of the Toolbox. Reload both pages.';
    } else if (status.active) {
      state = 'active';
      const n = status.players;
      text = `Live Share is running: this tab shares its saved map with ${n} player${n === 1 ? '' : 's'}.`;
    } else {
      state = 'inactive';
      text = 'Live Share is using another Battle Map tab. Saving here does not update players.';
    }
    ui.status.dataset.state = state;
    ui.status.textContent = text;
    ui.publication.dataset.state = '';
    ui.publication.textContent = '';
    if (state === 'active') {
      const problem = seam.savedMapProblem();
      const rejected = status.lastRejected && status.lastOffered && status.lastRejected.publicationSeq === status.lastOffered.publicationSeq;
      const pending = status.lastOffered && !rejected && (!status.lastCommitted || status.lastCommitted.publicationSeq < status.lastOffered.publicationSeq);
      let pub;
      if (problem === 'unreadable') pub = ['problem', 'The saved map could not be loaded (its image is unreadable). Load the map image again and save.'];
      else if (problem === 'loading') pub = ['loading', 'Your saved map is still loading…'];
      else if (!seam.hasPublishedState()) pub = ['nothing', 'Players see nothing yet: save the map (Save button or Ctrl+S).'];
      else if (!seam.isLiveShareReady()) pub = ['preparing', 'Preparing your saved map for players…'];
      else if (rejected) pub = ['rejected', `Players were not updated: ${REJECTION_TEXT[status.lastRejected.reason] || 'the save was refused.'}`];
      else if (pending) pub = ['sending', 'Sending your saved map to players…'];
      else if (status.lastCommitted) pub = ['updated', 'Players have your last saved map.'];
      else pub = ['preparing', 'Preparing your saved map for players…'];
      [ui.publication.dataset.state, ui.publication.textContent] = pub;
    }
    ui.claim.hidden = !(status.running && !status.active && !incompatible);
    markSaveButton(state === 'active');
  }

  // The save button says what saving does while this tab is sharing.
  function markSaveButton(active) {
    const btn = document.getElementById('saveMapBtn');
    if (!btn) return;
    btn.dataset.liveShare = active ? 'active' : '';
    const saveLabel = active ? 'Save changes and update players' : 'Save map';
    btn.title = `${btn.dataset.state === 'dirty' ? 'Unsaved changes. ' : ''}${saveLabel} (Ctrl+S)`;
    btn.setAttribute('aria-label', btn.title);
  }
}

// Opens the session page, or focuses it if this browser already has it under its window name. A
// named window that turns out to be blank is navigated there; an existing one is never reloaded
// (reloading it would end the session).
function openLiveShare() {
  const url = new URL(location.pathname.endsWith('.html') ? 'live-share.html' : 'live-share', location.href);
  for (const key of ['relay', 'forceRelay', 'iceTimeoutMs']) if (params.has(key)) url.searchParams.set(key, params.get(key));
  const win = window.open('', SESSION_HOST_WINDOW);
  if (!win) return; // blocked: nothing else would open either
  try {
    if (win.location.href === 'about:blank') win.location.href = url.href;
  } catch {
    // Not readable: it is some other page under that name; leave it.
  }
  win.focus();
}

function buildPanel() {
  // A collapsible corner panel, so it can be folded away from the map.
  const panel = document.createElement('details');
  panel.id = 'bm-live-share';
  panel.open = true;
  panel.setAttribute('aria-label', 'Live Share');
  panel.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:1080;width:300px;max-height:70vh;overflow:auto;background:#0f1620;color:#e6edf3;border:1px solid #2a3a4c;border-radius:8px;padding:8px 12px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.5)';
  const title = document.createElement('summary');
  title.style.cssText = 'font-weight:600;margin-bottom:4px;cursor:pointer';
  title.textContent = 'Live Share (in development)';
  const status = document.createElement('div');
  status.dataset.testid = 'bm-live-share-status';
  status.setAttribute('role', 'status');
  const publication = document.createElement('div');
  publication.dataset.testid = 'bm-live-share-publication';
  publication.style.cssText = 'color:#9fb3c8;margin-top:4px';
  const note = document.createElement('div');
  note.style.cssText = 'color:#fbbf24;font-size:12px;margin-top:6px';
  note.textContent = 'Players see your last SAVED map, with fog baked in; hidden tokens, the uncovered map, HP and DM-only data are never sent.';
  const button = (text, testid) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-sm btn-outline-light';
    b.textContent = text;
    b.dataset.testid = testid;
    return b;
  };
  const open = button('Open Live Share', 'bm-open-live-share');
  const claim = button('Publish from this tab', 'bm-claim-publisher');
  claim.hidden = true;
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px';
  buttons.append(open, claim);
  panel.append(title, status, publication, buttons, note);
  document.body.append(panel);
  return { status, publication, open, claim };
}
