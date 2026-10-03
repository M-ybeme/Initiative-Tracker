/**
 * Live Share Milestone 5A.3: the session host's side of the surface boundary
 * (docs/live-share-session-host-architecture.md §5.3, §6). Runs only in the tab that owns the session
 * host Web Lock (live-share.html).
 *
 * It listens on the control channel and on one data channel per known surface type, checks every
 * message (surface-boundary.js), and keeps:
 *
 *   the registry   every surface instance (one page load) that said hello: surface type, version,
 *                  whether this host supports that version, liveness, and the last publicationSeq
 *                  it offered.
 *   the roles      one ACTIVE publisher per surface type. Others stay registered, inactive: their
 *                  offers are refused ('inactive'). takesRole() is the whole rule, in priority order:
 *                    1. an active tab that stopped responding (or is gone) yields to any responding tab;
 *                    2. an active tab with nothing to publish yields to a tab that has something, so
 *                       an empty tab never freezes players on old content;
 *                    3. a tab with nothing never takes the role from a tab that has something;
 *                    4. a claim ("publish from this tab"; protocol only before 5A.4) holds while the
 *                       claimed tab has something to publish: the claimed tab takes the role back with
 *                       its next hello, and no other tab takes it by registering or re-announcing;
 *                    5. otherwise the most recent registration wins: a new tab takes the role, and a
 *                       re-hello changes nothing, except for a tab "held back" at registration only
 *                       for being empty, which takes the role once it has something if it is still
 *                       newer than the active tab (and every tab older than a new active registration
 *                       loses that standing).
 *                  A claim stays with its tab until another tab is claimed; liveness doesn't erase it.
 *                  Within one host's lifetime only: a new host (reload, lock takeover) starts with an
 *                  empty registry, so the last tab to answer its host-hello wins, as for new tabs.
 *                  When the active tab says bye or stops responding, the most recently registered
 *                  other responding tab takes over, preferring one with something to publish.
 *   liveness       any message counts as a sign of life. An instance silent for NOT_RESPONDING_MS is
 *                  "not responding"; one that said bye is "closed". Liveness is status only: it drops
 *                  that instance's pending offer, never the committed publication, which players keep
 *                  and late joiners still get, with its assets.
 *
 * Offers are taken only while a session is running ('no-session' otherwise), only from the active
 * instance, only with a publicationSeq above every earlier one of that instance ('stale'). The
 * publication store (publication-store.js) validates them and commits; this file relays its answers
 * (publication-need / -committed / -rejected) to the offering instance only, and calls
 * onCommitted(surface) when players' state changed, so the host sends it at once (sendNow).
 *
 * Session status goes to surfaces as { running, players } (a count), never seats or credentials.
 */
import { CONTROL_CHANNEL, surfaceDataChannel, SURFACE_TYPES, HOST_ID, NOT_RESPONDING_MS, envelope, parseSurfaceMessage } from './surface-boundary.js';

// Registry records kept (closed and silent instances are forgotten first).
export const MAX_REGISTERED = 32;

/**
 * @param {object} options
 * @param {object} options.store                 createPublicationStore(...)
 * @param {Object<string, number[]>} options.supported   surface -> supported surfaceVersions
 * @param {(name: string) => BroadcastChannel} [options.openChannel]
 * @param {() => number} [options.now]
 * @param {(surface: string, result: object) => void} [options.onCommitted]  players' state changed
 * @param {() => void} [options.onChange]       registry, roles or publications changed (for the page)
 */
export function createSessionHostBoundary({
  store,
  supported,
  openChannel = (name) => new globalThis.BroadcastChannel(name),
  now = () => Date.now(),
  notRespondingMs = NOT_RESPONDING_MS,
  onCommitted = () => {},
  onChange = () => {},
}) {
  const instances = new Map(); // instanceId -> record
  const active = new Map(); // surface -> instanceId
  let registrations = 0;
  let session = { running: false, players: 0 };
  let control = null;
  const data = new Map(); // surface -> channel
  const stats = { messages: 0, refused: 0, lastRefusal: null, unknownInstance: 0, offers: 0, offersRefused: 0, commits: 0, rejections: 0, lastRejection: null };

  const post = (channel, msg) => {
    try {
      channel.postMessage(msg);
    } catch {
      // A closed channel (page going away): nothing to tell.
    }
  };
  const toSurface = (instanceId, type, fields) => control && post(control, envelope(type, HOST_ID, fields, instanceId));
  const broadcast = (type, fields) => control && post(control, envelope(type, HOST_ID, fields));
  const refuse = (error) => {
    stats.refused += 1;
    stats.lastRefusal = String(error).slice(0, 120);
  };
  const isSupported = (surface, version) => Array.isArray(supported[surface]) && supported[surface].includes(version);

  function sendRole(record, reason) {
    const isActive = active.get(record.surface) === record.instanceId;
    toSurface(record.instanceId, 'surface-role', { active: isActive, reason: isActive ? reason : record.compatible ? 'superseded' : 'incompatible' });
  }

  function setActive(record, reason) {
    record.heldBack = false;
    const prevId = active.get(record.surface);
    active.set(record.surface, record.instanceId);
    if (prevId && prevId !== record.instanceId) {
      store.dropPending(record.surface, prevId); // a former publisher's unfinished offer never commits
      const prev = instances.get(prevId);
      if (prev) sendRole(prev);
    }
    sendRole(record, reason);
  }

  // The most recently registered other compatible instance still responding takes the role,
  // preferring one with something to publish.
  function promoteAfter(record) {
    if (active.get(record.surface) !== record.instanceId) return;
    let next = null;
    const rank = (r) => (r.hasPublication ? 1 : 0);
    for (const r of instances.values()) {
      if (r === record || r.surface !== record.surface || !r.compatible || r.liveness !== 'open') continue;
      if (!next || rank(r) > rank(next) || (rank(r) === rank(next) && r.order > next.order)) next = r;
    }
    if (next) setActive(next, 'promoted');
  }

  // Whether `record` takes the role from the current active tab when it says hello. `registering`:
  // its first hello (a new registration), rather than a re-hello. The header lists the rule.
  function takesRole(record, registering) {
    const current = instances.get(active.get(record.surface));
    if (!record.compatible || current === record) return false;
    if (!current || current.liveness !== 'open') return true;
    if (!current.hasPublication) return record.hasPublication || registering;
    if (!record.hasPublication) return false;
    if (record.claimed) return true;
    if (current.claimed) return false;
    if (registering) return true;
    return record.heldBack && record.order > current.order;
  }

  function forgetOldest() {
    if (instances.size < MAX_REGISTERED) return;
    const rank = { closed: 0, 'not-responding': 1, open: 2 };
    let victim = null;
    for (const r of instances.values()) {
      if (active.get(r.surface) === r.instanceId) continue;
      if (!victim || rank[r.liveness] < rank[victim.liveness] || (rank[r.liveness] === rank[victim.liveness] && r.order < victim.order)) victim = r;
    }
    if (victim) instances.delete(victim.instanceId);
  }

  function alive(record) {
    record.lastSeen = now();
    if (record.liveness === 'open') return;
    record.liveness = 'open'; // back (a bfcache restore, or a hidden tab's late heartbeat)
    // It takes the role back only if no responding instance holds it meanwhile.
    const current = instances.get(active.get(record.surface));
    if (record.compatible && current !== record && (!current || current.liveness !== 'open')) setActive(record, 'promoted');
  }

  function hello(msg) {
    let record = instances.get(msg.from);
    if (record) {
      if (record.surface !== msg.surface || record.surfaceVersion !== msg.surfaceVersion) return refuse('an instance changed its surface or version');
      record.hasPublication = msg.hasPublication;
      alive(record);
      broadcast('session-status', { ...session });
      if (takesRole(record, false)) setActive(record, record.claimed ? 'claimed' : 'registered');
      else sendRole(record, active.get(record.surface) === record.instanceId && record.claimed ? 'claimed' : 'registered');
      return;
    }
    forgetOldest();
    record = {
      instanceId: msg.from,
      surface: msg.surface,
      surfaceVersion: msg.surfaceVersion,
      compatible: isSupported(msg.surface, msg.surfaceVersion),
      hasPublication: msg.hasPublication,
      order: ++registrations,
      lastSeen: now(),
      liveness: 'open',
      lastSeq: 0,
      lastResult: null,
      heldBack: false, // lost at registration only for being empty (rule 5)
      claimed: false, // the DM chose this tab (rule 4)
    };
    instances.set(record.instanceId, record);
    broadcast('session-status', { ...session });
    if (takesRole(record, true)) {
      // The newest registration is active: older tabs held back no longer outrank it.
      for (const r of instances.values()) if (r.surface === record.surface) r.heldBack = false;
      setActive(record, 'registered');
    } else {
      record.heldBack = record.compatible && !record.hasPublication;
      sendRole(record);
    }
  }

  function answer(record, publicationSeq, result) {
    record.lastResult = result.status === 'rejected' ? `rejected: ${result.reason}` : result.status;
    if (result.superseded) toSurface(result.superseded.instanceId, 'publication-rejected', { publicationSeq: result.superseded.publicationSeq, reason: 'superseded' });
    if (result.status === 'need') {
      toSurface(record.instanceId, 'publication-need', { publicationSeq, assetIds: result.assetIds });
    } else if (result.status === 'committed') {
      stats.commits += 1;
      toSurface(record.instanceId, 'publication-committed', { publicationSeq, revision: result.revision });
      if (result.changed) onCommitted(record.surface, result);
    } else if (result.status === 'rejected') {
      stats.rejections += 1;
      stats.lastRejection = result.reason;
      toSurface(record.instanceId, 'publication-rejected', { publicationSeq: result.publicationSeq || publicationSeq, reason: result.reason });
    }
  }

  function offer(record, msg) {
    stats.offers += 1;
    const refuseOffer = (reason) => {
      stats.offersRefused += 1;
      answer(record, msg.publicationSeq, { status: 'rejected', reason });
    };
    if (!record.compatible) return refuseOffer('incompatible');
    if (active.get(record.surface) !== record.instanceId) return refuseOffer('inactive');
    if (!session.running) return refuseOffer('no-session');
    if (msg.publicationSeq <= record.lastSeq) return refuseOffer('stale');
    record.lastSeq = msg.publicationSeq;
    record.hasPublication = true;
    answer(record, msg.publicationSeq, store.offer(record.surface, { instanceId: record.instanceId, publicationSeq: msg.publicationSeq, structured: msg.structured, assets: msg.assets }));
  }

  async function asset(surface, record, msg) {
    if (record.surface !== surface || active.get(surface) !== record.instanceId || !session.running) return refuse('asset from an instance that may not publish it');
    const result = await store.receiveAsset(surface, { instanceId: record.instanceId, publicationSeq: msg.publicationSeq, assetId: msg.assetId, meta: msg.meta, bytes: msg.bytes });
    // Also when the session ended while the bytes were hashed: ending clears the store, which
    // discards the pending publication, so nothing can commit after it.
    if (result.status === 'ignored') return refuse(`asset ignored: ${result.why}`);
    if (result.status !== 'waiting') answer(record, msg.publicationSeq, result);
    onChange();
  }

  function receive(raw, channel, surface) {
    stats.messages += 1;
    const parsed = parseSurfaceMessage(raw, channel);
    if (!parsed.ok) return refuse(parsed.error);
    const msg = parsed.message;
    if (msg.type === 'surface-hello') {
      hello(msg);
      return onChange();
    }
    const record = instances.get(msg.from);
    if (!record) {
      stats.unknownInstance += 1;
      return refuse('message from an unregistered instance');
    }
    if (msg.type === 'surface-bye') {
      record.lastSeen = now();
      record.liveness = 'closed';
      store.dropPending(record.surface, record.instanceId);
      promoteAfter(record);
      return onChange();
    }
    alive(record);
    if (msg.type === 'surface-claim') {
      if (record.compatible) {
        // The DM chose this tab: it replaces any earlier claim, and no held-back tab outranks it.
        for (const r of instances.values()) {
          if (r.surface !== record.surface) continue;
          r.heldBack = false;
          r.claimed = r === record;
        }
        setActive(record, 'claimed');
      }
      else sendRole(record);
    } else if (msg.type === 'publication-offer') {
      offer(record, msg);
    } else if (msg.type === 'publication-asset') {
      return asset(surface, record, msg);
    }
    onChange();
  }

  return {
    /** Open the channels and ask every open surface to announce itself. */
    start() {
      if (control) return;
      control = openChannel(CONTROL_CHANNEL);
      control.onmessage = (e) => receive(e.data, 'control');
      for (const surface of SURFACE_TYPES) {
        const channel = openChannel(surfaceDataChannel(surface));
        channel.onmessage = (e) => receive(e.data, 'data', surface);
        data.set(surface, channel);
      }
      broadcast('host-hello', { sessionActive: session.running });
    },

    /**
     * The session started, ended or its player count changed. Starting asks every surface to
     * announce itself again (its active publisher then offers); ending clears every publication.
     */
    setSession({ running, players = 0 }) {
      const next = { running: !!running, players: running ? players : 0 };
      if (next.running === session.running && next.players === session.players) return;
      const toggled = next.running !== session.running;
      session = next;
      if (!session.running) store.clear();
      if (toggled) broadcast('host-hello', { sessionActive: session.running });
      broadcast('session-status', { ...session });
      onChange();
    },

    /** Mark silent instances "not responding" (status only). Call every few seconds. */
    checkLiveness() {
      let changed = false;
      for (const r of instances.values()) {
        if (r.liveness !== 'open' || now() - r.lastSeen <= notRespondingMs) continue;
        r.liveness = 'not-responding';
        store.dropPending(r.surface, r.instanceId);
        promoteAfter(r);
        changed = true;
      }
      if (changed) onChange();
    },

    /** The page is going away: tell surfaces Live Share stopped, and stop listening. */
    close() {
      if (!control) return;
      broadcast('session-status', { running: false, players: 0 });
      control.close();
      for (const channel of data.values()) channel.close();
      data.clear();
      control = null;
    },

    /** For the page: each registered instance's state, with a short id (not a secret, just long). */
    surfaces() {
      return [...instances.values()]
        .sort((a, b) => b.order - a.order)
        .map((r) => ({
          surface: r.surface,
          instance: r.instanceId.slice(0, 8),
          surfaceVersion: r.surfaceVersion,
          compatible: r.compatible,
          active: active.get(r.surface) === r.instanceId,
          hasPublication: r.hasPublication,
          heldBack: r.heldBack,
          claimed: r.claimed,
          liveness: r.liveness,
          lastResult: r.lastResult,
        }));
    },

    diagnostics() {
      return { ...stats, session: { ...session }, surfaces: this.surfaces(), store: store.diagnostics() };
    },
  };
}
