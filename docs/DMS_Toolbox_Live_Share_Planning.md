# DM's Toolbox — Live Share Planning Document

## Status

**Proposed feature:** Live Share  
**Initial target:** Battle Map  
**Future target:** Initiative Tracker  
**Architecture direction:** WebRTC host-and-spoke with a small, game-agnostic signaling relay  
**Authority:** The DM's browser owns all session, seat, admission and game state  
**Synchronization (V1):** Throttled whole-state player-safe snapshots  
**Product philosophy:** Temporary shared tactical state without moving persistent campaign data into centralized cloud storage.
**Progress:** Milestone 0 complete and validated in production (2.3.22–2.3.23, 2026-09-28); Milestone 1 in progress.

**Revision note:** This plan was revised after an architecture review against the current codebase. Compared with the first draft, seats, passwords and room admission moved from the signaling service to the DM's browser; synchronization starts as whole snapshots instead of snapshots plus patches; a Battle Map state boundary and the player-safe projection are now the first Battle Map milestone; fog is explicitly a trusted-player feature; and the roadmap proves networking and remote rendering before building room UX.

---

# 1. Goal

Add a lightweight, temporary sharing layer to The DM's Toolbox so a Dungeon Master can show selected tactical pages to players without turning the application into a full virtual tabletop platform.

The target experience (reached incrementally — see §24):

1. The DM opens the Battle Map.
2. The DM starts a Live Share session.
3. The DM creates player seats by name and optionally sets a room password.
4. The application generates a single share URL.
5. Players open the URL, their browser connects to the DM's browser, and they see the room's seats.
6. A player selects a seat, enters the password if one is set, and clicks **Join Room**.
7. The DM's browser validates the request and admits (or refuses) the player.
8. Admitted players see the live Battle Map while the DM remains the authoritative host.
9. The DM can lock the room, kick players, reset seats, and end the session.

The feature must preserve the current local-first design of The DM's Toolbox.

---

# 2. Product Principles

## 2.1 Keep persistent data local

Live Share must not require campaign data, saved encounters, journals, characters, or other persistent application state to be stored on a central server.

Only data explicitly required for the active shared session leaves the host browser, and it goes to the players' browsers, not to a server.

## 2.2 The DM's browser is authoritative

The DM's browser is the canonical source of truth for:

- game state (the Battle Map, later the Initiative Tracker),
- the room's seats, their names and enabled state,
- seat claims,
- the room password and locked/unlocked state,
- player permissions,
- kick and reset decisions,
- which player holds which seat, including after a reconnect where practical.

Players receive a filtered representation of host state and, in later versions, may request approved interactions. Player clients are never treated as authoritative. The signaling service is never authoritative for anything beyond its own relay bookkeeping.

## 2.3 Share only what players are allowed to know

Information shared with players falls into two categories with different guarantees (see §13):

- **Structured secrets** — hidden entity data, exact HP, DM notes, private metadata. These are **never transmitted** when hidden. The guarantee is enforced by the player-safe projection and proven by tests that the fields are absent, not merely hidden in the player UI.
- **Fog of war over the map image** — a **trusted-player** feature. The whole map image is transferred and fog is drawn over it in the player client. This hides the map from normal viewing, not from a player who inspects the transferred data.

## 2.4 No accounts required

Players should not need:

- DM's Toolbox accounts
- email addresses
- campaign membership
- permanent identities
- cloud saves

A temporary room link, a seat, an optional password and a temporary session credential are enough.

## 2.5 Keep the feature narrow

Live Share is not intended to become:

- a full Roll20 or Foundry replacement, or an attempt to match their feature breadth
- a campaign hosting service
- a chat platform
- voice/video software
- a player-character hosting system
- a general multiplayer framework for every Toolbox page

The intended shared surfaces are:

1. Battle Map
2. Initiative Tracker (future)

## 2.6 Keep the backend generic

The only server-side component is a small realtime signaling relay. It connects browsers; it does not understand rooms' seats, passwords, the Battle Map, or any D&D state.

---

# 3. Scope

## Stable V1 (the end state, reached through §24's milestones)

- Battle Map Live Share
- DM-created player seats, owned by the DM's browser
- Optional room password, validated by the DM's browser
- Single room URL
- Explicit **Join Room** confirmation
- Seat claims decided by the DM's browser (one decision point, so no races)
- Occupied/available/disabled seat state
- Temporary seat-session credentials
- Host-authoritative WebRTC session
- Player-safe Battle Map projection
- Throttled whole-state structured snapshots
- Map image and token image transfer
- Fog-of-war synchronization (trusted-player model)
- Token-position, condition and public-measurement synchronization
- Player map pings
- Connection status
- Player reconnect support
- DM kick, seat reset, seat disable, room lock
- Explicit session termination
- Dedicated player Live Share page
- Navigation protection for active Live Share sessions
- Normal Toolbox pages open in separate tabs from the player client
- Diagnostics sufficient to troubleshoot connection failures

## Explicitly deferred (not required for V1)

- Incremental patch/event synchronization (only if profiling shows a need)
- Token visibility controls ("Visible to Players")
- Enemy health visibility options
- Asset hash/caching across reconnects or sessions
- Player token movement
- Player HP editing
- Initiative editing by players
- Initiative Tracker sharing
- Persistent online rooms

## Non-goals (not planned)

- User accounts
- Cloud campaign storage or any persistent server-side campaign state
- Shared character sheets / character-sheet hosting
- Journal synchronization
- Compendium synchronization
- Encounter Builder synchronization
- Generator synchronization
- Shared dice history
- Text chat
- Voice/video
- Full VTT automation

---

# 4. High-Level Architecture

```text
                       Signaling relay
                (small, generic, ephemeral)
                     ▲               ▲
                     │  connection   │
                     │  setup only   │

Player A  ◀──────────── DM Host ────────────▶  Player B
                           │
                           │ WebRTC DataChannel
                           ▼
                        Player C
```

- The DM and the players use the existing static application hosted on Netlify. Normal hosting does not change.
- The signaling relay exists only to let a joining browser find the room's host and to exchange WebRTC negotiation messages (offers, answers, ICE candidates).
- Once a peer connection is established, all session traffic — admission, snapshots, assets, pings — moves between the DM's browser and each player's browser over WebRTC DataChannels.
- Direct peer-to-peer connection is attempted first. Where a network prevents it, a TURN relay forwards the (still encrypted) traffic.
- Players connect only to the host. Players never connect to each other.

---

# 5. Core Components

## 5.1 Live Share Session Manager (DM browser)

- create and end sessions
- own the room's seats, password, lock state and permissions
- decide seat claims, kicks and resets
- track connected players and their seats
- maintain the session revision counter
- drive snapshot sending and resync

## 5.2 Signaling Client

- register the host's room with the relay
- connect a joining player to the host
- exchange WebRTC offers, answers and ICE candidates
- report signaling failures
- support host and player re-registration after a reload where practical

## 5.3 Peer Manager (DM browser)

- one peer connection per player
- create/manage RTCDataChannels
- track connection state
- close stale connections
- enforce one active connection per seat in V1

## 5.4 Battle Map Share-State Seam (DM browser)

The single boundary between Battle Map internals and Live Share (see §6 and Milestone 1):

- produce the player-safe structured state on demand,
- signal that shareable state has changed,
- expose the fog and asset data Live Share transfers.

Live Share code talks only to this seam, never to Battle Map internals directly.

## 5.5 Player-Safe Projection (DM browser)

- convert DM Battle Map state into player-safe state
- include only allowlisted fields
- apply visibility rules as they are added

This is the primary security/privacy boundary for structured data.

## 5.6 Protocol Layer (both sides)

- define message types
- version the protocol
- validate every incoming message against its schema
- enforce payload and rate limits
- reject unknown or malformed messages

## 5.7 Player Live Share Client

- connect to the room through the relay
- receive the room's admission state (seats, password required, locked)
- request a seat with the optional password
- receive and reconstruct assets
- render the latest snapshot
- send permitted messages such as pings
- reconnect after temporary connection loss
- remain isolated from DM-only application state

---

# 6. Current Battle Map Architecture (Codebase Constraints)

Live Share has to be designed around how the Battle Map works today:

- **One large page with page-internal state.** `battlemap.html` is a single page (~3,500 lines) with its logic inline. State is held inside the page's script scope rather than in a separate state module: the main state object (map, transform, grid, view, tokens, UI), the fog canvas, the fog shapes, and the persistent measurements.
- **No central change point.** Changes are made in place throughout the page and marked with a dirty flag (around 40 scattered call sites) and a render request. There is no single place that says "shareable state changed".
- **Fog is pixels plus shapes.** Painted fog lives on a canvas (a bitmap aligned with the map image, saved as an image data URL), with separate structured fog shapes on top. Brush painting changes pixels, not objects.
- **Tokens carry HP.** The token model includes `hp` and `maxHp`, a label flag, conditions, aura and vision cone, and an image source.
- **No token visibility concept.** Tokens have no "hidden" or "visible to players" flag. Hidden tokens would be a new DM feature.
- **Token images vary in origin.** A token's image may be a data URL or an external URL. The host can read and re-send data URLs and locally stored images directly. For an external URL, the host browser's ability to fetch and read the image data is subject to browser CORS rules: same-origin or CORS-enabled images can be fetched and relayed, but many arbitrary third-party images will block host-side reading. So "the host transfers every external token image" cannot be guaranteed for all URLs (§15).
- **Persistence is local.** The map is saved to IndexedDB (with a localStorage fallback).

Consequences for the plan:

1. **Do not wire WebRTC into the existing dirty/render call sites.** Establish one explicit share-state seam first (Milestone 1): conceptually a `getPlayerSafeBattleMapState()` and a single observable "shareable state changed" notification. The exact mechanism is an implementation decision.
2. **Unit-test the seam heavily**, before any networking uses it.
3. **Fog needs its own transfer channel** (§16), separate from structured snapshots.
4. **Token visibility and HP visibility are product features to be designed later**, not filters that already exist (§13).

---

# 7. Room Lifecycle

## Room Creation

1. DM selects **Live Share**.
2. DM (optionally, from Milestone 5) adds seats and a password.
3. DM selects **Start Session**.
4. The DM's browser registers an ephemeral room with the signaling relay.
5. A high-entropy room invitation is generated.
6. The application displays a share URL.
7. The DM sends the URL to players.

## Join Flow

1. Player opens the room URL.
2. The signaling relay connects the player's browser to the DM's browser.
3. The WebRTC DataChannel opens.
4. The DM's browser sends the room's current admission state:
   - available seats,
   - whether a password is required,
   - whether the room is locked.
5. The player selects a seat, enters the password if required, and presses **Join Room**.
6. The DM's browser validates the request locally, in this order:
   1. the room is accepting new joins (not locked),
   2. the password is correct, if one is set,
   3. the seat exists and is enabled,
   4. the seat is available.
7. The DM's browser accepts or rejects the claim. On acceptance it records the seat as claimed and issues a temporary seat-session credential.
8. The accepted player enters the session and receives the first snapshot and assets.

Seat selection is provisional: choosing a seat in the join screen reserves nothing. A seat is claimed only when the DM's browser accepts an explicit **Join Room** request. Because every claim is decided in one place (the DM's browser, one decision at a time), two players cannot both win the same seat.

This join flow is product behavior, from Milestone 5 onward (§24). From then on, admission is mandatory: a connected but not-yet-admitted player receives only admission state (seats, whether a password is required, whether the room is locked) — never map state, assets, fog or pings — until the DM's browser accepts its join request. The development prototypes of Milestones 0–4 have no admission step (§11).

## Room Lock

When the DM locks the room:

- existing players remain connected,
- players holding a valid seat-session credential may reconnect to their seat,
- new seat claims are rejected, even with the correct password.

This is useful for streamed games where the join URL may become visible.

## Room End

When the DM selects **End Session**:

- players receive a session-ended message,
- peer connections close,
- the room is removed from the signaling relay,
- all seat-session credentials are discarded,
- players discard their temporary assets,
- the DM's local Battle Map remains unchanged.

The relay also expires rooms on its own (§20), so a DM who closes the browser without ending the session does not leave a room behind.

---

# 8. Seat Model

Each seat has a stable internal identifier independent of its visible name. Seats exist only in the DM's browser (and, while a session is active, in the host's session-scoped `sessionStorage` for host-refresh recovery, §18).

```text
Seat
- ID
- Display Name
- Enabled
- Claimed
- Connected
- Temporary Session Credential
- Future Permissions
```

## Temporary Seat-Session Credentials

When the DM's browser admits a player to a seat, it issues a temporary seat-session credential. The player presents it to reconnect and reclaim the same seat.

These credentials are **high-entropy, random, opaque capability tokens**:

- issued by the DM's browser,
- validated by the DM's browser,
- scoped to the active Live Share session and to one seat,
- invalidated on kick, seat reset and session end.

They must not be:

- derived from seat names,
- derived from seat IDs,
- derived from the room password,
- predictable counters,
- reusable across sessions.

The player client may keep its credential in `sessionStorage` so a reload or temporary disconnect can reconnect. Any host-side persistence for host-refresh recovery (§18) is likewise ephemeral and session-scoped, never long-lived storage.

The token-generation library and format are an implementation decision.

## Seat Reset

A DM seat reset:

- disconnects the active client,
- invalidates the seat's session credential,
- clears the claimed state,
- returns the seat to available.

## Kick

A kick:

- disconnects the active client,
- invalidates the active session credential,
- returns the seat to the appropriate post-kick state.

## Disable Seat

A disabled seat:

- remains configured,
- cannot be claimed,
- can be re-enabled later.

---

# 9. Password Model

The password is optional. Its purpose is room admission control, especially when the room URL may be visible to unintended viewers.

- The password is DM-controlled local room state, held by the DM's browser.
- The signaling relay never receives, stores or verifies it.
- The player sends the password to the DM's browser over the established DataChannel, as part of the **Join Room** request.
- The DM's browser validates it before any seat is claimed.
- Failed admission attempts do not claim seats.
- The DM's browser throttles repeated failures (per connection, and overall).
- The DM may change or remove the password during the session. A change affects new admissions; already-admitted players stay admitted.
- The password is never shown to other players, and is hidden in the DM UI unless explicitly revealed.
- Room locking is separate from the password: a locked room rejects new claims even with the correct password.

**Transport security.** DataChannel traffic is encrypted by WebRTC's DTLS transport between the two browsers, including when relayed through TURN. That is transport encryption between the DM's browser and the player's browser; there is no additional application-level encryption layer, and the plan does not claim more than WebRTC itself provides.

---

# 10. Join URL Model

The join URL acts as a capability-style invitation.

- It contains a room identifier with enough entropy that rooms cannot realistically be guessed or enumerated.
- Secret material is placed in the URL fragment where practical, so it is not sent as part of the page's HTTP request. The player client reads it and presents it to the relay (to reach the room) and to the host.
- The displayed join URL is hidden by default once created.

Host controls:

- Copy Join Link
- Reveal Join Link
- Change Password
- Lock Room
- Manage Seats
- End Session

---

# 11. Player User Experience

## Join Screen

Shown after the DataChannel opens and the host has sent the admission state:

```text
Join Live Share

Seat
[ Select seat ]

Password
[ ******** ]   <- only when enabled

[ Join Room ]
```

## Join Progress

```text
Connecting to host...
Waiting for the room...
Joining...
Loading map...
```

## Connected State

The player enters a dedicated Live Share client showing:

- session status
- selected seat
- host connection state
- the Battle Map
- permitted player controls
- an option to leave the session

The normal Toolbox navigation does not replace the Live Share page; other Toolbox features open in a new tab.

## Development prototypes (Milestones 0–4) vs product behavior (Milestone 5 onward)

**Milestones 0–4 are engineering validation stages, not production room behavior.** They exist only to validate networking, the player-safe projection, remote rendering, asset transfer and fog. During these milestones:

- there may be no formal seat or admission model yet,
- possession of the temporary development room link may be enough to receive prototype state,
- these builds must not be described or exposed as production-ready public rooms.

No temporary seat logic is added to these milestones just to imitate the later model.

**From Milestone 5 onward**, the join screen, seats and optional password above are the product behavior, and admission is mandatory: an unadmitted peer receives only admission-related state, and no map state, assets, fog or pings are available to it until the DM's browser accepts its join request.

---

# 12. DM User Experience

The DM remains on the normal Battle Map. Live Share adds a compact session panel.

```text
LIVE SHARE

3 / 4 players connected

Caleb    Connected
Sarah    Connected
Jake     Available
Emily    Disabled

[ Copy Link ]
[ Lock Room ]
[ Manage ]
[ End ]
```

The DM can:

- add, rename, enable and disable seats
- kick players
- reset seats
- set, change or remove the password
- lock/unlock the room
- see connection status
- end the session

---

# 13. What Players May See

## 13.1 Structured state (strict guarantee)

Structured data is included in the player snapshot only if it is explicitly allowlisted by the player-safe projection. Everything else is absent from what is transmitted.

Initial player-safe structured state:

- map dimensions and transform
- grid configuration
- token IDs, positions, sizes, rotation
- token image references (resolved through asset transfer, §15)
- public token names, where the token's label is shown
- public conditions
- public persistent measurements
- session revision

Never transmitted (unless a future DM feature deliberately shares it):

- exact HP and max HP (omitted entirely in the first snapshots)
- DM notes and private metadata
- future hidden tokens
- UI/editor state (selection, drag state, tool state)
- unrelated saved map/session data
- unrelated LocalStorage and IndexedDB data
- any other application state

The first Battle Map milestone treats **all currently placed tokens as visible** and **omits HP entirely**.

## 13.2 Fog of war (trusted-player model)

For the initial implementation:

- the complete map image may be transferred to the player,
- fog is transferred separately and drawn over the map in the player client,
- a technically motivated player may be able to inspect the underlying transferred image.

This is a deliberate tradeoff. Fog in Live Share hides the map from normal viewing at the table; it is **not** adversarial information security, and the documentation must not claim it is.

The alternative — sending only pre-composited revealed regions of the map, and re-sending as fog is revealed — is out of scope because of its complexity and bandwidth cost.

## 13.3 Later visibility features (not required for early milestones)

- a per-token **Visible to Players** toggle (hidden tokens are then omitted from the structured snapshot, under the strict guarantee above),
- enemy health visibility: hidden / health bar or state / exact HP.

These are new DM-side features. Neither is required for the networking proof of concept or the first remote rendering.

---

# 14. State Synchronization Model

## V1: throttled whole-state snapshots

1. DM state changes.
2. The share-state seam reports that shareable state changed.
3. Live Share produces a player-safe snapshot.
4. Sending is throttled/debounced to avoid excessive traffic during drags and rapid edits.
5. The entire small structured snapshot is sent to each admitted player.
6. The player replaces its current rendered state with the snapshot.

Each snapshot carries a monotonically increasing session revision. A player ignores any snapshot older than the one it has already applied. A newly connected or reconnected player simply receives the current snapshot.

V1 does not use:

- replay logs,
- incremental patches,
- revision-gap detection and recovery,
- ordered event reconstruction.

The structured Battle Map state is small (a table's worth of tokens and measurements), so whole snapshots are expected to be cheap. Incremental updates should be introduced only if profiling demonstrates a real need.

Fog and binary assets are not part of the structured snapshot; they use their own channels (§15, §16).

---

# 15. Asset Transfer

Images used by the Battle Map exist in the DM's browser, so players need them transferred.

Assets that may need host-to-player transfer:

- the map image,
- locally stored token images,
- token images represented as data URLs,
- externally referenced token images.

Privacy goal: **player browsers should not independently fetch arbitrary external token URLs** when the host can transfer the asset instead. Fetching them directly would make each player's browser contact third-party hosts.

What the host can transfer depends on where the image comes from:

- **Data URLs and locally stored images** can be transferred directly.
- **Same-origin or CORS-enabled external images** can potentially be fetched by the host browser and relayed.
- **Arbitrary third-party images** may block the host browser from fetching or reading the image data, because host-side fetching and repackaging of external URLs is subject to browser CORS rules.

So the host cannot guarantee to transfer every external token image. The fallback for an external image the host cannot read is an open decision for Milestone 3 (§30). Possible policies include requiring the DM to import/store the image locally before sharing, showing players a placeholder, allowing direct third-party loading only as an explicit privacy tradeoff, or another approach chosen during implementation.

Transfer approach:

- transfer assets over the WebRTC DataChannel,
- send metadata before the data,
- split large files into chunks,
- enforce size limits,
- reconstruct each asset as a Blob on the player client,
- render from temporary object URLs,
- discard temporary assets when the session ends.

The signaling relay never receives or stores assets.

A later asset-hash/cache system could avoid re-sending unchanged assets (for example after a reconnect). It is not required for the earliest milestones.

---

# 16. Fog Synchronization

Fog is synchronized separately from the structured snapshot, because painted fog is pixel data, not small objects.

Conceptual model:

- **Structured snapshot** — grid, tokens, conditions, measurements and other small structured state (§14).
- **Fog snapshot** — a compressed/rendered representation of the current fog (painted fog and fog shapes combined, or sent side by side), sent on its own channel, throttled, and not emitted for each individual brush event.

V1 does not require an incremental fog-event protocol. The fog snapshot follows the trusted-player model (§13.2).

The exact fog encoding and compression is an open decision (§30).

---

# 17. Map Ping

Map pinging is the first player-originated interaction.

1. The player uses a dedicated ping interaction.
2. The player client sends a ping message.
3. The host validates it (admitted seat, valid coordinates, rate limit).
4. The host broadcasts the accepted ping.
5. All connected clients render a temporary indicator.

This keeps players effectively read-only while giving them a useful way to point at the map.

---

# 18. Connection and Reconnection

## Temporary Disconnect

Examples: a phone locks, a browser briefly loses network, a mobile device switches networks.

Expected behavior:

1. detect the disconnect,
2. reconnect through the signaling relay,
3. re-establish the WebRTC connection,
4. present the existing temporary seat-session credential (kept in the player's `sessionStorage`, §8) to the DM's browser,
5. the DM's browser validates the credential and re-admits the player to the same seat,
6. receive the current snapshot, fog and any missing assets,
7. resume the session.

## Host Refresh

The DM's browser keeps enough ephemeral, session-scoped information in `sessionStorage` (room registration, seats, lock state, issued seat credentials) to attempt room resumption after a reload. Nothing from the session is kept in long-lived storage. The relay keeps the room registered for a short host grace period. If the host does not return within that period, the room ends.

---

# 19. Navigation Behavior

While a player is connected:

- do not replace the Live Share page with normal Toolbox navigation,
- open normal Toolbox destinations in a new tab,
- warn before accidental page unload where supported,
- reconnect gracefully after a refresh when possible.

The browser cannot and should not be forcibly prevented from leaving the page.

---

# 20. Signaling Relay

Live Share needs a small realtime component alongside the existing static site. The normal application stays a static Netlify site; ordinary request/response serverless functions are not a fit for holding WebSocket connections and relaying messages between browsers in real time.

Realistic implementation categories:

- Cloudflare Workers + Durable Objects,
- PartyKit,
- another small hosted WebSocket relay.

No provider is chosen yet (§30).

## Responsibilities (deliberately limited)

- create/identify an ephemeral room, registered by its host,
- connect joining peers with the room's host,
- relay WebRTC signaling messages (offers, answers, ICE candidates),
- expire rooms (host grace period, maximum lifetime, idle timeout),
- basic abuse and rate limits appropriate to a relay (connection attempts, message rate, message size),
- issue short-lived TURN credentials, if the chosen TURN setup requires it (§21).

## Not the relay's job

- seats, seat claims or seat names,
- passwords,
- room lock, kick or reset,
- player permissions,
- Battle Map, Initiative Tracker or any D&D state,
- assets,
- campaign data of any kind.

**Architectural rule:** the signaling backend remains generic and unaware of Battle Map or game state. It could relay for any WebRTC application.

---

# 21. WebRTC Networking

The implementation requires:

- WebRTC PeerConnection
- RTCDataChannel
- the signaling relay (§20)
- ICE negotiation
- STUN
- TURN for production reliability

Approach:

- direct peer-to-peer connection is attempted first,
- STUN helps browsers discover how to reach each other across home routers,
- some network environments (certain corporate, school, mobile and strict NAT setups) cannot connect directly and require a TURN relay,
- production reliability will likely require TURN support,
- STUN-only is acceptable for the earliest experiments.

TURN credentials:

- long-lived reusable TURN credentials must not be embedded in the public static application (anyone could read and reuse them),
- a production setup should use short-lived credentials or an appropriate managed credential mechanism, typically issued by the signaling component.

This is not designed in detail until after the networking proof of concept.

Topology is host-and-spoke: each player connects only to the DM's browser.

---

# 22. Security Requirements

## Mandatory

These apply to product behavior (Milestone 5 onward). The development prototypes of Milestones 0–4 have no admission model and must not be exposed as production rooms (§11); the projection, validation, limits and injection rules below apply to them as soon as the corresponding pieces exist.

- high-entropy room invitations
- DM-browser-side admission: password check, lock check, seat validation
- seat claims decided in one place (the DM's browser)
- one active connection per seat in V1
- admission is mandatory: an unadmitted peer receives only admission-related state, and no map state, assets, fog or pings until the DM's browser accepts its join request
- temporary seat-session credentials are high-entropy, random, opaque capability tokens issued and validated by the DM's browser, scoped to one session and one seat, and never derived from seat names, seat IDs, the password or a counter (§8)
- explicit message schema validation on both sides
- reject unknown message types
- reject malformed payloads
- payload-size limits
- map and asset size limits
- rate limiting (relay: connections and signaling messages; host: join attempts, password attempts, pings, all player messages)
- structured-secret omission via the allowlisted projection, proven by tests
- host authority over shared state
- seat credential invalidation after reset/kick
- all credentials discarded at session end, and never reusable in a later session
- short-lived ephemeral rooms
- no DOM injection from player-supplied or relayed data (render as text)
- dependency security review
- no false claims about fog secrecy (§13.2)

## Threat Scenarios to Test

- leaked room URL
- leaked room URL during a livestream
- wrong password attempts
- two users requesting the same seat at the same time
- a malicious client impersonating another seat
- an unadmitted client sending game messages
- malformed WebRTC messages
- oversized payloads
- repeated ping spam
- stale reconnect credentials
- a player attempting unsupported commands
- guessed or forged seat-session credentials
- a player referencing tokens it was not sent
- room access after session end
- structured secrets appearing in any transmitted snapshot

---

# 23. Diagnostics

Live Share should expose enough diagnostics to troubleshoot connection failures without exposing sensitive data (no passwords, credentials or invitation secrets in diagnostics).

Useful diagnostics:

- session state
- signaling connected/disconnected
- peer connection state
- ICE connection state
- DataChannel state
- whether a TURN relay is in use
- reconnect attempts
- last protocol error
- current session revision
- connected seat count

Integrate with the existing DM's Toolbox diagnostics panel where appropriate.

---

# 24. Development Milestones

The order is deliberately thin: prove the network, then prove remote rendering of real state, then build the product UX. Security of the player-safe projection starts in Milestone 1, not at the end.

Milestones 0–4 are development prototypes: they have no seat/admission model, possession of the temporary development room link may be enough to receive prototype state, and they must not be exposed as production-ready public rooms (§11). Admission becomes mandatory with the product room UX in Milestone 5.

## Milestone 0 — Networking Proof of Concept

No Battle Map integration.

- create room
- join room
- WebRTC offer/answer/ICE
- open an RTCDataChannel
- host sends `"hello"`
- player receives and displays `"hello"`
- clean disconnect

Test manually across the same network, a separate home or network where practical, and mobile data where practical. STUN-only is acceptable.

Exit:

- host and player establish an RTCDataChannel,
- `"hello"` is sent and received,
- this works across at least one real remote-network scenario, not only localhost or the same machine,
- connection failures expose enough diagnostics to tell a signaling failure from an ICE/connectivity failure.

Universal remote-network reliability is not required before TURN exists. Failure on a particular remote network during the STUN-only milestone does not by itself invalidate the architecture; it may indicate that TURN is required.

**Status: complete (2.3.22 and 2.3.23, validated in production on 2026-09-28).** The prototype is `liveshare-dev.html`; the relay, TURN setup and diagnostics are documented in `relay/README.md`.

- Signaling: the Cloudflare Worker + Durable Object relay was deployed and worked in production (room creation, discovery, offer/answer and ICE candidate relay).
- Direct path: a clean Chrome host and a Brave desktop player connected directly (ICE connected, data channel open, `"hello"` received, `usingTurnRelay: false`).
- Remote path: a clean Chrome host and an Android phone on 5G connected through TURN (connection and ICE `connected`, data channel open, `"hello"` received, `usingTurnRelay: true`; the phone's selected pair was `prflx` locally and `relay` remotely over UDP, with all 16 received ICE candidates applied and none pending). The STUN-only build could not connect on that path.
- TURN was pulled forward from Milestone 8 because the real 5G path needed it. It is a fallback only: ICE keeps transport policy "all", a direct path wins whenever one works, and TURN is used only when none does.
- Diagnostics separate signaling, ICE, data-channel and negotiation failures, count every ICE candidate step, and report a browser that gathers no candidates at all. During testing the developer's normal Chrome profile gathered zero candidates (WebRTC blocked in that profile by an extension or setting); that was an environment issue, not an application defect, and is now reported as "WebRTC blocked in this browser".

Remaining networking work stays in its milestones: connection-attempt and credential rate limits (Milestone 8), room lifetime and reconnect (Milestone 7), and admission (Milestone 5).

## Milestone 1 — Battle Map Share-State Seam

No sharing UI required.

- establish one Battle Map share-state boundary (§6),
- implement the player-safe projection (allowlist),
- unit-test it heavily, including tests that excluded fields are **absent** from the output (HP, max HP, UI/selection state, unrelated saved data),
- emit a small structured snapshot on a single "shareable state changed" signal.

Initially omit: map asset, fog, HP, and any permissions.

Exit: every Battle Map change that players should see produces a new snapshot through the seam, and the projection tests prove what is excluded.

## Milestone 2 — Remote Structured Rendering

- send throttled whole-state snapshots over WebRTC,
- the player renders grid, tokens, conditions and measurements,
- stale revisions are ignored.

No patch/event protocol.

Exit: a player watches the DM manipulate tokens and measurements in near real time.

## Milestone 3 — Asset Transfer

- map image transfer
- token image transfer: data URLs and locally stored images, plus external images the host browser can fetch and read (same-origin or CORS-enabled)
- a decided fallback policy for external token images the host cannot read (§15, §30)
- chunking of large binary data, with size limits
- temporary player-side asset reconstruction and cleanup

Exit: a player joining the room sees the current map and every token image the host can transfer, without contacting any other host, and external images the host cannot read are handled by the chosen fallback policy.

## Milestone 4 — Fog Synchronization

- trusted-player fog model (§13.2)
- fog transferred and rendered on its own channel
- throttled fog snapshots
- documentation that makes no claim the underlying map is hidden from the player's device

Exit: fog changes appear for players within an acceptable delay.

## Milestone 5 — Product Room UX

Only after the underlying networking has proven useful.

- DM-created seats
- optional password
- explicit **Join Room** button
- DM-browser seat and password validation
- room lock
- kick
- reset seat
- disabled seats
- polished join UI
- connection status

Exit: a nontechnical user can host and join a session without understanding WebRTC.

## Milestone 6 — Player Ping

The first meaningful player-originated interaction, with the host validating, rate-limiting and broadcasting each ping.

## Milestone 7 — Reconnect / Recovery

- player reconnect with seat reclaim
- host refresh grace period and room resumption
- snapshot, fog and asset resync
- stale credential handling
- clean session teardown

Exit: common mobile/browser disconnects recover without restarting the room.

## Milestone 8 — Production Networking Hardening

- TURN integration and credential handling
- abuse and rate limiting at the relay and the host
- payload limits
- browser/network compatibility testing (§25)
- signaling deployment reliability
- diagnostics

Exit: typical home, mobile and remote-table setups connect consistently.

## Milestone 9 — Experimental Release

Ship behind an experimental flag with documentation (including the fog trust model and a privacy explanation) and a troubleshooting guide. Use it at real tables and collect failure reports before expanding scope.

## Milestone 10 — Stable V1

Promote to supported functionality only after real session use demonstrates acceptable reliability.

---

# 25. Testing Strategy

## Unit Tests

- player-safe projection: allowlisted fields present, excluded fields absent
- share-state seam: every shareable change is signaled; non-shareable changes need not be
- protocol validation and malformed message rejection
- revision ordering (stale snapshots ignored)
- seat transitions (claim, kick, reset, disable)
- password admission and throttling
- room locking
- seat credential validation

## Integration / Browser Tests

The existing Playwright harness can run the DM and several players as separate browser contexts, with a local signaling relay started alongside the test web server.

- host creates room
- player connects and joins
- multiple players join
- two players requesting the same seat
- password failure
- locked room
- kick and reset seat
- reconnect
- host refresh
- session end
- asset transfer
- snapshot and fog synchronization
- player pings

## Adversarial Tests

Treat every player client as untrusted:

- messages before admission
- fabricated seat IDs and token IDs
- replayed credentials
- malformed JSON
- giant messages
- rapid repeated messages
- out-of-order revisions

## Environment Tests (manual)

- same Wi-Fi, separate networks, mobile data, VPN, restrictive NAT
- Chrome, Edge, Firefox, Safari
- Android, iOS, desktop
- direct connection and TURN relay fallback

---

# 26. Future Battle Map Possibilities

After read-only sharing is proven stable, each evaluated individually rather than treated as a required roadmap item:

- per-token Visible to Players toggle
- enemy health visibility options
- assigned token control / DM-configurable token permissions
- player measurement tools
- player cursor indicators
- optional map-follow mode
- co-DM role
- asset caching
- incremental synchronization, if profiling justifies it

---

# 27. Initiative Tracker Extension (Future Scope)

The Initiative Tracker is the only planned second Live Share surface. It is not designed or implemented now.

When it is, it should reuse:

- the same room,
- the same WebRTC connections,
- the same seat model,
- the same host-authoritative, player-safe-projection approach,
- the same whole-snapshot synchronization.

The player view is a filtered, read-only projection initially.

Potential shared state:

- combat round
- active and on-deck combatant
- initiative order
- public names
- public conditions
- concentration indicator where appropriate
- player HP where appropriate
- configurable enemy health information

Possible DM options:

```text
Show turn order            Yes
Show round number          Yes
Show conditions            Yes
Show exact player HP       Yes
Show exact enemy HP        No
Show enemy health state    Optional
```

Players should not initially be able to edit initiative, change HP, apply conditions, advance turns, edit combatants, alter legendary actions, or see DM notes.

---

# 28. Pages That Remain Local

These do not justify realtime shared state:

- **Character Manager** — character ownership and state stay with the person managing the character; realtime sync adds privacy, ownership and conflict concerns without enough table benefit.
- **Journal** — contains substantial DM-private information and spoilers. If handout sharing is ever wanted, it should be deliberate one-way sharing, not Journal synchronization.
- **Encounter Builder** — DM preparation state with no need for continuous player synchronization.
- **Compendium** — players can use their own Compendium.
- **Generators** — results do not need continuous shared state; any result sharing would be a lightweight one-time share.

---

# 29. Definition of Success

## Early milestones (0–4)

Before any product UX is built, the early milestones should answer:

- Does the signaling architecture work?
- Can direct WebRTC connections succeed in representative environments?
- Are connection failures diagnosable (signaling vs ICE/connectivity)?
- Does the player-safe state and rendering model work: does a player see the DM's Battle Map (structure, assets, fog) in near real time, and does the projection provably exclude structured secrets?
- Does the feature still look viable once TURN requirements are understood?

STUN-only connection failures are not automatically a failed product experiment if the evidence indicates the remaining gap is TURN traversal rather than a flaw in the application architecture. If the answers show an architectural problem, the roadmap is reconsidered before investing in room UX.

## Stable V1

Battle Map Live Share is stable when, after TURN and network hardening (Milestone 8), it shows acceptable real-world reliability, and:

- the DM can create a room in a few clicks,
- players can join from one URL without accounts,
- predefined seats work, and seat claims cannot race or overwrite each other,
- optional password protection works,
- the DM can lock the room and kick/reset seats,
- players see the correct map state, map and token assets, and fog,
- structured hidden information is never transmitted,
- player pings work,
- players reconnect after ordinary temporary disconnects,
- the session disappears cleanly when ended,
- the DM remains authoritative,
- the existing local-first application is unchanged outside Live Share,
- the feature works for a typical 4–8 person table,
- the experience remains substantially lighter than using a full VTT.

---

# 30. Open Decisions

Intentionally unresolved until the relevant milestone:

- ~~**Signaling provider**~~ — decided in Milestone 0: Cloudflare Workers + Durable Objects (one Durable Object per room), with a local Node relay speaking the same protocol for development and tests.
- ~~**TURN provider and credential mechanism**~~ — decided in Milestone 0 (earlier than planned, because a real mobile-data path needed it): Cloudflare Realtime TURN. The relay Worker's `/turn-credentials` route mints 4-hour credentials from a TURN key held in Wrangler secrets. Rate limiting that route remains Milestone 8 work.
- **Fog encoding/compression** — image format, resolution, whether painted fog and fog shapes are combined or sent separately (Milestone 4).
- **Asset caching strategy** — whether and how to hash/cache assets across reconnects (after Milestone 3).
- **External token-image fallback** — what happens for an external token image the host browser cannot fetch or read because of CORS: require the DM to import/store it locally before sharing, show players a placeholder, allow direct third-party loading only as an explicit privacy tradeoff, or another approach (Milestone 3).
- **Snapshot throttle interval** — the exact interval, starting from a value to be tuned with real use (Milestone 2).
- **Payload and asset size limits** — maximum map image, token image and message sizes (Milestones 3 and 8).
- **Seat-session credential generation** — the library and format used to create the random opaque tokens (Milestone 5).
- **Share-state seam mechanism** — how the single "shareable state changed" signal is implemented inside the Battle Map (Milestone 1).
- **Host grace period and room lifetime** — durations for host-refresh recovery and room expiry (Milestone 7).

---

# 31. Product Position

Live Share should not change the identity of The DM's Toolbox.

> **A local-first tabletop toolkit with an optional lightweight live tactical sharing layer.**

Battle Map (and later Initiative Tracker) Live Share lets players see — and minimally interact with — tactical state the DM is already managing. It does not turn The DM's Toolbox into a centralized cloud VTT, and it does not move campaign data off the DM's device.
