/**
 * Live Share Milestone 5A.3: a surface's side of the surface ↔ session host boundary
 * (docs/live-share-session-host-architecture.md §6). A Toolbox page that shares something with players
 * uses this to publish its player-safe state to the session host page; it never touches signaling,
 * WebRTC, seats or credentials.
 *
 * Production module, used in 5A.3 only by the test publisher (tests/fixtures/live-share-test-publisher
 * .html). The Battle Map's publisher adapter (5A.4) will use it in place of today's prototype host.
 *
 *   createSurfacePublisher({ surface, surfaceVersion, getPublication, getAsset, onStatus })
 *     getPublication()   the surface's current player-safe publication, { structured, assets: [{ assetId,
 *                        kind, mime, width, height, byteLength }] }, or null. Revisionless: the host
 *                        assigns the revisions players see.
 *     getAsset(id)       { bytes } (Uint8Array or ArrayBuffer) of an asset that publication references
 *     start()            open the channels, say hello, heartbeat every HEARTBEAT_MS
 *     publish()          offer the current publication now (after a save); only the active tab of a
 *                        running session offers, anything else waits for its turn
 *     claim()            "publish from this tab": ask to become the active publisher
 *     close()            say bye and stop (also on pagehide; a bfcache restore says hello again)
 *     status()           { instanceId, active, roleReason, running, players, lastCommitted, lastRejected,
 *                          protocolErrors }
 *
 * When it offers: on publish(), and once whenever it becomes the active publisher of a running session
 * (after its hello, a host-hello, or a takeover), so a host that (re)started gets the current state
 * without the surface having to change anything. Asset bytes are sent only for the ids the host asks
 * for, for the offer it asks about, on this surface type's own data channel.
 *
 * A tab that is not the publisher but has something to publish tells the host once (a hello with
 * hasPublication: true), so the host can give it the role if the publisher has nothing. After it
 * loses the role it tells the host again at its next publish(): the host may have handed the role to
 * an empty tab meanwhile (for example while this tab was frozen and stopped responding). That is at
 * most one hello per role lost, never one per publish.
 */
import { CONTROL_CHANNEL, surfaceDataChannel, HOST_ID, HEARTBEAT_MS, envelope, parseHostMessage, newInstanceId } from './surface-boundary.js';

export function createSurfacePublisher({
  surface,
  surfaceVersion,
  getPublication,
  getAsset,
  onStatus = () => {},
  openChannel = (name) => new globalThis.BroadcastChannel(name),
  instanceId = newInstanceId(),
  heartbeatMs = HEARTBEAT_MS,
  setRepeat = (fn, ms) => setInterval(fn, ms),
  clearRepeat = (t) => clearInterval(t),
  win = typeof globalThis.addEventListener === 'function' ? globalThis : null, // pagehide / pageshow
}) {
  let control = null;
  let data = null;
  let heartbeat = null;
  let seq = 0;
  let offered = null; // { publicationSeq, assets: Map(id -> meta) } of the latest offer
  let offeredThisTurn = false; // offered since becoming active / the last host-hello
  let announcedPublication = false; // hasPublication as last told to the host
  const state = { instanceId, active: false, roleReason: null, running: false, players: 0, lastCommitted: null, lastRejected: null, protocolErrors: 0 };

  const send = (channel, type, fields) => {
    if (!channel) return;
    try {
      channel.postMessage(envelope(type, instanceId, fields, HOST_ID));
    } catch {
      // Closed (the page is going away).
    }
  };
  const status = () => onStatus({ ...state });
  const hello = () => {
    let hasPublication = false;
    try {
      hasPublication = !!getPublication();
    } catch {
      hasPublication = false;
    }
    announcedPublication = hasPublication;
    send(control, 'surface-hello', { surface, surfaceVersion, hasPublication });
  };

  function offer() {
    let publication;
    try {
      publication = state.running ? getPublication() : null;
    } catch {
      publication = null;
    }
    // Not the publisher, but now has something: tell the host, which may give it the role.
    if (!state.active) {
      if (publication && !announcedPublication) hello();
      return false;
    }
    if (!publication) return false;
    seq += 1;
    offered = { publicationSeq: seq, assets: new Map(publication.assets.map((a) => [a.assetId, a])) };
    offeredThisTurn = true;
    send(control, 'publication-offer', { publicationSeq: seq, structured: publication.structured, assets: publication.assets });
    return true;
  }

  function sendAssets(publicationSeq, assetIds) {
    if (!offered || offered.publicationSeq !== publicationSeq) return; // about an older offer
    for (const assetId of assetIds) {
      const meta = offered.assets.get(assetId);
      const asset = meta ? getAsset(assetId) : null;
      if (!asset) continue; // the host keeps waiting; the next publish() offers again
      const view = asset.bytes instanceof ArrayBuffer ? new Uint8Array(asset.bytes) : asset.bytes;
      const bytes = view.byteOffset === 0 && view.byteLength === view.buffer.byteLength ? view.buffer : view.slice().buffer;
      const { kind, mime, width, height, byteLength } = meta;
      send(data, 'publication-asset', { publicationSeq, assetId, meta: { kind, mime, width, height, byteLength }, bytes });
    }
  }

  function receive(raw) {
    // The control channel also carries the other surfaces' own messages: not for us, not errors.
    if (raw && typeof raw === 'object' && raw.from !== HOST_ID) return;
    const parsed = parseHostMessage(raw, instanceId);
    if (!parsed.ok) {
      if (parsed.error !== 'not for this instance') state.protocolErrors += 1;
      return;
    }
    const msg = parsed.message;
    switch (msg.type) {
      case 'host-hello':
        // A host (re)started or its session started or ended: its store may be empty, so announce
        // again and offer once more when given the role.
        state.running = msg.sessionActive;
        offeredThisTurn = false;
        hello();
        break;
      case 'session-status':
        state.running = msg.running;
        state.players = msg.players;
        if (!msg.running) offeredThisTurn = false;
        break;
      case 'surface-role':
        if (!msg.active) offeredThisTurn = false;
        // Just lost the role: the host may now prefer a tab with nothing to publish, so the next
        // publish() says hello again (once; a repeated inactive role doesn't re-arm it).
        if (state.active && !msg.active) announcedPublication = false;
        state.active = msg.active;
        state.roleReason = msg.reason;
        break;
      case 'publication-need':
        sendAssets(msg.publicationSeq, msg.assetIds);
        break;
      case 'publication-committed':
        state.lastCommitted = { publicationSeq: msg.publicationSeq, revision: msg.revision };
        break;
      case 'publication-rejected':
        state.lastRejected = { publicationSeq: msg.publicationSeq, reason: msg.reason };
        break;
    }
    if (state.active && state.running && !offeredThisTurn) offer();
    status();
  }

  const onPageHide = () => api.close({ keepListening: true });
  const onPageShow = (e) => {
    if (e.persisted) api.start(); // restored from the back/forward cache: the same instance, back
  };

  const api = {
    start() {
      if (!control) {
        control = openChannel(CONTROL_CHANNEL);
        control.onmessage = (e) => receive(e.data);
        data = openChannel(surfaceDataChannel(surface));
        if (win) {
          win.addEventListener('pagehide', onPageHide);
          win.addEventListener('pageshow', onPageShow);
        }
      }
      if (heartbeat === null) heartbeat = setRepeat(() => send(control, 'surface-heartbeat', {}), heartbeatMs);
      hello();
    },

    /** Offer the current publication now. Returns whether an offer was sent. */
    publish() {
      return offer();
    },

    claim() {
      send(control, 'surface-claim', {});
    },

    close({ keepListening = false } = {}) {
      if (!control) return;
      send(control, 'surface-bye', {});
      state.active = false;
      offeredThisTurn = false;
      if (heartbeat !== null) clearRepeat(heartbeat);
      heartbeat = null;
      if (keepListening) return; // pagehide: a bfcache restore resumes this instance
      if (win) {
        win.removeEventListener('pagehide', onPageHide);
        win.removeEventListener('pageshow', onPageShow);
      }
      control.close();
      data.close();
      control = null;
      data = null;
    },

    status: () => ({ ...state }),
  };
  return api;
}
