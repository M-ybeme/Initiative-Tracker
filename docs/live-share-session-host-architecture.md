# Live Share: session ownership across Toolbox pages (architecture decision)

*Decided 2026-10-02, before Milestone 5. This record governs Milestones 5 and 7 and the future Initiative Tracker surface. Linked from `DMS_Toolbox_Live_Share_Planning.md` §4, §5, §24 and §27. Implemented so far: the session host page (5A.2) and the surface boundary with the host publication store (5A.3, §6.1). The Battle Map still uses its prototype host until 5A.4.*

## 1. The problem

**The product goal** (planning doc §1, §27): one Live Share room, joined once per player, used by the Battle Map and later the Initiative Tracker. That means:
- one room, one seat/admission model and one password/lock state;
- one temporary credential per admitted seat;
- one WebRTC connection per player.

**What makes this hard:**
- The Battle Map (`battlemap.html`) and the Initiative Tracker (`initiative.html`) are separate pages, often in separate tabs or windows.
- An `RTCPeerConnection` and its data channels belong to the page (browsing context) that created them.
- Two pages cannot both drive one connection.
- Milestone 5 is about to build the long-lived session owner (seats, password, admission, lock, kick/reset, credentials, connection status, session end). Building it into `battlemap.html` would make the Battle Map the permanent owner of Live Share by accident.

## 2. How Milestones 0–4 actually own things (as built)

Traced from the call paths, not the file names:

- **One module does all of it.** `js/battlemap-live-share.js` runs inside `battlemap.html?liveshare=1` and composes:
  - the room: `HostSession`, which wraps `SignalingClient` and one `PeerLink` per player;
  - the snapshot sender and the asset sender;
  - the player message handling;
  - the development panel (Start / Copy link / End / peer list / diagnostics);
  - the session's life: `pagehide` ends it.
- **What it reads from the Battle Map.** Only the seam, `window.BattleMapLiveShare`:
  - `getPlayerSafeState`, `onShareableStateChanged`;
  - `getAsset` / `hasAsset`;
  - `hasPublishedState`, `savedMapProblem`;
  - `getAssetDiagnostics`.
- **Where the published assets live.** Only in the Battle Map page's memory: `BattleMapShareAssets.createShareAssets`, retained by `BattleMapPublication`.
- **Revisions are per page load.**
  - The structured snapshot revision (`createShareStateSeam`) starts at 1 when `battlemap.html` loads.
  - So does the background revision (`createShareAssets`).
  - The player accepts only revisions newer than its last.
- **The relay** (`relay/room-core.mjs`, the same code locally and on Cloudflare):
  - one host socket per room; a second host is refused with `HOST_EXISTS`;
  - when the host's socket closes, every peer is closed with `HOST_LEFT`, so the room ends at once;
  - `maxPeersPerRoom: 1`, the Milestone 0 limit, still in force.
- **The player** (`liveshare-dev.html` + `js/live-share-dev.js`):
  - one page, which is both the Milestone 0 "hello" host (no `#room`) and the player (`#room=…`);
  - it routes `battlemap-snapshot` and `asset-*` messages;
  - it keeps nothing in `sessionStorage` or `localStorage`.
- **Nothing in Live Share uses `sessionStorage`**, so a reload of either side ends the session.

Classification:

| Code | A: generic Live Share infrastructure | B: Battle Map-specific | C: tied to `battlemap.html` only because it was a prototype |
|---|---|---|---|
| `relay/*` (room core, Node relay, Worker, TURN credentials) | A (`maxPeersPerRoom: 1` is a Milestone 0 limit) | | |
| `live-share/signaling-client.js`, `peer-link.js`, `ice-config.js`, `room-id.js`, `config.js` | A | | |
| `live-share/host-session.js` (room + one link per player) | A | | |
| `live-share/snapshot-sender.js` | A (throttle, backpressure, latest wins) | imports `encodeBattleMapSnapshot` | |
| `live-share/protocol.js` | A (envelope, size limit) | routes `battlemap-snapshot` to its validator | |
| `live-share/asset-protocol.js`, `asset-sender.js`, `asset-cache.js` | A (ids, chunks, pacing, cache) | asset kinds and limits (`background`, `token`) | |
| `battle-map-share-state.js`, `battle-map-publication.js`, `battle-map-share-assets.js`, `battle-map-token-presets.js` | | B (projection, save gating, composition) | |
| `live-share/battlemap-snapshot.js`, `battlemap-view.js`, `player-view.js` | | B (player side of the Battle Map) | |
| `js/battlemap-live-share.js` | | B: the seam bridge (about 10 lines) | **C: the whole session owner (room, peers, senders, panel, lifetime)** |
| `js/live-share-dev.js` / `liveshare-dev.html` | | | player: prototype page; host mode: Milestone 0 harness, to retire |

So the generic layers are already generic. What is in the wrong place is the composition: session ownership lives in one Battle Map file. Moving it is a relocation of about 300 lines, not a rewrite.

## 3. The browser constraint, checked

A probe (2026-10-02, Playwright, Chromium 143 and Firefox 144):

| Question | Chromium | Firefox |
|---|---|---|
| `structuredClone(RTCPeerConnection)` / `BroadcastChannel.postMessage(pc)` | DataCloneError | DataCloneError |
| transfer an `RTCDataChannel` | DataCloneError | DataCloneError |
| `RTCPeerConnection` in a dedicated worker / a shared worker | no / no | no / no |
| BroadcastChannel transfer list | none (always copies) | none (always copies) |
| 16 MiB `ArrayBuffer` through BroadcastChannel (copy) | 43 ms | 44 ms |
| Web Locks (`navigator.locks`) | yes | yes |

- Playwright's Windows WebKit build has no WebRTC, so Safari wasn't probed.
- The WebRTC spec exposes `RTCPeerConnection` to `Window` only. Transferable data channels are a spec extension, which these engines refused.
- Service workers have no WebRTC.
- The design therefore assumes no worker of any kind can own a connection.

**Consequence.** "The same WebRTC connections" can only mean this: **one browsing context owns the room and all player connections, and every shared Toolbox surface publishes through it.** No page manipulates another page's connection objects.

## 4. Options considered

**Option A: the Battle Map stays the session owner, and the Initiative Tracker talks to it over BroadcastChannel.**
- *For:* least change from today.
- *Against:*
  - The Battle Map becomes a special root page. Closing it, or reloading it after a crash, ends all sharing, Initiative Tracker included.
  - The Initiative Tracker can't share unless a Battle Map tab is open.
  - Milestone 5's seats, password and admission would be built into the wrong owner, and moving them later is exactly the extraction this decision avoids.
  - Every Battle Map reload already ends the room today (`pagehide` → `end()`), so a Battle Map crash costs the whole table its connection.
- It also doesn't escape the hidden-tab issue (§9): when the DM works in the Initiative Tracker, the Battle Map owner is the hidden tab.
- **Rejected.**

**Option B: each surface hosts its own room and connections.**
- *Cost:*
  - two rooms and two join links per player (or a player page juggling two rooms);
  - two seat tables, which kick, reset and lock must keep in step;
  - two passwords and two credentials per seat;
  - two WebRTC and TURN connections per player, doubling TURN use;
  - reconnect handled twice;
  - per-surface seats that can disagree ("Caleb" admitted to the map but not the tracker).
- It directly contradicts "players join once" and "one seat model".
- **Rejected.**

**Option C: a dedicated Live Share session host page.**
- A same-origin, visible page owns the room, signaling, peer connections, data channels, seats, admission, password, lock, credentials, kick/reset, status, session life and protocol routing.
- The Battle Map and the Initiative Tracker are **surface publishers** that talk to it over same-origin messaging.
- *For:*
  - the session's life is independent of any one surface;
  - one obvious owner for the DM to keep open;
  - it matches the existing layering: the generic modules move with the owner, and the surfaces keep their seams.
- *Costs:*
  - one more tab;
  - published assets must be copied to the host;
  - new failure modes: surface liveness, duplicate surface tabs, version skew between tabs;
  - the session host is often a hidden tab.

**Option D, also considered: one "Live Share shell" page that hosts the Battle Map and the Initiative Tracker in same-origin iframes.**
- *For:* one browsing-context tree, direct calls, no copies, and the shell stays visible.
- *Against:*
  - the surfaces would have to work inside an iframe (navigation, Bootstrap modals, keyboard shortcuts, the Battle Map's full-window canvas sizing);
  - the DM couldn't use separate windows or monitors for the map and the tracker;
  - a large UX change.
- **Not chosen for V1.** It stays the fallback if §9's hidden-tab spike shows a hidden host tab can't keep sessions alive. *(The spike, 2026-10-02, showed that a hidden host does keep sessions alive in desktop Chrome and Firefox; Safari is pending, §9.)*

## 5. Decision

**Option C. A dedicated, visible Live Share session host page owns the session; Toolbox surfaces publish to it.**

### 5.1 What the session host is

- **A normal, visible Toolbox page:** `live-share.html` (served as `/live-share`; decided and built in 5A.2, with its module `js/live-share-host.js`). The DM starts Live Share there and keeps the tab open while the session runs. Its header says plainly that this page keeps Live Share running, and that closing it ends the session for everyone.
- **How it's opened:**
  - from a "Live Share" entry in a surface: Battle Map, later the Initiative Tracker;
  - or directly.
  - Surfaces open it with `window.open(url, 'dmtoolbox-live-share')`, a fixed window name, so a second click focuses the same tab instead of opening another.
  - The host links to the surfaces with fixed window names too (`dmtoolbox-battle-map`, `dmtoolbox-initiative`).
- **Only one per browser profile:** it takes an exclusive Web Lock (`navigator.locks`, for example `dmtoolbox.live-share.session-host`). A second host tab finds the lock held and shows "Live Share is already running in another tab" instead of starting a second room.
- **What lives only in its memory:**
  - the room's signaling socket and every `RTCPeerConnection` / data channel;
  - the seat table, password verifier, lock state and issued credentials (Milestone 5);
  - the current committed publication of each surface, with its assets;
  - the registry of open surfaces;
  - per-player send state.
- **What goes in `sessionStorage`:** nothing in Milestone 5. Milestone 7 adds what host-refresh recovery needs (§10).
- **What never goes to the relay or any server:** seats, passwords, credentials, game state, assets. Unchanged (§2.4, §20).

### 5.2 Invariant: one room, one connection

For one DM Live Share session:
1. exactly one browser-side session owner: the session host page, made exclusive by the Web Lock;
2. exactly one logical room on the relay, with one host socket (the relay already refuses a second host, `HOST_EXISTS`);
3. one seat/admission namespace (seats, password, lock, credentials), owned by the session host;
4. one active peer connection per connected player, created by the session host;
5. every enabled shared surface is multiplexed over that one connection;
6. a surface never creates signaling or WebRTC objects, and never sees seats, passwords or credentials.

The host keeps the per-surface rules intact:
- each surface has its own player-safe projection, schema, validator and revision stream;
- the Battle Map stays save-gated, and the Initiative Tracker will publish immediately;
- there is no global "game revision".

### 5.3 Lifecycle

| Event | Milestone 5 behavior | Milestone 7 and later |
|---|---|---|
| DM opens the session host and starts a room | Takes the lock. Registers the room on the relay. Shows the join link and seats. Asks any open surfaces to announce themselves | — |
| A surface opens (or was already open) | Registers with the host: surface type, instance id, protocol version. If it has a published state it offers it (the Battle Map offers its last save; publishSavedRecord exists already) | — |
| Battle Map Save | Builds the publication on the Battle Map side (as today). Offers it to the host, which takes it only once all its assets have arrived, then sends it to players | — |
| Battle Map closes | It sends `unregister` on `pagehide`. The host marks the surface "not open" for the DM. **The committed publication and its assets stay**: players keep the map, late joiners still get the map and its assets, and nothing new arrives until it reopens | — |
| Battle Map reloads | Unregisters, then registers again and offers its saved state. The host compares by content, so an unchanged map is not a new revision and no assets move | — |
| Initiative Tracker opens or closes (future) | The same generic availability rule. How players see a closed tracker is the tracker's decision, made when it is designed (§12) | — |
| A surface crashes or hangs (no `unregister`) | A heartbeat with a generous timeout eventually marks it "not responding". **Liveness only affects the DM-facing status, never the committed publication** | — |
| Player disconnects | Its link closes and its seat shows "Disconnected" (seat stays claimed). No automatic re-admission | Reconnect with the seat credential |
| Session host reloads | Today's behavior, made explicit: the host socket closes, the relay ends the room (`HOST_LEFT`), players are told the session ended | Grace period and resume (§10) |
| Session host closes (End, tab closed, crash) | The session ends: players get session-ended, connections close, credentials are discarded, surfaces show "Live Share not running" and keep working locally. A `beforeunload` warning protects the host tab while players are connected | — |

## 6. The surface ↔ session host boundary

**Transport:** `BroadcastChannel`, same-origin, between same-profile tabs.
- One **control channel** (`dmtoolbox.live-share.control`) carries registration, discovery, liveness and publication negotiation.
- Each surface type has a **data channel** (for example `dmtoolbox.live-share.surface.battle-map`) for asset bytes, so 16 MiB backgrounds are copied only to the host and to other tabs of the same surface, never to the Initiative Tracker.
- BroadcastChannel copies (no transfer list); measured at about 44 ms for 16 MiB, and paid only for assets the host doesn't hold yet.
- It has no delivery acknowledgement or disconnect event, so the protocol adds acknowledgements and liveness.

**Envelope:**

```text
{ ch: 'dmtoolbox.live-share', v: <boundary protocol version>, type, from: <instanceId | 'host'>, to?: <instanceId>, ...payload }
```

Every message is validated against its type's schema; unknown types and versions are ignored.
- The host validates surface messages as strictly as players validate host messages: the same `validateBattleMapSnapshot`, asset metadata, size limits and hash check.
- Same-origin doesn't mean well-formed: an old cached tab, a bug or an injected script could post anything.

**Surface → host:**
- `surface-hello { surface: 'battle-map' | 'initiative', surfaceVersion, hasPublication }`, on load and in answer to `host-hello`. The instance id travels in the envelope's `from`.
- `surface-heartbeat`: about every 5 s. Browsers throttle it in hidden tabs, to about once a minute, so the timeout is long and only affects status.
- `publication-offer { publicationSeq, structured, assets: [{ assetId, kind, mime, width, height, byteLength }] }`
  - `structured` is the player-safe snapshot content, without a revision.
  - `publicationSeq` increases per instance.
- `publication-asset { publicationSeq, assetId, meta, bytes: ArrayBuffer }`, on the surface data channel, answering `publication-need`.
- `surface-bye`, on `pagehide`.

**Host → surface:**
- `host-hello { sessionActive }`: on start and reload, so every open surface announces itself again.
- `publication-need { publicationSeq, assetIds }`: the content-addressed ids the host doesn't already hold.
- `publication-committed { publicationSeq }` / `publication-rejected { publicationSeq, reason }`, so the surface can show "players updated" or the problem.
- `surface-role { active: true | false }`: the duplicate-tab rule below.
- `session-status { running, players: <count only> }`, for the surface's small status indicator.
- Never seats, names, passwords or credentials.

**Committing a publication**, which keeps 2.3.27's "structured state and background together" rule across pages:
1. The surface offers the structured state and its asset list.
2. The host requests the missing assets; usually none for a token-only save.
3. When every asset has arrived and verified (SHA-256 equals its id, limits respected), the host commits atomically:
   - it replaces that surface's current publication;
   - it assigns the next **host-side** revision for the surface;
   - it releases assets no longer referenced;
   - it sends the snapshot to admitted players.
4. A newer offer from the same instance supersedes an unfinished older one (latest saved state wins).
5. An offer whose instance leaves before completing is dropped; the committed publication is untouched.

**Revisions:**
- The surface's own counters start at 1 on every page load, so the host must not forward them.
- It keeps a per-surface session revision that rises only when the committed content changes (compared by value, like the seam today).
- For the Battle Map it also keeps the background revision monotonic within the session.

**Duplicate surface tabs** (two Battle Map tabs):
- One instance per surface type is the **active publisher**: the most recently registered one, or the one where the DM presses "Publish from this tab".
- The others get `surface-role { active: false }`, show "Live Share is using another Battle Map tab", and their offers are ignored.
- Both edit the same stored map anyway, since the Battle Map persists to one IndexedDB record.

**Version skew:**
- `surfaceVersion` and the boundary `v` must match what the host understands.
- On a mismatch the host ignores the surface and tells the DM to reload that tab; a cached old Battle Map never feeds a new host malformed state.

### 6.1 As implemented in 5A.3 (2026-10-03)

**Modules** (all in `js/modules/live-share/`):
- `surface-boundary.js`: the protocol. Constants, envelope, and the checks of every message in both directions.
- `session-host-boundary.js`: the host side. Registry, roles, liveness and session gating; it relays the store's answers.
- `publication-store.js`: the host publication store. Offer, need, asset, atomic commit, host revisions, asset retention.
- `battlemap-publication.js`: the Battle Map's boundary format. Validation reuses the players' `validateBattleMapSnapshot`; also the conversion to the player wire snapshot.
- `surface-publisher.js`: the surface side, for the 5A.4 Battle Map adapter. In 5A.3 only the test publisher uses it (`tests/fixtures/live-share-test-publisher.*`, which works only on localhost).
- `live-share.html` / `js/live-share-host.js` run the host side only while the tab owns the Web Lock. A waiting tab never answers surfaces.

**Protocol:**
- **Version and channels:** boundary protocol `v: 1`, marker `ch: 'dmtoolbox.live-share'`. The control channel is `dmtoolbox.live-share.control`; each surface type has a data channel, `dmtoolbox.live-share.surface.<surface>`.
- **Surface types:** `battle-map`, and `initiative` reserved. An Initiative Tracker may register, but the host supports no version of it, so it can't publish.
- **Messages:** as listed above, with these additions:
  - `surface-claim {}`, the "publish from this tab" request. The protocol only: no UI before 5A.4.
  - `surface-role` carries a `reason`: `registered`, `claimed`, `promoted`, `superseded` or `incompatible`.
  - `publication-committed` carries the host `revision`.
  - Rejection reasons are a fixed set: `no-session`, `inactive`, `incompatible`, `stale`, `invalid`, `limit`, `asset-invalid`, `superseded`. Never raw error text.
- **Checks on every message:**
  - The envelope: marker, version, type, sender id format, and the recipient (`to: 'host'` for surface messages; host messages are either broadcast or addressed to one instance).
  - Exactly the fields of the message's type: an unknown field refuses the message. Asset bytes go only on a data channel, as an `ArrayBuffer`.
  - Instance ids identify, they don't authenticate.

**Registration and roles:** one active publisher per surface type. Other tabs stay registered but inactive, and their offers are refused (`inactive`). The host decides with one rule (`takesRole` in `session-host-boundary.js`), checked in this order whenever a tab says hello, whether a new registration or a re-hello:
1. **An active tab that stopped responding** (or is gone) yields to any responding tab.
2. **An active tab with nothing to publish** yields to a tab that has something. An empty tab (still loading, or without a map) never freezes players on old content.
3. **A tab with nothing to publish never takes the role** from a tab that has something.
4. **A manual claim** ("publish from this tab": the `surface-claim` message; the Battle Map's button is 5A.4):
   - It remains authoritative while the claimed tab has a publication to offer. It outranks ordinary registration recency: neither a newly opened tab nor a re-announcing one takes the role from it.
   - An empty claimed tab does not block a publication-bearing tab from becoming active (rule 2). When the claimed tab later has something, its next hello takes the role back.
   - A claim stays with its tab until another tab is claimed. Losing and regaining liveness doesn't erase it: a claimed tab that was replaced while not responding takes the role back with its next publication.
5. **Otherwise, the most recent registration wins:**
   - A newly registered tab takes the role, and every older tab loses any "held back" standing.
   - A re-hello changes nothing, except for a tab **held back** at registration only for being empty. That tab takes the role once it has something, but only while it is still newer than the active tab (an order check, not just the flag).

**What triggers a hello:**
- A tab says hello on load and in answer to `host-hello`.
- A tab that is not the publisher but has something to publish also says hello once, at its next `publish()`, when it hasn't yet told the host. A tab that just lost the role re-arms that: at most one hello per role lost, never one per publish, and heartbeats never trigger it.
- So a publisher that stopped responding while an empty tab was promoted recovers with its next publication, without waiting for a `host-hello`.

**Within one host's lifetime only:**
- A new host (a host page reload, or a waiting tab taking over the Web Lock) starts with an empty registry, so the last tab to answer its `host-hello` wins, as for newly opened tabs.
- Keeping the DM's chosen tab across a host restart, for example with a "was active" hint in `surface-hello`, is a follow-up for 5A.4 / Milestone 7.

**Takeover on bye or silence:** when the active tab says bye or stops responding, the most recently registered other compatible tab that is still responding takes over, preferring one with something to publish. A deactivated tab's pending offer is dropped.

**Registry bound:**
- At most 32 records. A new registration evicts, in order: a closed tab, then a not-responding one, then the oldest open inactive one. Never the active publisher.
- An evicted tab that is still open is ignored (its messages are refused as unregistered) until it says hello again: at the next `host-hello`, or when it has something new to announce.
- There is deliberately no host → surface "please say hello again" request. One would need rate limiting against spoofed ids.

**Liveness (status only):**
- A heartbeat about every 5 s; any message counts as a sign of life.
- After 150 s of silence an instance is "not responding". After a bye it is "closed". A later message brings it back (for example a bfcache restore).
- Either way, only its pending offer is dropped. The committed publication and its assets stay: players keep them and late joiners get them.

**Session gating:**
- Offers are taken only while a room is open (`no-session` otherwise). An offer refused for that reason doesn't count against the tab's `publicationSeq`.
- Opening the room broadcasts `host-hello { sessionActive: true }`. Surfaces announce themselves again, and the active one offers its current state once.
- Ending the session clears the store, revisions included: a new session is a new room with new players.
- Surfaces get `session-status { running, players }`, a count only.

**Offers and the store:**
- **Validation:**
  - `structured` is the player snapshot content without revisions: no top-level `revision`, and the background as `{ assetId }` only.
  - The host checks it with the players' own validator. It also refuses any revision field and any field beyond the allowlist (refused, not dropped), and content too large to send.
  - The asset list must name exactly the assets the content references, each with the right kind, within the Milestone 3 per-kind limits.
  - The total token art of one publication must stay within 64 MiB, a host memory bound. Each token image is at most 1 MiB as before.
- **Assets:**
  - Only missing ids are requested.
  - An asset is taken only:
    - for the pending offer's seq, from its instance, on its surface's data channel;
    - for an id still missing, with exactly the offered metadata and byte length;
    - with the claimed PNG/WebP signature, and a SHA-256 equal to the id.
  - Wrong bytes reject the pending offer. Stale or unrequested ones are ignored.
  - A hash that finishes after its offer was superseded is discarded.
- **Commit:**
  - Once every referenced asset is held, one assignment replaces the committed publication: content, revisions and asset references together.
  - Pending state is never served: the senders read only the committed snapshot and committed assets.
- **Retention:** committed assets stay until the replacement commits. Then anything neither the committed nor the pending publication references is released. A newer offer supersedes an unfinished one (latest wins), and keeps any assets it shares with it.
- **Revisions:**
  - **Snapshot revision:** per surface, +1 only when the committed content changes by value. An identical re-offer, including one from a reloaded tab, commits nothing new.
  - **Background revision:** +1 only when the committed background asset changes. A token-only save keeps it.
  - Both only rise within a session: A → B → A is three revisions.

**Serving players:**
- The host page's `SnapshotSender` reads the committed Battle Map snapshot from the store. A commit calls `sendNow()` from the commit event (outcome B), so a hidden host's timers aren't on the path.
- The `AssetSender` reads `getAsset` / `hasAsset` from the store, and is told `assetsChanged()` on commit, so a replaced background's transfer ends `superseded`.
- The player wire format is the unchanged Milestone 0–4 one, so the Battle Map is the only surface players can be sent until protocol v1 (5B).

**Tests:** `tests/unit/live-share-publication-store.test.js` and `tests/unit/live-share-surface-boundary.test.js`, with an in-memory BroadcastChannel; and `tests/e2e/live-share-surface-boundary.spec.js`, with real browsers, the real host page and the real player page.

**Mutation checks:** each invariant was broken on purpose and a test failed:
- offers from an inactive tab;
- commit before the assets;
- a surface revision trusted;
- a new revision for identical content;
- the background revision bumped on every commit;
- assets released on offer instead of commit;
- no SHA-256 check;
- no byte-length check;
- a late superseded asset accepted;
- an asset for another seq;
- a stale seq accepted;
- a heartbeat timeout or bye clearing the publication;
- a re-hello stealing the role;
- unknown fields dropped instead of refused;
- an asset accepted on another surface's channel;
- any boundary version or recipient accepted;
- the host page using the timer path instead of `sendNow()`;
- after the review: a hash still running at session end committing into the cleared store;
- surfaces counting each other's messages as protocol errors;
- after the second review, the role rule, each change caught by a named test:
  - no hello after a lost role: the silence → return case;
  - a hello on every publish of an inactive tab;
  - stale "held back" standing kept after a newer registration: the A / B / C case;
  - no order check on a held-back takeover: the ordering case;
  - an empty tab taking the role from one with something;
  - an empty active tab freezing sharing;
  - a claim not outranking recency;
  - a claimed tab unable to take the role back;
  - a re-hello stealing the role;
  - a claim not recorded;
- registry eviction preferring open tabs over closed ones, or evicting the active publisher.

The boundary's own "assets only from the active instance" check survives its mutation, because the store's instance check (itself mutation-tested) refuses the same bytes. It is kept as a second guard.

## 7. Assets when the Battle Map isn't the WebRTC owner

- **What's sent to the host:** only player-safe output, the same bytes players get today.
  - The Battle Map still composes the player-visible background (map + fog baked in) and prepares custom token art on its own side (§15).
  - The original map image, the fog canvas and token image sources never leave the Battle Map.
- **What the host holds:** a **publication asset store** keeping exactly the assets referenced by each surface's current committed publication, plus any pending offer's. That is about one background of at most 16 MiB plus token art of at most 1 MiB each, per surface.
- **Retention rule, preserved:** assets stay until the replacing publication commits.
- **No history, no persistence:** in memory only, discarded when the session ends.
- **The players' side is unchanged:** players request assets from the host and the host answers from its store, so the existing asset protocol, pacing and limits apply unchanged.
- **The Battle Map may close after publishing;** players and late joiners keep getting its last published map and assets from the host.
- **Copy cost:** BroadcastChannel copies; a new background costs one copy into the host (about 44 ms for 16 MiB) plus the host's hash check. Unchanged assets are never sent again, since ids are content-derived.
- **Only one place keeps it, deliberately:** while it's open, the Battle Map keeps its own publication store as it does today (it still drives composition and dedup). Its copy and the host's are the same bytes. The Battle Map needs no separate asset-store abstraction beyond its existing `getAsset(id)`.

## 8. One connection, several surfaces: the player protocol

What the player receives over its one data channel is routed by **type** and, for surface traffic, by **surface**. The generic layer knows no D&D semantics.

```text
session-level   admission-state, join-result, session-state { surfaces: [{ surface, available }] }, session-ended
surface-level   surface-snapshot { surface: 'battle-map', revision, payload }   → that surface's validator + renderer
assets          asset-request / asset-meta / chunks / asset-abort   (content-addressed ids; kinds per surface)
interactions    ping (Milestone 6)
```

- Each surface registers `{ surface, validate(payload), onSnapshot }` with the player's router. Validators stay explicit schemas (the Battle Map keeps its versioned `dmtoolbox.battlemap.player-safe` payload).
- Revisions are per surface: the Battle Map has its snapshot and background revisions; the Initiative Tracker will have its own stream.
- **Wire change:** the move from today's `{ v: 0, type: 'battlemap-snapshot', payload }` to a `surface-snapshot` envelope is one protocol version bump.
  - It comes with Milestone 5B's admission messages, since the player page changes then anyway.
  - Milestone 5A keeps today's wire format, so moving the session owner changes nothing players see.

## 9. Hidden-tab behavior (Milestone 5A.1 spike, 2026-10-02)

**Result: outcome B, a narrow event-driven adjustment.**
- The dedicated session host stands, in desktop Chrome and Firefox.
- A hidden owner tab stayed connected and correct for more than 10 minutes behind another tab, and then for 1 minute minimized.
- Every event arrived promptly. Only the snapshot sender's timers were throttled.
- **Safari: manual validation required** (below). The spike could not run it here.

### What was tested

- **Harness:** `tests/perf/hidden-host/` (test only; `node tests/perf/hidden-host/run-spike.mjs --browser chrome|firefox`).
- **The future topology, with the real modules:**
  - a visible **publisher** tab (Battle Map-like; the real `projectPlayerSafeState`);
  - BroadcastChannel to a **hidden owner** tab, which runs the real `HostSession`, `SignalingClient`, `PeerLink`, `SnapshotSender` and `AssetSender`;
  - WebRTC to the real `liveshare-dev.html` **player** page, with the local relay for signaling.
- **Measurements:**
  - structured publications (5–10 per phase);
  - a burst of 3 (latest wins);
  - 5 player → owner messages;
  - a 16 MiB background, publisher → owner → player (hash-checked);
  - a newer structured publication sent while that background was in flight.
- **Phases:** owner visible; owner just hidden; owner hidden for 1, 5 and 10 minutes; window minimized for 1 minute after that.

**How the owner was genuinely hidden.** Playwright couldn't be used for the owner: it keeps pages focused and visible, and its Chromium launch disables background throttling.
- Tabs opened through Chrome's CDP stayed "visible" too, which was checked.
- So the owner and publisher ran in the **installed** Chrome 154 and Firefox 157, with throwaway profiles and **no** automation or remote-debugging protocol.
- Tabs were opened the way the OS opens a link: a URL handed to the running browser.
- The owner was hidden by a newer tab in front of it, as when the DM switches to the Battle Map, and later by minimizing the window.
- **Proof that it was hidden:**
  - the owner's own `document.visibilityState` and `visibilitychange` events;
  - a **control tab** with no WebRTC beside it, which reported `hidden` and throttled timers;
  - the owner's own timers dropping to about 1 s.
- **One environment setting, not a throttling setting:** each browser's native "window covered by other windows" detection was turned off (Chrome `--disable-features=CalculateNativeWinOcclusion`, Firefox `widget.windows.window_occlusion_tracking.enabled=false`).
  - On this automated desktop it misjudged windows: a front tab reported hidden, and later tabs never hid. This was checked by experiment.
  - Tab switching and minimizing still hide pages exactly as for a user.
  - Timer throttling and background-tab policies stayed at the browser defaults.

### Results (medians, with ranges, in ms)

**Chrome 154:**

| Owner | Structured publish → player applied | BroadcastChannel (16 MiB) | 16 MiB save → visible | Newer structured state during the 16 MiB transfer | Player → owner | Owner timer (100 ms asked) | Connection |
|---|---|---|---|---|---|---|---|
| visible | 3 (3–6) | 28 | 4790 ¹ | 4292 (snapshot sent after 77; delivery delayed with the transfer ¹) | 0 | ~95 | connected/open |
| hidden, just | 3 (3–18) | 27 | 534 | 622 (all of it the sender's throttle timer) | 0 | ~1000 | connected/open |
| hidden 1 min | 3 (3–3) | — | — | — | 0 | ~1000 | connected/open |
| hidden 5 min (10 publications) | 3 (3–3) | 38 | 480 | 808 (throttle timer 805) | 0 | ~1000 | connected/open |
| hidden 10 min | 3 (3–4) | 28 | 536 | 127 (timer 123) | 0 | ~1000 | connected/open |
| minimized 1 min | 3 (2–3) | 27 | 471 | 591 (timer 587) | 0 | ~1000 | connected/open |

**Firefox 157** (visible baseline from a separate run with the owner as the first tab):

| Owner | Structured publish → player applied | BroadcastChannel (16 MiB) | 16 MiB save → visible | Newer structured state during the 16 MiB transfer | Player → owner | Owner timer (100 ms asked) | Connection |
|---|---|---|---|---|---|---|---|
| visible | 2 (2–5) | 43 | 440 | 89 (timer 60) | 0 | ~100 | connected/open |
| hidden, just | 497 (489–608) | 40 | 600 | 998 (timer 995) | 0 | ~1000 | connected/open |
| hidden 1 min | 499 (142–516) | — | — | — | 0 | ~1000 | connected/open |
| hidden 5 min (10 publications) | 490 (481–702) | 39 | 689 | 977 (timer 974) | 0 | ~1000 | connected/open |
| hidden 10 min | 500 (483–684) | 42 | 681 | 983 (timer 980) | 0 | ~1000 | connected/open |
| minimized 1 min | 499 (441–501) | 39 | 745 | 998 (timer 993) | 0 | ~1000 | connected/open |

**In every phase of both browsers:**
- BroadcastChannel delivery of structured publications took 0–2 ms.
- Bursts of 3 always ended on the latest state, in order.
- Asset hashes matched.
- No freeze, discard or `pagehide` was seen.
- The peer connection and data channel stayed `connected/open` throughout.

¹ **Chrome, owner visible only:**
- The 16 MiB transfer took 4.6 s instead of about 0.4 s. The asset sender's 100 ms fallback timer fired 38 times, so `bufferedamountlow` arrived late.
- The newer structured snapshot left the owner after 77 ms but reached the player 4.3 s later, behind that slow transfer.
- It happened in every Chrome run with the owner in front, and never when it was hidden, nor in Firefox.
- It is below the thresholds and not part of the hidden-tab question. **Re-check it once assets flow through the real session host page** (5A.3 / 5A.4), which is normally *not* the front tab. In 5A.2 no assets reach that page yet, so it couldn't be re-checked there.
- **Re-checked in 5A.3 (2026-10-03)**, on the real path: test publisher → BroadcastChannel → real session host page → production `AssetSender` → real player page. This was in Playwright Chromium with every page visible; the spec is `live-share-surface-boundary.spec.js`, the 16 MiB test.
  - **It reproduces in every run,** and it is not the boundary:
    - publish → the player's committed snapshot took 0.1–0.4 s for a 16 MiB background, copy and hash included;
    - the host sent a structured save made during the transfer within the commit event (sent revision checked in the same panel update).
  - **The stall:**
    - A few dozen milliseconds into the transfer, after about 100 chunks (1.6 MB), the data channel delivered **nothing** to the player for about 4 s.
    - Meanwhile the host's `bufferedAmount` sat near 49 KiB without draining, and the asset sender's 100 ms fallback timer fired 38 times, the same count as in 5A.1.
    - Then it resumed at full speed (chunks 200–900 in 0.5 s).
    - The save's snapshot, on the same ordered channel, arrived with that burst: 3.9–5.9 s after the save, against about 4.3 s in 5A.1.
  - **What it is:** a transport-level stall below both senders, not starvation by them. That it is an SCTP retransmission timeout after the opening burst on loopback is inferred, not proven.
  - **Not a correctness problem:** every byte arrives and verifies, and the latest state wins.
  - **Not fixed in 5A.3** (no optimization without a correctness blocker). It is a follow-up for 5A.4, where the real Battle Map exercises this path, or Milestone 8, networking hardening. Options to evaluate:
    - pacing a transfer's first chunks;
    - a separate channel for structured state;
    - confirming the cause with a non-loopback network or installed Chrome.

### What the numbers mean

- **Events are not the problem.** BroadcastChannel, the relay socket, data-channel messages and `bufferedamountlow` all kept arriving promptly in hidden owners, at 5 and 10 minutes too.
  - The 16 MiB background moved as fast as when visible (0.3–0.4 s on loopback), with no fallback timers needed.
  - Player → owner messages arrived in about 0 ms, which is what admission, pings and reconnect will rely on.
- **Timers are, mildly.** Hidden tabs ran a 100 ms timer about every 1 s.
  - The snapshot sender sends a publication after a quiet spell on a 0 ms timer. Chrome still ran that promptly (3 ms); **Firefox delayed it to about 0.5 s.**
  - A publication arriving within 100 ms of the previous send waits for the 100 ms throttle timer, which became **0.6–1.0 s** in both browsers.
  - That was all the delay of the "newer state during a transfer" case: in every hidden run, its extra wait beyond the timer was 0–2 ms, so the asset never starved it.
- **Chrome's stricter throttling of long-hidden tabs didn't reach the owner.** Its timer still ran about every 1 s after 10 minutes. The WebRTC-free control tab stopped reporting after 5–10 minutes, which is consistent with that throttling applying to ordinary tabs only. This last point is inferred from missing reports.
- **Nothing failed the UX:** at worst a publication reached players about 1 s later. Even so, that delay is avoidable, which is what outcome B is for.

### Consequence for 5A.2 / 5A.3 (outcome B)

The architecture is unchanged. One narrow sending change in the session host:

1. **When the host commits a publication** (the BroadcastChannel `publication-offer` handler, 5A.3), send the snapshot **in that event handler** if nothing was sent in the last 100 ms. That is a synchronous leading-edge send.
   - **Implemented in 5A.2 as `SnapshotSender.sendNow()`:**
     - it sends at once when the throttle allows;
     - otherwise it coalesces into the trailing timer, exactly like `notifyChanged()`;
     - a throttle timer that is already late (a hidden tab) is cancelled, and the event flushes instead.
     It returns nothing. A flush follows the sender's usual rules, so it doesn't mean bytes went out: with no players nothing is sent, a busy channel is only marked pending, and a revision a player already has isn't resent. `diagnostics()` shows what was actually sent.
   - `notifyChanged()` is unchanged, for callers that signal from a render (the Battle Map prototype).
   - Its first production caller is the 5A.3 commit handler (`js/live-share-host.js`, on every commit that changes what players see).
   - Timers stay only for coalescing a burst into its trailing send.
   - This removes Firefox's 0.5 s and Chrome's scheduling dependence for ordinary saves.
   - Keep the existing rule that sends never run inside a surface's render. The host has no render loop, so the rule holds by construction.
2. **The asset sender:** no change. It was event-driven already (`bufferedamountlow`), and its fallback timer was never needed while hidden.
3. **Trailing coalesced sends** may still take about 1 s in a hidden host. That is acceptable, because the latest state always wins. Revisit only if the Initiative Tracker's immediate publishing shows a need.
4. **Re-check the Chrome visible-owner transfer anomaly** (¹) once assets flow through the real host page (5A.3 / 5A.4). *Done in 5A.3: it reproduces, as a transport stall below the senders, with no correctness impact. It remains a follow-up (¹).*

Not needed: a keep-visible requirement (C) or the iframe shell (D). DM hosting from a phone or tablet stays a separate, known limitation.

### Mutation checks (the harness is not false-green)

Test-only fault switches in the owner fixture (`?fault=`), each run quickly in Chrome with 20 s step limits:

| Fault | Result |
|---|---|
| BroadcastChannel delivery stopped (`no-bc`) | 21 failures (every publication timed out at the owner) |
| SnapshotSender never sending a newer revision (`no-flush`) | 20 failures (the player never applied the newer revisions) |
| AssetSender stalled (`stall-assets`) | 3 failures (no first chunk) |
| Structured state starved behind the asset (`starve`) | 3 failures (+2.0–4.0 s beyond its sender timer) |
| Data channel closed (`close-dc`) | 25 failures (everything after the close) |

A clean run reports 0 failures.

### Safari: manual validation required

- Playwright's Windows WebKit build has no WebRTC, so nothing here says anything about Safari.
- The same harness has a manual mode for a Mac: it starts the relay, page server, collector and player itself, and prints instructions.

**On a Mac, with Safari as the browser under test:**
1. `npm ci` and `npx playwright install chromium` in the repository (the player is Playwright Chromium).
2. Run `node tests/perf/hidden-host/run-spike.mjs --manual`. It prints each URL to open, in order:
   1. the first publisher, in a new Safari window;
   2. the control tab;
   3. the owner (session host), each in a new tab of that window, so the owner becomes the front tab;
   4. later, a second publisher in a new tab, which hides the owner.
   It then says when to minimize the window (Cmd+M). It runs the same phases: visible, hidden 0 / 1 / 5 / 10 minutes, minimized. That takes about 13 minutes; keep the Mac awake.
3. If the Mac can't run Node, skip it: the procedure needs the local servers.
4. **Send back:**
   - the console output;
   - `perf-results/hidden-host/manual.json`, which includes the Safari version from the owner's user agent, every phase's numbers and the failure list.
   - Note whether Safari showed anything unusual: a tab reload, a "this webpage is using significant energy" banner, or a disconnect.

**Until then,** the hidden-host decision holds for desktop Chrome and Firefox and is **conditional for Safari.** 5A.2 can proceed. A Safari result showing a frozen or discarded hidden owner would reopen the C/D question for Safari only.

## 10. Milestone 7 implications (host refresh)

Refreshing the session host is the only refresh that threatens the room; a surface reload is ordinary in Milestone 5. Recovery has to restore:

| State | Where it comes from after a host reload |
|---|---|
| Room id and a host-resume secret | Host tab `sessionStorage`. The relay needs a **host grace period and resume** (generic, no game state); today a host leaving ends the room at once |
| Seats, lock, password verifier, issued credential verifiers, active surface instance per type | Host tab `sessionStorage` (ephemeral and tab-scoped; never `localStorage`) |
| Player connections | Rebuilt: players reconnect through the relay and present their seat credentials (the §18 player flow) |
| Current publications and assets | Rebuilt from open surfaces: the host broadcasts `host-hello`, surfaces offer again, and only missing assets move |
| A publication whose surface is closed during the refresh | **Not recoverable in V1:** that surface shows "not available" until it reopens. Persisting publications in IndexedDB is an open decision, not in Milestone 5 or 7 by default |

## 11. Player and DM UX across surfaces

**Player:**
- One page, one join. The Battle Map is the primary panel.
- When the tracker exists it appears as a second panel or tab, only while the DM shares it.
- Each panel shows its own availability ("The DM's map is not open right now — showing the last shared map"); the room stays up regardless.
- DM tabs opening or closing never navigates the player.

**DM, on the session host page:**
- seats (add, rename, enable / disable), password, lock;
- connected players, kick, reset;
- join link;
- which surfaces are shared, with per-surface enable / disable;
- session diagnostics;
- End Session.

**DM, on each surface page:**
- a small Live Share indicator (not running / running · N players / "this tab is not the publisher");
- an "Open Live Share" button that focuses the session host;
- surface-specific controls:
  - the Battle Map: Save gating, Visible to Players, Save button text;
  - later the tracker's sharing options.
- Surfaces may show read-only status, and send *commands* to the host (for example "publish from this tab"). They never keep their own copy of seats or room state.

## 12. Security and privacy boundary

- **What a surface sends the host:** only what its player-safe projection produces, plus player-safe assets and routing metadata. That is the same data players receive, so the host widens nothing.
- **What it never sends:** drafts, the original map, fog sources, hidden tokens, HP, DM notes or any other application state. The Initiative Tracker will need its own projection before it publishes anything.
- **What other same-origin tabs can see:** anything on the BroadcastChannel. That is acceptable only because that content is player-safe already.
  - **Seats, passwords and credentials never go on a BroadcastChannel.** They live only inside the session host page.
- **The host checks surface messages as untrusted input:** schema, size limits, asset hash and version.
- **The host is a router and session authority, not a store of DM state.** It never asks a surface for raw state.

## 13. Adversarial review of the design

| Scenario | Behavior | Where |
|---|---|---|
| Battle Map closes while players are connected | Committed publication and assets stay; players keep the map; late joiners are served from the host | Milestone 5A |
| Initiative Tracker opens after the room exists | Registers; its offer becomes a new surface stream; players get `session-state` with a new available surface | Generic in 5A; the tracker itself is future |
| Battle Map reloads | Re-registers, offers its saved state; a by-value compare means no new revision; assets dedupe by id | 5A |
| Two Battle Map tabs | One active publisher (latest registration, or explicit "publish from this tab"); the other is told it's inactive | 5A |
| Two tabs both claim "battle-map", one an old cached build | The version check rejects the old one, and the DM is told to reload it | 5A |
| An older offer arrives after a newer one | Per-instance `publicationSeq`; older or superseded offers are dropped | 5A |
| A surface disappears mid-publication | The pending offer is dropped; the committed publication is unchanged | 5A |
| A 16 MiB background over BroadcastChannel | One copy to the host (about 44 ms); per-surface data channels keep it away from other surfaces; size limits enforced before hashing | 5A |
| A late player joins while the Battle Map is closed | Served the committed snapshot and assets from the host store | 5A |
| Session host refreshes | Milestone 5: the session ends, clearly, for everyone. Milestone 7: grace period and resume | 5A (explicit end) / 7 |
| Session host closed by accident | `beforeunload` warning while players are connected; otherwise the session ends | 5C (warning) |
| A surface tab crashes | No `bye`; the heartbeat timeout marks it "not responding"; the publication is kept | 5A |
| Stale BroadcastChannel publishers | Instance ids plus heartbeats; a silent instance loses its "active" role only for status, never data | 5A |
| A malformed or hostile same-origin message | Validated like player input; unknown types ignored; never forwarded unvalidated | 5A |
| Surface or host version mismatch | Boundary `v` and `surfaceVersion` checked; mismatched tabs are ignored and named to the DM | 5A |
| Two session-host tabs | The Web Lock lets only one run; the second shows "already running in another tab" | 5A |
| Hidden host tab throttled or frozen | **Measured (§9):** desktop Chrome and Firefox keep a hidden host connected and responsive (10+ minutes hidden, then minimized); only timers slow to about 1 s. Remedy: event-driven leading-edge sends. Safari: manual check pending | 5A.1 done (Chrome/Firefox); 5A.3 sending change |
| Player behind TURN when the Battle Map closes | Unaffected: the connection belongs to the host | — |
| More than one player | The relay's `maxPeersPerRoom: 1` must rise (a generic relay change) along with host-side rate limits | 5B |

## 14. Migration path from the prototype (least churn)

| Current | Becomes |
|---|---|
| `relay/*` | Unchanged in 5A. 5B: raise `maxPeersPerRoom` and scale the host's rate allowance. 7: host grace and resume |
| `signaling-client.js`, `peer-link.js`, `ice-config.js`, `room-id.js`, `config.js`, `host-session.js` | Reused as is, by the session host page |
| `snapshot-sender.js` | Reused; the encoder is injected per surface instead of importing `encodeBattleMapSnapshot`. Throttle reviewed after the §9 spike |
| `asset-sender.js` | Reused; `getAsset/hasAsset` come from the host's publication store instead of the Battle Map seam |
| `protocol.js` | 5A: unchanged. 5B: generic envelope plus a surface validator registry (protocol v1) |
| `asset-protocol.js`, `asset-cache.js` | Reused (kinds stay per surface) |
| `js/battlemap-live-share.js` | **Split:** session ownership (room, peers, senders, panel, lifetime) moves into the new session-host page module; what stays is a thin Battle Map **publisher adapter** (seam → BroadcastChannel offers, status indicator, "Open Live Share") |
| `battle-map-share-state.js`, `-publication.js`, `-share-assets.js`, `-token-presets.js` | Unchanged (Battle Map side). The local save never waits for the host; the host's commit acknowledgement is only shown as status |
| `battlemap.html` wiring (`?liveshare=1` gate) | **What changes:** today the Battle Map prepares player-safe assets (composition, encoding, hashing) only when opened with `?liveshare=1`. From 5A it prepares them while a session host is running (`host-hello` / `session-status`), and stops when the session ends. A plain Battle Map without Live Share still does no extra work. **When a session starts after the DM saved,** the adapter builds the publication from the saved record on `host-hello` (the `publishSavedRecord` path exists already) |
| `battlemap-snapshot.js`, `battlemap-view.js`, `player-view.js` | Unchanged; registered with the player's surface router in 5B |
| `js/live-share-dev.js` / `liveshare-dev.html` | Player part becomes the product player page in 5B/5C. Host "hello" mode stays only as long as the networking tests need it, then retires |
| Browser tests that start rooms from `battlemap?liveshare=1` | 5A moves the helpers to "open the session host + open the Battle Map". Expected churn: the helpers in `tests/helpers/battlemap-live-share.js`, not the assertions |

**Sequence:**
1. **5A.1, the hidden-tab spike** (§9). Done for Chrome and Firefox; outcome B. Safari: manual check pending.
2. **5A.2, the session host page:** reuses the generic modules; Web Lock; same panel functions as the prototype. **Implemented on 2026-10-02:**
   - `live-share.html` + `js/live-share-host.js`;
   - `js/modules/live-share/session-host-lock.js`: Web Lock `dmtoolbox.live-share.session-host`. A second tab waits and takes over only when the owner closes. Without Web Locks the page fails closed;
   - `SnapshotSender.sendNow()`;
   - the window name `dmtoolbox-live-share`.
   - No surface data reaches it yet, so players connect but see no map.
   - **Transitional:** the Milestone 0–4 Battle Map prototype host (`battlemap.html?liveshare=1`) still runs its own room until 5A.4. Until then the two duplicate about 60 lines of per-player wiring, and that duplication goes when the prototype becomes a publisher.
3. **5A.3, the boundary:** the BroadcastChannel boundary and the host publication store with atomic commit and host-side revisions. **Implemented on 2026-10-03** (§6.1), and exercised with a test publisher only. The real Battle Map does not use it yet.
4. **5A.4, the Battle Map adapter:** `battlemap-live-share.js` becomes the publisher adapter. Same player wire format; existing browser tests pass through the new helpers.
5. **5B:** admission and protocol v1.
6. **5C:** product UX.

## 15. Decisions still to make

**Before 5A starts:**
- ~~**The hidden-tab spike result (§9).** It picks event-driven sending, a warning, or the Option D fallback. It's the only open question that could change the architecture.~~
  - Settled for desktop Chrome and Firefox (2026-10-02): outcome B, with the architecture unchanged.
  - Sending becomes event-driven at commit in 5A.3.
- **Safari's hidden-tab result:** a manual check on a Mac (§9). It doesn't block 5A.2, but a frozen or discarded hidden owner in Safari would reopen C/D for Safari.

**During 5A, not blocking it:**
- ~~the page name and URL of the session host~~ (decided in 5A.2: `live-share.html`, `/live-share`), and the product player page (still open; players use `liveshare-dev.html` until 5B/5C);
- ~~the duplicate-tab rule~~ (decided and implemented in 5A.3, §6.1: the latest registration wins, except that an empty tab never displaces one with a publication, and a manual claim holds while the claimed tab has a publication. The claim protocol exists; the Battle Map's "Publish from this tab" button is 5A.4);
- whether the Battle Map's `?liveshare=1` flag disappears in 5A (the host page replaces it) or stays as a development convenience.
  Either way, asset preparation follows whether a session is running (§14), not the URL flag.

**Deferred, not needed for Milestone 5:**
- how players see a closed Initiative Tracker (the tracker's design);
- persisting publications across a host refresh (Milestone 7, default no);
- DM hosting on mobile.
