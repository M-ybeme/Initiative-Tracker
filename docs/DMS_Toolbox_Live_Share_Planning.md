# DM's Toolbox — Live Share Planning Document

## Status

**Proposed feature:** Live Share  
**Initial target:** Battle Map  
**Future target:** Initiative Tracker  
**Architecture direction:** WebRTC host-and-spoke with a small, game-agnostic signaling relay  
**Authority:** The DM's browser owns all session, seat, admission and game state  
**Synchronization (V1):** Throttled whole-state player-safe snapshots of each surface's published state; the Battle Map publishes only on an explicit Save (§14)  
**Product philosophy:** Temporary shared tactical state without moving persistent campaign data into centralized cloud storage.
**Progress:** Milestones 0–3 are complete and validated in production:
- Milestone 0, networking proof of concept: 2.3.22–2.3.23, validated 2026-09-28, direct and TURN.
- Milestone 1, share-state seam: 2.3.24.
- Milestone 2, remote structured rendering: 2.3.25, validated in production.
- Milestone 3, player-visible background and asset transfer: 2.3.26, validated in production on 2026-09-30 together with 2.3.27 (§24). The production check covered the real player-visible background with fog baked into the transferred raster, custom token art, default tokens staying marker-only, staged publication, Visible to Players, and fog/background replacement, over direct WebRTC. TURN had already been validated in Milestones 0 and 2. Milestone 3's asset and fog design was revised on 2026-09-29 (see below).

**2.3.27 (Battle Map staged publishing, validated in production 2026-09-30):**
- Live Share publishes only the Battle Map's last explicit save, never the working state.
- Drafts are stored separately and stay private.
- Tokens can be hidden from players (Visible to Players): a hidden token is omitted entirely.
- After a reload, the saved record is published, not the restored draft.
- The published map's assets stay available until the next save is published.

This is the Battle Map's policy, because it has an explicit save workflow. It is not a property of the generic Live Share modules. A follow-up fix (commit bd1ba05, released with 2.3.28) stops the player asking again for a background the host has just superseded, before the update naming its replacement arrives.

**2.3.28 (Battle Map interaction stabilization, 2026-09-30):** supporting Battle Map fixes, not a Live Share milestone.
- Turning Measure off through its button no longer leaves a stray persistent measurement.
- A right-click no longer starts a token drag, which used to snap an off-grid token and mark the map unsaved.

No Live Share behavior changed.

**2.3.29 (Live Share presentation overlays, 2026-10-01): Milestone 4 part A, presentation completeness, is done (§24).**
- Players see the saved aura and vision cone of every token they can see, drawn as structured overlays under the tokens.
- The snapshot is version 3: each token carries `aura` and `visionCone`, as `null` or small validated primitives (§13.1, §13.4).
- Hidden tokens send none of it. Overlay, rotation and grid saves never recompose or resend the background.
- Not yet validated on real devices (Milestone 4's exit requires that).

**Next:** the rest of Milestone 4: performance profiling (part B), then optimization only on evidence (part C), and a real-device validation (§24).

**Backlog (Battle Map, found during the 2.3.27 and 2.3.28 reviews; not yet fixed):**
- Pre-existing: a touch long-press (and Ctrl+click on a Mac, which is a primary-button press) starts a token drag before its menu opens, so on release an off-grid token snaps and the map is marked unsaved (the 2.3.28 right-click fix does not cover a primary-button press).
- Pre-existing: pressing Alt during a left-drag of a token leaves the drag active after release; the next pointerup anywhere (e.g. a tab click) snaps the token and marks the map unsaved.
- Pre-existing: the middle mouse button pans only outside Measure / Brush / calibration modes; in those modes a middle-drag measures, paints fog or picks a grid point.
- Docs: docs/BATTLEMAP.md describes a right-click menu on persistent measurements (Rename / Delete) that the code does not have.
- Pre-existing: Reset clears only the localStorage copy of the map (not IndexedDB or the draft) and does not mark the map unsaved.
- Cleanup: `check()`/debounce in battle-map-share-assets.js and `schedule()` in battle-map-share-state.js have no production caller since 2.3.27 (documented as such); delete them with their unit tests.
- Cleanup: the Save button's tooltip wording is written both by battlemap.html and js/battlemap-live-share.js; make the page the only writer.
- Pre-existing: if IndexedDB never answers (e.g. blocked by another tab), loading never finishes and saves wait on "Saving…" with no message; add a timeout with a localStorage fallback or a save error.
- Pre-existing: loading a map image or importing while the stored map is still loading can be overwritten by the stored map's image and fog when they finish decoding (no privacy effect: the old fog stays with the old map).
- Pre-existing, rarer since drafts: if the IndexedDB write of a save fails but its localStorage copy succeeds, a reload reads the older IndexedDB record (and discards the newer draft as stale); read the newer of the two copies.
- Cleanup: the saved-record normalization in publishSavedRecord repeats load()'s; share one normalizeRecord(). Test the TOKEN_WAIT_MS path (slow custom art must not hold back publication) and a background build that never settles.

**Revision note:** This plan was revised after an architecture review against the current codebase. Compared with the first draft, seats, passwords and room admission moved from the signaling service to the DM's browser; synchronization starts as whole snapshots instead of snapshots plus patches; a Battle Map state boundary and the player-safe projection are now the first Battle Map milestone; ~~fog is explicitly a trusted-player feature~~ (superseded by the second revision below); and the roadmap proves networking and remote rendering before building room UX.

**Third revision (2026-09-30, after Milestone 3 production validation and 2.3.27/2.3.28):** the plan was reconciled with what exists.
- Battle Map publication is save-gated (§5.4, §6, §14, §16), and generic Live Share is not.
- Per-token Visible to Players exists (§3, §6, §13, §26).
- Fog no longer streams to players while the DM paints, so Milestone 4 no longer aims to make continuous fog painting reach players efficiently.
- Milestone 4 is redefined as player presentation completeness (auras and vision cones as structured overlays) and performance profiling, with optimization only on evidence (§24).
- Settled decisions are marked in §30.

Superseded text is kept, struck through or marked historical.

**Second revision (2026-09-29, after Milestone 2 was validated in production):** the map and fog asset design changed. Players no longer receive the original map image plus a separate fog overlay. Instead the DM's browser composites a **player-visible background** (the map with the current fog baked in) and transfers only that raster. Tokens, names, conditions, auras, measurements and other dynamic overlays stay structured state drawn on top of it. Token images are transferred only for custom art, identified by content-derived asset ids, and sent once per session. §2.3, §3, §5.4, §6, §13, §14, §15, §16, §22–§26 and §30 were updated and Milestones 3 and 4 were replaced. The original design is kept, marked superseded, in §32 and in §24.

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
8. Admitted players see the Battle Map as the DM last saved it (§14), while the DM remains the authoritative host.
9. The DM can lock the room, kick players, reset seats, and end the session.

The feature must preserve the current local-first design of The DM's Toolbox.

---

# 2. Product Principles

## 2.1 Keep persistent data local

Live Share must not require campaign data, saved encounters, journals, characters, or other persistent application state to be stored on a central server.

~~Only data explicitly required for the active shared session leaves the host browser, and it goes to the players' browsers, not to a server.~~

Only data explicitly required for the active shared session leaves the host browser, and it is sent to the players' browsers. No server stores it. More precisely:

- The **signaling relay** (§20) carries only connection setup: room registration and WebRTC offers, answers and ICE candidates. It never receives Battle Map or other game state, and it keeps only ephemeral room bookkeeping.
- On a **direct WebRTC connection**, session data goes browser to browser.
- Where ICE selects a **TURN relay** (§21), the same WebRTC packets pass through the TURN server, still DTLS-encrypted between the two browsers. TURN forwards packets; it cannot read them.
- **No persistent campaign or game state** is stored on the relay, the TURN service or any other server.

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

- **Structured secrets** — hidden entity data (for example tokens the DM hid with Visible to Players, §13.3), exact HP, DM notes, private metadata. These are **never transmitted** when hidden. The guarantee is enforced by the player-safe projection and proven by tests that the fields are absent, not merely hidden in the player UI.
- ~~**Fog of war over the map image** — a **trusted-player** feature. The whole map image is transferred and fog is drawn over it in the player client. This hides the map from normal viewing, not from a player who inspects the transferred data.~~ *(Superseded on 2026-09-29; see §13.2 and §32.)*
- **Fog of war over the map image** — the DM's browser composites the map with the current fog and transfers only that player-visible raster (§13.2, §15). The player receives only the current player-visible raster rather than the original unobscured map asset, so hidden terrain is not intentionally transmitted as part of the Live Share view. This is a stronger boundary than the original trusted-player overlay, but it is not absolute secrecy (§13.2).

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
- ~~Map image and token image transfer~~ A host-composited player-visible background (map with fog baked in) and selective transfer of custom token images (§15)
- ~~Fog-of-war synchronization (trusted-player model)~~ Fog-of-war synchronization through the composited background (§13.2, §16)
- Token-position, condition and public-measurement synchronization, plus the public presentation overlays chosen in Milestone 4 (auras and vision cones as structured state, §13.4)
- Battle Map publication of the last explicit save: unsaved edits stay private (2.3.27, §14)
- Per-token **Visible to Players**: hidden tokens are omitted from everything players receive (2.3.27, §13.3)
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
- Tiled, dirty-region or delta background transfer (only if Milestone 4 profiling shows a concrete problem, §24)
- ~~Token visibility controls ("Visible to Players")~~ Implemented in 2.3.27 (§13.3).
- Enemy health visibility options
- ~~Asset hash/caching across reconnects or sessions~~ Asset caching beyond the current session. Content-derived asset ids and a session-scoped player cache are now part of Milestone 3 (§15.4).
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
- ~~maintain the session revision counter~~
- carry the seam's revisions to players without owning them: the structured snapshot revision and, from Milestone 3, the background revision both come from the Battle Map side (§5.4, §14)
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
- ~~signal that shareable state has changed,~~ signal that the **published** state changed. As built in Milestone 1, the seam signalled live edits. Since 2.3.27 it reads the Battle Map's last explicitly saved state, so it signals when a successful Save publishes a change, never on an unsaved edit (§14).
- ~~expose the fog and asset data Live Share transfers.~~
- produce the player-visible background composite (the map image with the fog baked in) and the bytes of custom token images, each with its own identity (§15). Composition happens on the Battle Map side of the seam, so networking code receives encoded bytes and ids, never the original map image or the fog canvas. Since 2.3.27 the composite is built from the inputs captured at save time, not from the DM's working map.
- own the structured snapshot revision (Milestone 1) and, from Milestone 3, the separate background revision (§14).
- **apply the Battle Map's publication policy** (2.3.27, `js/modules/battle-map-publication.js`):
  - working edits are a private draft;
  - only a successful explicit Save (the Save button, Ctrl+S or Save Session) captures the saved state and publishes it;
  - structured state and the finished background are committed together;
  - the published state's assets stay retrievable until a newer publication commits;
  - after a reload, the publication is built from the saved record alone.

  This gate belongs to the Battle Map. The generic Live Share modules send whatever a surface publishes (§14).

Live Share code talks only to this seam, never to Battle Map internals directly.

## 5.5 Player-Safe Projection (DM browser)

- convert DM Battle Map state into player-safe state
- include only allowlisted fields
- apply visibility rules: tokens hidden with Visible to Players are omitted entirely (2.3.27, §13.3); any further rule (enemy health, for example) is added deliberately

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
- **No central change point.** Changes are made in place throughout the page and marked with a dirty flag (around 40 scattered call sites) and a render request. There is no single place that says "shareable state changed". Since 2.3.27 Live Share does not depend on one: for the Battle Map, the publication point is the explicit Save.
- **Fog is pixels plus shapes.** Painted fog lives on a canvas (a bitmap aligned with the map image, saved as an image data URL), with separate structured fog shapes on top. Brush painting changes pixels, not objects.
- **Tokens carry HP.** The token model includes `hp` and `maxHp`, a label flag, conditions, aura and vision cone, and an image source.
- ~~**No token visibility concept.** Tokens have no "hidden" or "visible to players" flag. Hidden tokens would be a new DM feature.~~
- **Per-token visibility (2.3.27).**
  - Tokens have a `visibleToPlayers` flag, set from the token's right-click menu.
  - A missing flag means visible, so maps and exports from before 2.3.27 are unchanged.
  - `false` omits the token from everything players receive (§13.3).
  - The DM still sees a hidden token, dimmed and with a crossed-eye badge.
  - The flag is saved and kept by Export/Import.
- **Token images vary in origin.** A token's image may be a data URL or an external URL. The host can read and re-send data URLs and locally stored images directly. For an external URL, the host browser's ability to fetch and read the image data is subject to browser CORS rules: same-origin or CORS-enabled images can be fetched and relayed, but many arbitrary third-party images will block host-side reading. So "the host transfers every external token image" cannot be guaranteed for all URLs (§15).
- **Persistence is local, with an explicit save (2.3.27).** The map is saved to IndexedDB (with a localStorage copy) as two records:
  - **the explicitly saved map** (`current-session`), which is what Live Share publishes;
  - **an autosaved private working draft** (`current-draft`), written by actions that store the map straight away.

  A draft never replaces the saved record. After a reload the DM gets the draft back as an unsaved working map, while Live Share continues from the saved map.

Consequences for the plan:

1. **Do not wire WebRTC into the existing dirty/render call sites.** Establish one explicit share-state seam first (Milestone 1): conceptually a `getPlayerSafeBattleMapState()` and a single observable "shareable state changed" notification. The exact mechanism is an implementation decision.
2. **Unit-test the seam heavily**, before any networking uses it.
3. ~~**Fog needs its own transfer channel** (§16), separate from structured snapshots.~~ **Fog is baked into the player-visible background on the host** (§15.2, §16), not transferred separately. The fog bitmap is already aligned with the map image (it is sized to the image's natural pixels, and fog shapes are stored in image coordinates), so the composite is built in map image space and placed by the map transform. That background is separate from structured snapshots.
4. ~~**Token visibility and HP visibility are product features to be designed later**, not filters that already exist (§13).~~ **Token visibility exists since 2.3.27 (§13.3); HP visibility remains a product feature to be designed later** (§13).
5. **Battle Map publication is save-gated (2.3.27).**
   - The Battle Map has an explicit save workflow, so players see the last explicitly saved map, never the working state (§5.4, §14).
   - This keeps unfinished preparation private, and fog painted but not saved never reaches players.
   - It also means fog and background work happens once per save, not per brush stroke (§16).

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
8. The accepted player enters the session and receives the current structured snapshot (for the Battle Map: the last explicitly saved map, §14), then the player-visible background and any custom token assets it needs (§15.5).

Seat selection is provisional: choosing a seat in the join screen reserves nothing. A seat is claimed only when the DM's browser accepts an explicit **Join Room** request. Because every claim is decided in one place (the DM's browser, one decision at a time), two players cannot both win the same seat.

This join flow is product behavior, from Milestone 5 onward (§24). From then on, admission is mandatory: a connected but not-yet-admitted player receives only admission state (seats, whether a password is required, whether the room is locked) — never map state, background, other assets or pings — until the DM's browser accepts its join request. The development prototypes of Milestones 0–4 have no admission step (§11).

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

**Milestones 0–4 are engineering validation stages, not production room behavior.** They exist only to validate networking, the player-safe projection, remote rendering, asset transfer and fog, and (Milestone 4) presentation completeness and performance. During these milestones:

- there may be no formal seat or admission model yet,
- possession of the temporary development room link may be enough to receive prototype state,
- these builds must not be described or exposed as production-ready public rooms.

No temporary seat logic is added to these milestones just to imitate the later model.

**From Milestone 5 onward**, the join screen, seats and optional password above are the product behavior, and admission is mandatory: an unadmitted peer receives only admission-related state, and no map state, background, other assets or pings are available to it until the DM's browser accepts its join request.

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
- token presentation overlays (Milestone 4, 2.3.29): `aura` and `visionCone`, each `null` or a few validated primitives (§13.4)
- ~~token image references (resolved through asset transfer, §15)~~ token asset ids: `null` for ordinary tokens, and an id only for tokens with custom art, resolved through asset transfer (§15.3)
- the background reference: the player-visible background's asset id and background revision (§15.2)
- public token names, where the token's label is shown
- public conditions
- public persistent measurements
- the structured snapshot revision (§14)

Only tokens whose `visibleToPlayers` is not `false` appear at all (2.3.27, §13.3). For the Battle Map, all of the above describe the last explicitly saved map, never unsaved edits (§14).

Never transmitted (unless a future DM feature deliberately shares it):

- exact HP and max HP (omitted entirely in the first snapshots)
- DM notes and private metadata
- ~~future hidden tokens~~ tokens hidden with Visible to Players: nothing of them is sent, not their id, name, position, size, rotation, conditions or asset id, not their custom art, and none of their aura or vision-cone fields (2.3.27, §13.3; overlays since 2.3.29)
- the Battle Map's unsaved working state (the private draft, §14)
- UI/editor state (selection, drag state, tool state)
- unrelated saved map/session data
- unrelated LocalStorage and IndexedDB data
- any other application state

The first Battle Map milestone treated **all currently placed tokens as visible** and **omits HP entirely**. *(Milestone 1 as built. Since 2.3.27 the DM can hide a token from players (§13.3); HP is still omitted entirely.)*

**Milestone 3 deliberately extends the Milestone 1 allowlist** with exactly two references: `background: { assetId, revision }` on the snapshot, and `assetId: null | id` on each token. They are added to `projectPlayerSafeState()` like every other field. Networking still consumes only the seam's output and never reaches into canonical Battle Map state; the bytes those ids name also come from the seam (§5.4). Presentation-only overlays such as auras and vision cones also belong to the structured layer (§13.4). ~~They are not in the projection yet. Adding them is a deliberate allowlist change, planned for Milestone 4 (§13.4, §24, §30).~~ Milestone 4 added them as a second deliberate extension (2.3.29, snapshot version 3, §13.4).

## 13.2 Fog of war (host-composited background)

*Revised on 2026-09-29. The original trusted-player model is preserved in §32.1.*

The DM's browser composites the original map image with the current fog state (painted cover and reveal, plus fog shapes) into one player-visible raster, and only that raster is transferred (§15.2). In it, areas hidden from players are opaque fog, whatever see-through fog display the DM uses for themselves.

- The player receives only the current player-visible raster rather than the original unobscured map asset, so hidden terrain is not intentionally transmitted as part of the Live Share view.
- The original map image is never sent to players, and the player client never needs it.
- Revealing an area and saving sends a new background that includes the newly visible pixels. Nothing still hidden is sent ahead of time, and fog changed but not saved is not sent at all (2.3.27, §16).
- A saved fog layer that cannot be decoded covers the whole map (fails closed), and nothing is shared while saved fog is still decoding.

This is a **stronger privacy boundary** than the original model, in which the player's browser held the whole unobscured map under a client-side overlay that a technically motivated player could remove. It is still not absolute secrecy or cryptographic protection, and the documentation must not claim otherwise:

- a player keeps whatever it has already received, so covering a revealed area again hides it from the live view but does not retract earlier backgrounds,
- the fog only covers map pixels. Tokens and other structured overlays are sent as structured state (§13.1), so a token standing in a fogged area is still visible to players unless the DM hides it with Visible to Players (§13.3). Fog and token visibility are separate concepts: fog controls map pixels, Visible to Players controls whether a token exists in player-visible state. Fog never hides tokens automatically, and none is planned (§13.4),
- the guarantee depends on the host composing correctly, so it is tested as part of Milestone 3 (§25).

## 13.3 Visibility features

~~Later visibility features (not required for early milestones): a per-token **Visible to Players** toggle (hidden tokens are then omitted from the structured snapshot, under the strict guarantee above); enemy health visibility: hidden / health bar or state / exact HP. These are new DM-side features. Neither is required for the networking proof of concept or the first remote rendering.~~ *(Visible to Players shipped in 2.3.27.)*

**Visible to Players (implemented in 2.3.27).** A per-token flag the DM sets from the token's right-click menu:

```text
token.visibleToPlayers !== false   → the token may appear in player-safe state
token.visibleToPlayers === false   → the token is omitted entirely
```

- **Omitted means nothing of the token is sent:** no id, name, position, size, rotation or conditions, no asset id, and no custom art.
  - Its art is not even prepared for transfer.
  - A hidden token contributes no aura or vision-cone fields either (2.3.29). The projection filters hidden tokens before projecting any field.
  - The projection filters hidden tokens before anything else, under the strict guarantee of §13.1.
- **Older maps are unchanged.** A token without the flag (maps and exports from before 2.3.27) is visible. Export/Import keeps the flag; exports always write it explicitly.
- **The DM still sees the token**, dimmed and with a crossed-eye badge.
- **It follows Battle Map save gating.** Hiding or showing a token is an edit like any other: it reaches players when the DM saves.
- **It is separate from fog** (§13.2). Fog never hides tokens, and no automatic "hidden by fog" behavior is planned.

**Still future:** enemy health visibility (hidden / health bar or state / exact HP), a new DM-side feature, not required for V1's early milestones.

## 13.4 Presentation overlays vs. visibility

Two different things must not be confused:

- **Presentation-only overlays** — an aura radius, a vision-radius circle or cone, and similar indicators. They are structured state drawn on top of the background (Layer 2, §15.1), and are never baked into the raster.
- **Actual visibility logic** — if a future vision system decides which map pixels a player is allowed to see, that visibility mask becomes an input to host-side background composition, alongside fog (and likely to filtering of structured state too).

**Presentation overlays in Milestone 4.** The Battle Map ~~already draws~~ draws two presentation-only token overlays for the DM, ~~and players don't see them yet~~ and since 2.3.29 players see both:
- an **aura**: the canonical token field `aura: { radius, color }`, a circle of `radius` grid cells around the token;
- a **vision cone**: `visionCone: { range, angle, color }`, a wedge of `range` grid cells and `angle` degrees, pointing along the token's rotation, which the snapshot already carries.

Milestone 4 adds the ones chosen as public to the player-safe projection.
- The extension is deliberate: small primitive fields, coerced and range-checked, with colors validated against a strict format, and validated again by the player.
- ~~The exact wire form is decided in Milestone 4 from these canonical fields.~~ Decided in 2.3.29, below.
- They are drawn as structured overlays, never baked into the background.

These overlays follow the same rules as the rest of the token:
- **Visible to Players:** a hidden token contributes no aura or vision information at all.
- **Battle Map save gating:** changing an aura is a private draft until Save. Save produces a new structured snapshot, and the background is neither recomposited nor retransmitted.

**Wire form (2.3.29, snapshot version 3).** Every token carries both keys:

```text
aura:        null | { radius, color }          radius: cells, 0 < r ≤ 1000
visionCone:  null | { range, angle, color }    range: cells, 0 < r ≤ 1000; angle: degrees, 0 < a ≤ 360
color:       "#rrggbb", lowercase
```

- **The host (projection)** copies only these primitives, never the token's objects. A radius or range that is not a positive finite number means no overlay (`null`), as on the DM's map. A larger one is capped at 1000 cells. A missing, zero or invalid angle becomes 90°, the DM map's default, and more than 360° becomes 360°. A negative angle also becomes 90°. Since 2.3.29 the Vision dialog stores only 10–360°, so a negative angle can come only from older or hand-edited data. The DM's canvas draws such an angle as a backward wedge; players get 90°. A color that is not `#rrggbb` (or `#rgb`, expanded) becomes the overlay's default.
- **The player** requires both keys. It rejects the whole snapshot when a value is out of range, when a value is of the wrong type, or when a color is anything but lowercase `#rrggbb`. It copies only the listed fields.
- **The player draws** the aura as a circle of `(radius + 0.5) × grid.size` about the token's centre, and the cone as a wedge of `range × grid.size` and `angle`°, centred on the token's rotation. That is the DM's geometry, in world units, beneath every token. The overlays don't affect the player's framing.
- **Not shared:** the HP bar (HP stays private), the DM-only hidden-token badge and the selection outline. No other presentation overlay was found in the inventory.

A vision cone shown to players is an **indicator, not visibility authorization.** It does not decide what players can see, does not feed fog or composition, and does not hide or reveal tokens.

No vision-based visibility or line-of-sight system is planned for Milestones 3 or 4. Milestone 3 was not expanded into a vision system, and Milestone 4 is not one either.

---

# 14. State Synchronization Model

## V1: throttled whole-state snapshots of the published state

Generic Live Share does not know about saving. Each shared surface decides when a new player-safe version of its state is **published**, and networking sends whatever is published:

```text
GENERIC LIVE SHARE
  a surface publishes a new player-safe authoritative version
    → its seam signals the change
    → Live Share sends the new snapshot (throttled), and the player requests any assets it references

BATTLE MAP (since 2.3.27)
  the DM edits the working state
    → the map is dirty; the edit is a private draft; no player update
  a successful explicit Save (Save button, Ctrl+S, Save Session)
    → the Battle Map captures the saved state and builds its background
    → structured state and background are committed together as the new publication
    → Live Share sends the new player-safe snapshot; players request the assets it references
  a failed save publishes nothing; a player joining mid-draft gets the last saved map

INITIATIVE TRACKER (future, §27)
  no explicit Save workflow
    → publishes its player-safe state as soon as its authoritative tracking state changes
```

Battle Map save gating is the Battle Map's policy. It must not move into the generic modules (`js/modules/live-share/*`), and the Initiative Tracker must stay free to publish immediately.

The sending mechanics are the same for every surface:

1. The surface's seam reports that its published, player-safe state changed.
2. Live Share reads the player-safe snapshot at send time.
3. Sending is throttled (at most one send per 100 ms, the latest state wins), so a burst of changes costs one send.
4. The entire small structured snapshot is sent to each admitted player.
5. The player replaces its current rendered state with the snapshot.

*History: as built in Milestones 1–2, the Battle Map's seam published live edits (step 1 ran on every edit and send throttling absorbed drags). That changed in 2.3.27.*

Each snapshot carries ~~a monotonically increasing session revision~~ the structured snapshot revision (below). A player ignores any snapshot that is not newer than the one it has already applied. A newly connected or reconnected player simply receives the current snapshot.

V1 does not use:

- replay logs,
- incremental patches,
- revision-gap detection and recovery,
- ordered event reconstruction.

## Revisions

Three different things are called "revision". No single counter controls all of them:

- **Structured snapshot revision** — `revision` in each `battlemap-snapshot` (Milestones 1–2). The share-state seam owns it, and it increases only when player-visible structured content changes. For the Battle Map that means when a Save publishes changed content (2.3.27). It restarts at 1 when the host's Battle Map page loads. A player's receiver lives for one connection to one host page load, and applies only revisions newer than the last one it applied.
- **Background revision** — `background.revision` (Milestone 3). It is produced with the player-visible composite and increases only when that background changes, independently of the snapshot revision. A background change also changes the snapshot's background reference, so the snapshot revision moves then too; the reverse never happens (a saved token move does not touch the background revision).
- **Room/session revision (future; none exists today)** — if host-refresh resumption (Milestone 7) needs players to tell a reloaded host page's revisions from the previous page's, that will be a separate session identifier or epoch paired with the revisions above, not a reuse of either counter.

The structured Battle Map state is small (a table's worth of tokens and measurements), so whole snapshots are expected to be cheap. Incremental updates should be introduced only if profiling demonstrates a real need.

~~Fog and binary assets are not part of the structured snapshot; they use their own channels (§15, §16).~~ Raster data (the player-visible background and custom token images) is not part of the structured snapshot. The snapshot carries only asset ids and the background revision, and the bytes travel through asset transfer (§15). A saved token move (or, since 2.3.29, a saved aura, vision-cone or rotation change) changes only the snapshot revision; it never recomposites or retransmits the background.

---

# 15. Asset Transfer

*Revised on 2026-09-29. The original design (the map image transferred as is, with fog on its own channel) is preserved in §32.2.*

Two kinds of raster data go to players, both over the WebRTC DataChannel and never through the relay:

1. **The player-visible background**, one raster the host composites from the map image and the current fog (§15.2).
2. **Custom token images**, only for tokens that actually use custom art (§15.3).

Everything else players see stays structured state (§14), drawn on top.

## 15.1 Layers

```text
Layer 1  player-visible raster background   map + fog / cover / reveal, composited on the host
Layer 2  structured dynamic overlays        tokens, names, conditions, auras, measurements,
                                            other player-safe structured state
```

Frequently changing game objects are never baked into the raster. Moving a token or an aura must not force a recomposite and a new image transfer.

## 15.2 Player-visible background

```text
DM Battle Map
  original map image + fog bitmap (painted cover / reveal) + fog shapes
      ↓   host-side canvas composition, in map image space
  player-visible composite
      ↓   encode: WebP where supported and effective, PNG fallback
  background asset (asset id, metadata, bytes)
      ↓   chunked DataChannel transfer
  player: drawn as Layer 1, placed in the world by the snapshot's map transform
```

- **Where it is made.** Composition happens on the Battle Map side of the share-state seam (§5.4). Networking code receives encoded bytes and their identity; it never reads the original map image, the fog bitmap or any other canonical state.
- **Coordinates.** The composite is in the map image's own pixel space, the same space as the fog bitmap and fog shapes. Changing the map's scale or offset (the map transform, already structured state) moves the background on the player without recompositing it.
- **Hidden means opaque.** Areas hidden from players are opaque in the composite (§13.2). The unobscured source map is never sent.
- **Background revision and identity, separate from the snapshot revision.** The background has its own revision and asset id. The structured snapshot only refers to it:

  ```text
  snapshot revision 195
    background: { assetId: "…", revision: 7 }
  ```

  - *Moving a token and saving:* the snapshot revision changes; the background revision does not; no image is transferred.
  - *Changing fog and saving:* the snapshot revision changes (its background reference changes); the background revision changes; a new background is composited and transferred. For the Battle Map, painting fog without saving changes only the DM's view (§16).
- **Whole backgrounds in V1.** A new, complete composite is sent whenever a published background changes. Dirty-region updates, tiling and differential background transfer are possible later optimizations, only if Milestone 4 profiling shows a concrete problem (§24).
- **Encoding.** Canvas-based composition; WebP where the browser can encode it and it is effective, otherwise PNG. ~~Quality and compression settings are to be chosen from benchmarks on real battle maps, not fixed in advance. The maximum composite resolution and byte size are a Milestone 3 decision (§30).~~ Decided in Milestone 3 from benchmarks: WebP quality 0.85 with PNG fallback; 8192 px per side, 16.7 M pixels (larger maps are composed at a reduced scale), 16 MiB per background (§24, §30).
- **Latest wins.** If a newer save publishes a different background before a transfer finishes, the host aborts the older transfer as `superseded`.
  - The player does not ask for a superseded background again until a newer snapshot references it (bd1ba05).
  - Since 2.3.27, the background and token art of the state still published stay available until the newer publication has committed. A player joining in between still gets every image the published state names.
- **When no composite can be made** (no map loaded, or encoding fails), players keep the neutral placeholder surface from Milestone 2. The structured map keeps working.

## 15.3 Selective token images

- **Ordinary tokens need no image.** Default and generic tokens keep the lightweight structured marker and label that players already see in Milestone 2, and their `assetId` is `null`. Not every token needs an asset.
- **Custom art is transferred.** A token image is sent only when the token uses a meaningful custom asset: user-uploaded token art, a character portrait or token from the Character Manager, or another explicitly attached special image. How the host tells custom art from generic art is an implementation decision for Milestone 3 (§30).
- **Shared images are sent once.** Tokens that use the same custom image share one asset id, and the image is transferred once and reused.
- **Failure degrades gracefully.** If an image is unavailable, can't be read, or fails to transfer, the player shows the structured marker and name. A missing image never breaks the map.
- **External URLs.** Players never fetch external token URLs themselves; that would make each player's browser contact third-party hosts. The host transfers an external image only if its browser can read it (same-origin or CORS-enabled). Otherwise the token falls back to its marker (§30).

## 15.4 Asset identity, cache and deduplication

```text
snapshot:
  background: { assetId: "…", revision: 7 }
  tokens[i].assetId: null | "…"

asset transfer:
  assetId
  metadata (kind, MIME type, byte length, pixel size)
  chunked bytes
```

- **Stable, content-derived ids** where practical, for example a hash of the encoded bytes (SHA-256 through Web Crypto), so identical bytes deduplicate naturally. The player can also check that reassembled bytes match the id before using them.
- **Session-scoped cache on the player**, keyed by asset id. If an asset id is already present, it is not retransmitted: the host tracks what each player already holds.
- **Nothing persists beyond the session.** Assets live in memory as Blobs and temporary object URLs.
  - The player releases them when superseded (an older background) and when the session ends.
  - The host keeps the published state's assets until a newer publication commits, then releases the ones no longer referenced (2.3.27). It never builds a history of old backgrounds.
  - Persisting Live Share assets is not planned unless Milestone 4 measurements justify revisiting it (§30).
- **Transfer mechanics.** Metadata is sent before the data, and large assets are split into chunks. Size limits are enforced on both sides. Each asset is validated (MIME allowlist, declared size, chunk count, id match), and anything oversized or malformed is rejected. Asset chunks respect channel backpressure like snapshots do, and must not starve structured snapshots. ~~whether that needs interleaving or a second DataChannel is decided in Milestone 3 (§30).~~ Decided in Milestone 3: one DataChannel, with chunks sent only within a buffer budget below the snapshot sender's "busy" level (§24, §30).

## 15.5 Progressive rendering

The player never waits for rasters before showing the map:

```text
connect
  ↓
structured state renders immediately
  ↓
placeholder map surface + placeholder token markers visible
  ↓
background asset arrives → background fills in
  ↓
custom token assets arrive → token art fills in
  ↓
normal structured state updates continue independently throughout
```

A failed or slow asset transfer leaves the placeholder in place; it never blocks structured updates.

The signaling relay never receives or stores assets.

---

# 16. Fog Synchronization

*Revised on 2026-09-29. The original separate fog channel is preserved in §32.3.*

Fog has no channel of its own. It is baked into the player-visible background (§15.2): a published fog change produces a new background revision, a new composite and a new background transfer, while structured snapshots continue independently.

For the Battle Map, fog follows save gating (2.3.27):

```text
the DM paints or changes fog
  → the DM's view changes locally; the map is marked unsaved
  → players stay on the previous saved background; nothing is composited or sent for them

Save
  → the saved fog state is composited (map + fog, in map image space)
  → a new background revision and asset id if the pixels changed (identical pixels keep both)
  → the new published snapshot references it
  → players request and receive it; the previous one stays until the new one is shown
```

- Composition and encoding happen once per save, not per brush stroke. They still have to be fast enough when the DM saves; Milestone 4 measures that (§24). Real-time brush streaming to players is not a goal.
- V1 sends the whole background. Dirty-region, tile or delta updates are considered only if Milestone 4 profiling shows a concrete problem.
- The privacy guarantees do not depend on timing:
  - the source map is never transferred;
  - hidden pixels are masked to opaque fog before encoding;
  - pixels a player has already received cannot be "unseen" by covering them again (§13.2);
  - a saved fog layer that cannot be decoded covers the whole map (fails closed).
- The fog encoding question is now the background encoding question (§15.2, §30).
- Presentation-only vision indicators stay structured. A future visibility mask would join fog as an input to composition (§13.4).

*History: as originally implemented in Milestone 3 (2.3.26), the host recomposited after live fog changes, debounced 250 ms after the last change and at most 1 s apart. ~~Making frequent fog edits efficient (recomposition scheduling, background transfer throttling, and dirty-region or tile updates only if measurements justify them) is Milestone 4.~~ Changed in 2.3.27: the Battle Map composites at publication only.*

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
6. receive the current structured snapshot, the current player-visible background (fog is part of it, §16) and any custom token assets it is missing,
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

~~Realistic implementation categories: Cloudflare Workers + Durable Objects, PartyKit, another small hosted WebSocket relay. No provider is chosen yet (§30).~~

**Chosen in Milestone 0 and running in production:** Cloudflare Workers + Durable Objects, one Durable Object per room (`relay/cloudflare/`). A local Node relay (`relay/node-relay.mjs`) speaks the same protocol and is used for development and automated tests. Deployment and operation are documented in `relay/README.md`.

## Responsibilities (deliberately limited)

- create/identify an ephemeral room, registered by its host,
- connect joining peers with the room's host,
- relay WebRTC signaling messages (offers, answers, ICE candidates),
- expire rooms (host grace period, maximum lifetime, idle timeout),
- basic abuse and rate limits appropriate to a relay (connection attempts, message rate, message size),
- issue short-lived TURN credentials: implemented as the Worker's `GET /turn-credentials` route (§21).

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
- TURN as a fallback for networks that block direct connections

Approach:

- direct peer-to-peer connection is attempted first, and stays preferred: ICE transport policy remains `all`, so a direct path wins whenever one works,
- STUN helps browsers discover how to reach each other across home routers,
- some network environments (certain corporate, school, mobile and strict NAT setups) cannot connect directly; there the connection goes through TURN,
- ~~production reliability will likely require TURN support,~~
- ~~STUN-only is acceptable for the earliest experiments.~~

**Status: implemented and validated in production (Milestone 0, 2.3.23).** Cloudflare Realtime TURN is the fallback. A desktop-to-5G-phone path that could not connect STUN-only connected through it, while a direct desktop pair did not use it. Whether TURN is in use is reported from the selected candidate pair, not from configuration. If credentials can't be fetched, the page says so and connects STUN-only; rooms are never blocked.

TURN credentials:

- the long-lived TURN key stays server-side, in Wrangler secrets, and is never embedded in the public static application,
- the relay Worker's `GET /turn-credentials` route (origin-restricted, not cached) issues short-lived credentials (4 hours) for each connection attempt; pages hold them in memory only and never show them in diagnostics,
- still to do (Milestone 8): rate limiting that route and monitoring TURN usage.

~~This is not designed in detail until after the networking proof of concept.~~ Details: `relay/README.md`.

Topology is host-and-spoke: each player connects only to the DM's browser.

---

# 22. Security Requirements

## Mandatory

These apply to product behavior (Milestone 5 onward). The development prototypes of Milestones 0–4 have no admission model and must not be exposed as production rooms (§11); the projection, validation, limits and injection rules below apply to them as soon as the corresponding pieces exist.

- high-entropy room invitations
- DM-browser-side admission: password check, lock check, seat validation
- seat claims decided in one place (the DM's browser)
- one active connection per seat in V1
- admission is mandatory: an unadmitted peer receives only admission-related state, and no map state, background, other assets or pings until the DM's browser accepts its join request
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
- ~~no false claims about fog secrecy (§13.2)~~ the fog model is documented accurately: players receive only the player-visible composite, which is stronger than an overlay but claims no absolute secrecy (§13.2)
- the original unobscured map asset is never transmitted to players (§15.2)
- tokens hidden with Visible to Players contribute nothing to what is transmitted: no structured fields, no asset ids, no custom art (§13.3)
- the Battle Map's unsaved working state is never transmitted; only the last explicitly saved map is published (§14)

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
- the original map image, or pixels hidden under fog, appearing in any transmitted background
- a hidden token's data or custom art appearing in any transmitted snapshot or asset
- unsaved Battle Map edits (structured or fog) appearing in anything transmitted
- malformed, oversized or out-of-order asset chunks; bytes that don't match their asset id; references to asset ids that were never sent

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
- structured snapshot revision (last sent / last applied)
- background revision and asset transfer state (assets sent, cached, failed, bytes; counts and ids only, never image content)
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

Exit: every Battle Map change that players should see produces a new snapshot through the seam, and the projection tests prove what is excluded. *(Milestone 1 as built. Since 2.3.27 such a change produces a new snapshot when the DM saves it (§14).)*

**Status: complete (2.3.24).** The seam is `js/modules/battle-map-share-state.js`, wired into `battlemap.html`:

- `projectPlayerSafeState({ state, persistentMeasurements })` is a pure allowlist projection: schema/version, map size (no image), map transform, grid, and per token only id, position, size, rotation, name (only where its label is shown) and conditions; plus persistent measurements. Every value is coerced to a primitive, so a field added to the Battle Map later is not shared unless it is added to the projection.
- One change detector: after every rendered frame, every `setDirty()` and every `save()`, the seam recomputes the projection and, only if its content differs from the last one, increases `revision` and signals `onChange({ revision })`. Editor-only changes (selection, drag, the DM's pan/zoom, HP, fog, aura, vision cone, token images) never move the revision.
- `window.BattleMapLiveShare` exposes `getPlayerSafeState()` (content plus revision) and `onShareableStateChanged(fn)` for later milestones. Nothing is sent anywhere yet.
- *Superseded in part by 2.3.27:* the seam's source is now the Battle Map's published (last saved) state, checked when a save is published, not after every frame or `setDirty()`. The projection also omits tokens hidden with Visible to Players (§13.3).
- Revisions restart at each page load; Milestone 2 pairs them with its session when it rejects stale snapshots. *(As built in Milestone 2: each player's receiver is scoped to one connection to one host page load; this is the structured snapshot revision, see §14 Revisions.)*

## Milestone 2 — Remote Structured Rendering

- send throttled whole-state snapshots over WebRTC,
- the player renders grid, tokens, conditions and measurements,
- stale revisions are ignored.

No patch/event protocol.

Exit: a player watches the DM manipulate tokens and measurements in near real time. *(Milestone 2 as built. Since 2.3.27 the player sees the DM's changes when the DM saves them (§14).)*

**Status: complete (2.3.25), validated in production.** Beyond the automated tests on localhost, a real-device check over the deployed relay confirmed it: the host Battle Map sends structured state, the player renders it read-only, snapshots arrive and apply correctly, direct WebRTC works, and the TURN fallback works when needed.

- Host: `battlemap.html?liveshare=1` adds a development panel (`js/battlemap-live-share.js`); without the parameter the page is unchanged. It uses only `window.BattleMapLiveShare` (the Milestone 1 seam): Live Share never reads Battle Map state and never reshapes the snapshot. Room and peer handling is `js/modules/live-share/host-session.js`, shared with `liveshare-dev.html`.
- Message: `{v:0, type:'battlemap-snapshot', payload:<seam snapshot>}`, at most 240 KB (`protocol.js`).
- Sending (`snapshot-sender.js`): the current snapshot as soon as a player's channel opens; then, on the seam's change signal, at most one send per 100 ms, reading the seam at send time (latest state wins; the last state of a burst is always sent; never inside the Battle Map's redraw). While a channel has more than 64 KB buffered the player is only marked pending, and gets the then-current snapshot on `bufferedamountlow`.
- Player (`liveshare-dev.html`): `battlemap-snapshot.js` validates each payload and copies only allowlisted fields; a snapshot is applied only if its revision is newer than the last one applied (the seam's revision; a receiver lives for one connection to one host page load). `battlemap-view.js` draws it as SVG in the Battle Map's world coordinates, fitted to the map surface and content (the DM's pan/zoom is not shared). On disconnect the last map stays, marked disconnected.
- Not shared yet: ~~map and token images (Milestone 3), fog (Milestone 4)~~ the player-visible background with fog, and custom token images (both revised Milestone 3); HP.

## ~~Milestone 3 — Asset Transfer~~ (superseded)

> **Superseded after Milestone 2 production validation (2026-09-29)** by the revised Milestone 3 below. Kept for history. The reasons are listed in §32.

- ~~map image transfer~~
- ~~token image transfer: data URLs and locally stored images, plus external images the host browser can fetch and read (same-origin or CORS-enabled)~~
- ~~a decided fallback policy for external token images the host cannot read (§15, §30)~~
- ~~chunking of large binary data, with size limits~~
- ~~temporary player-side asset reconstruction and cleanup~~

~~Exit: a player joining the room sees the current map and every token image the host can transfer, without contacting any other host, and external images the host cannot read are handled by the chosen fallback policy.~~

## ~~Milestone 4 — Fog Synchronization~~ (superseded)

> **Superseded after Milestone 2 production validation (2026-09-29)** by the revised Milestone 4 below. Kept for history.

- ~~trusted-player fog model (§13.2)~~
- ~~fog transferred and rendered on its own channel~~
- ~~throttled fog snapshots~~
- ~~documentation that makes no claim the underlying map is hidden from the player's device~~

~~Exit: fog changes appear for players within an acceptable delay.~~

## Milestone 3 (revised) — Player-Visible Background & Asset Transfer

- host-side composition of the player-visible background: map + fog (painted cover and reveal, fog shapes), in map image space (§15.2)
- a background revision and asset id, separate from the structured snapshot revision
- WebP/PNG encoding, with settings chosen from real battle-map benchmarks
- chunked DataChannel transfer with metadata first, size limits and validation
- content-derived asset ids, a session-scoped player asset cache and deduplication: an asset the player holds is never re-sent (§15.4)
- progressive display: structured map first, background and token art fill in as they arrive (§15.5)
- selective custom token image transfer: user-uploaded art, Character Manager portraits/tokens and other explicitly attached images only; one transfer per distinct image (§15.3)
- fallback to the structured token marker and name whenever an image is unavailable or fails
- a deliberate extension of the Milestone 1 allowlist with exactly two references, `background: { assetId, revision }` and token `assetId: null | id` (§13.1); networking still consumes only the seam's output and never reaches into canonical Battle Map state
- no fog editing optimization yet: frequent fog edits simply recomposite and resend the whole background, throttled ~~(Milestone 4 improves this)~~ *(since 2.3.27 the Battle Map composites only when a save is published, §16)*

Not in scope: a vision or visibility system (§13.4), dirty-region/tiled/delta backgrounds, persistent asset caching, product room UX.

Exit:

- the player sees the actual map background,
- the current fog/reveal state is baked into what the player receives,
- the unobscured source map is not sent to the player,
- structured tokens remain independently rendered and updated on top of the background,
- custom token assets transfer only when required,
- repeated assets are not retransmitted,
- ordinary token movement does not trigger background retransmission,
- a real-device test succeeds.

**Status: complete. Implemented in 2.3.26, validated by automated tests, and validated in production on 2026-09-30.**

The production check ran over the deployed relay, direct WebRTC, with the 2.3.27 staged publishing in place. It confirmed:
- the real player-visible background, with the fog baked into the transferred raster;
- custom token art transferred, and default tokens staying marker-only;
- background replacement when saved fog changes;
- staged publication and Visible to Players.

TURN had already been validated in Milestones 0 and 2. A race found by CI after 2.3.27 was fixed in commit bd1ba05: the player asked again for a background the host had just superseded, before the snapshot naming its replacement arrived.

The notes below describe Milestone 3 as originally implemented. Where 2.3.27 changed its runtime trigger, that is marked.

- *Changed in 2.3.27:* the Battle Map no longer drives this preparer from live fog changes. Its inputs are those of the save being published; the publisher calls `flush()` and then `retain()`s what it committed, and the change detector/debounce below (`check()`) has no production caller (§16). As originally implemented:
- Battle Map side (`js/modules/battle-map-share-assets.js`, wired into `battlemap.html` at the seam's three funnels, and only created in Live Share mode, `?liveshare=1`: an ordinary Battle Map composes, encodes and hashes nothing): its own change detector keys only on the background inputs (map image identity and size, fog on/off, a fog-bitmap version bumped wherever the bitmap's pixels change, fog shapes). Token moves, grid, map transform, the DM's view and the structured revision never trigger it. Rebuilds are debounced (250 ms after the last change, at most 1 s apart). A composite whose inputs changed while it was encoding is discarded and rebuilt, so nothing the DM has just covered is published. A failure (an unreadable map, or too large even when scaled down) publishes no background rather than a stale one. While a saved fog bitmap is still decoding, nothing is published; a saved fog bitmap that cannot be decoded fills the fog completely (fail closed) instead of leaving it cleared.
- Composition mirrors the DM's fog (painted bitmap, then cover shapes, then reveal shapes cutting through both). Every pixel with any fog alpha becomes opaque fog, so soft edges and see-through colours never let the map show through. It is done in map image space and placed by the map transform, so moving or scaling the map needs no new bytes.
- Encoding: WebP at quality 0.85, falling back to PNG where the browser cannot encode WebP. Benchmark (`scripts/bench-live-share-background.mjs`, Chromium): a 3072×2048 painted map is 488 KiB (PNG 11.2 MiB) in 0.38 s; a 70%-fogged version 119 KiB; a flat 3000×2000 dungeon 23 KiB (PNG 136 KiB). Limits: 8192 px per side and 16.7 M pixels (larger maps are composed at a reduced scale), 16 MiB per background (retried smaller up to three times), 512 px and 1 MiB per token image.
- Asset ids are the hex SHA-256 of the encoded bytes. Background revision: +1 whenever the published background asset changes (identical pixels keep the revision).
- Custom art: `data:` and `blob:` images (uploads and Character Manager tokens) are re-encoded (which also drops metadata) and transferred. Same-origin URLs (built-in presets) are not. Other origins are read with CORS; anything unreadable keeps the marker. Players never fetch token URLs.
- Protocol (`asset-protocol.js`): player → host `asset-request {assetIds}`; host → player `asset-meta`, then binary chunk frames (1-byte type, 32-byte id, uint32 index, ≤16 KiB payload), and `asset-abort {superseded|unavailable|limit}`. Everything is validated: ids, kind, MIME allowlist, byte length, dimensions, chunk count and index, exact chunk lengths, image signature and hash.
- Possession: the player's session cache (`asset-cache.js`) requests only ids it neither holds nor is receiving, at most 64 outstanding at a time (the rest follow as answers arrive), accepts metadata only for ids it asked for, and makes object URLs only from verified bytes. Only unfinished attempts count towards its retry limit, so a background that comes back later (the same fog state: identical bytes, the same id) is requested and shown again. It keeps the previous background up only while the new one is loading, never once the new one has failed, revokes replaced backgrounds, and releases everything on Leave or session end. Nothing is persisted.
- Priority on the one existing data channel (`asset-sender.js`): chunks are sent only while the channel holds less than 40 KiB, so it never reaches the snapshot sender's 64 KiB "busy" level; snapshots go out at once and queue behind at most ~56 KiB. Transfers resume on `bufferedamountlow` (16 KiB) with a 100 ms timer fallback, one transfer per player at a time. A replaced background is aborted as `superseded`. Each player gets at most 3 full sends of an asset while it stays on the host; the count is dropped when the asset leaves (a replaced background), so its later return is served.
- Not yet (as of 2.3.26): ~~efficient continuous fog painting (a long stroke publishes only after it settles, or at the 1 s maximum wait, and any composite made stale by further strokes is discarded),~~ *(moot since 2.3.27: unsaved strokes are never published)* tiled or dirty-region backgrounds ~~(Milestone 4)~~ *(now only if Milestone 4 profiling shows a need)*, persistent caching.

**Lessons that shaped what came next:**
- Live fog streaming was the wrong trigger for a DM-prepared map. Publishing on explicit Save (2.3.27) keeps unfinished preparation private, and it reduces background work to once per save.
- Asset lifetime has to follow publication, not preparation. Since 2.3.27, published assets stay available until the replacing publication commits.
- Recurring content-derived background ids, and supersession while a transfer is in progress, need explicit handling and tests. Both were found and fixed in review and CI.

## Between Milestones 3 and 4: Battle Map releases (not Live Share milestones)

**2.3.27 — Battle Map staged publishing and Visible to Players (complete, validated in production on 2026-09-30).**
- Save-gated publication: the Save button, Ctrl+S or Save Session publishes; edits stay private until then.
- The saved record is separate from the private working draft, and a reload publishes the saved record, never the draft.
- Per-token Visible to Players, kept by Export/Import.
- Published assets are retained until the replacing publication commits.
- Saves and drafts wait for the map image and fog to finish decoding, so a map is never stored without them.

See §5.4, §6, §13.3, §14 and §16. A follow-up fix (commit bd1ba05) hardened superseded-background handling.

**2.3.28 — Battle Map interaction stabilization (complete).** Supporting fixes with no change to Live Share behavior. Only a measurement gesture that began on the map can store a persistent measurement, and a right-click no longer starts a token drag.

## ~~Milestone 4 (revised) — Live Fog/Visibility Performance & Advanced Synchronization~~ (superseded)

> **Superseded on 2026-09-30**, after Milestone 3 production validation and 2.3.27, by the Milestone 4 below. Kept for history. Its premise was that frequent fog edits must reach players efficiently. That no longer holds: the Battle Map publishes only on explicit Save, so fog is not streamed while the DM paints (§16).

- ~~efficient response to frequent fog edits (continuous brush painting, shape dragging),~~
- ~~recomposition scheduling so fog work does not stall the DM's Battle Map,~~
- ~~background transfer throttling,~~
- ~~dirty-region or tile updates, **only if profiling justifies them**; they are not pre-committed,~~
- ~~integration points for a future visibility mask (§13.4), without building a vision system,~~
- ~~fog-specific UX and performance hardening.~~

~~Exit: frequent fog edits reach players within an acceptable delay without overloading the DM's browser or the data channel, as measured on real maps and devices.~~

## Milestone 4 (redefined 2026-09-30) — Player Presentation Completeness & Performance Profiling

**Status:** part A (presentation completeness) was done in 2.3.29 on 2026-10-01 and is not yet validated on real devices. Parts B (profiling) and C (optimization on evidence) are still open, so Milestone 4 is not complete.

**Objective.** Make the player's Battle Map show the presentation state the DM deliberately makes public, and measure the existing Milestone 3 background and asset pipeline on representative maps and devices before adding any optimization complexity.

**Context.** Since 2.3.27 the Battle Map publishes only on explicit Save (§14, §16). Fog is no longer streamed while the DM paints, so the cost of composing, encoding and transferring a background is paid once per save. Milestone 4 measures that save-to-player path. It does not optimize live brush streaming, which no longer exists for the Battle Map.

### A. Presentation completeness *(done in 2.3.29)*

*Outcome: the inventory found only the aura and the vision cone. Both are public for tokens that are Visible to Players. There are no separate share controls, and fog never hides them. Wire form and validation: §13.4.*

- **Inventory.** Inspect the canonical token model and the DM's token renderer for presentation-only overlays the DM sees and players do not. Two are known today (§13.4):
  - the aura: `aura: { radius, color }`, a circle of `radius` grid cells around the token;
  - the vision cone: `visionCone: { range, angle, color }`, a wedge of `range` grid cells and `angle` degrees, pointing along the token's rotation.

  Any other presentation-only token overlay found is evaluated the same way.
- **Decide what is public.** Each overlay is chosen deliberately for V1 or left out. Nothing is shared by default.
- **Extend the allowlist deliberately.** Each chosen overlay becomes a structured field in `projectPlayerSafeState()`:
  - small primitive fields, coerced and range-checked, with colors validated against a strict format;
  - the exact wire form is decided from the canonical fields above;
  - the snapshot version increases as it did for Milestone 3's extension (§13.1), and the player accepts only the version it knows;
  - the player validates the new fields and copies only those.
- **Render as structured overlays.** The player draws them on top of the background (Layer 2, §15.1). They are never baked into the raster.
- **Visible to Players applies.** A hidden token contributes none of these fields (§13.3).
- **Battle Map save gating applies:**

  ```text
  DM changes an aura → private draft only
  Save               → new structured snapshot → the player renderer updates the aura
                       (no background recomposition or retransmission)
  ```

- **Presentation, not visibility.** A vision cone shown to players is an indicator. It does not decide what players can see, does not feed fog or composition, and does not hide or reveal tokens. Milestone 4 does not implement vision-based visibility or line of sight (§13.4, §26).

### B. Performance profiling

Measure the existing pipeline before changing the protocol, on representative maps and devices:

- map dimensions, and composite dimensions after scaling to the limits
- composition time and encode time on the DM's browser, and whether a save makes the DM's Battle Map noticeably unresponsive
- encoded background bytes, and custom token asset counts and bytes
- transfer duration, over direct WebRTC and over TURN
- player reconstruction and apply time, where practical
- save-to-player-visible latency (from the DM's Save to the new background shown on the player)
- whether structured snapshots are delayed behind asset transfer

Representative cases:
- an ordinary dungeon map;
- a painted, high-detail map;
- a heavily fogged map;
- a large map near the practical limits;
- several custom token assets;
- a direct desktop connection;
- a TURN or mobile path where practical.

Existing diagnostics (encode time, bytes, counts) and `scripts/bench-live-share-background.mjs` are the starting point. Results are recorded in this document or a linked report.

### C. Optimization only on evidence

Not pre-committed:
- tiled, dirty-region or delta backgrounds;
- multiple asset channels;
- persistent asset caching;
- patch/event synchronization.

Each is introduced only if profiling shows a concrete problem.

**Decision criteria.** These are proposed starting thresholds, confirmed or adjusted when profiling begins. Crossing one on a representative case means investigating that path:
- save-to-player-visible latency for a changed background above about 5 s on a direct connection, or about 10 s over TURN/mobile;
- a save that blocks the DM's Battle Map main thread for more than about 200 ms;
- typical saved backgrounds above about 2 MiB, or any background approaching the 16 MiB limit;
- structured snapshots delayed beyond the existing asset buffer budget (about 56 KiB queued) during a transfer.

**Escalation order.** First tune what exists:
1. encoding quality;
2. the scale limits;
3. moving composition and encoding off the main thread.

Then, if the problem persists, consider structural changes (tiles, dirty regions, deltas, a second channel). If whole-background transfer stays acceptable under the save-gated model, it stays.

### Not in scope

- a vision or line-of-sight visibility system, and any automatic hiding of tokens by fog (§13.4)
- enemy health visibility (§13.3)
- product room UX and admission (Milestone 5), pings (Milestone 6), reconnect (Milestone 7)
- persistent asset caching, unless the measurements above justify revisiting it (§30)

### Exit

- the player renderer shows every Battle Map presentation overlay selected as public for V1;
- the overlay fields are strictly allowlisted and validated on both sides;
- hidden tokens contribute none of them;
- presentation edits stay private until Save;
- saved token, aura and vision changes never retransmit the background;
- representative performance measurements exist and are recorded;
- whole-background transfer is kept or replaced based on that evidence, not on assumption;
- a real-device validation succeeds.

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
- snapshot, ~~fog~~ background and asset resync
- stale credential handling
- clean session teardown

Exit: common mobile/browser disconnects recover without restarting the room.

## Milestone 8 — Production Networking Hardening

- ~~TURN integration and credential handling~~ (done early, in Milestone 0: §21); remaining TURN work is rate limiting `/turn-credentials` and monitoring TURN usage
- abuse and rate limiting at the relay and the host
- payload limits
- browser/network compatibility testing (§25)
- signaling deployment reliability
- diagnostics

Exit: typical home, mobile and remote-table setups connect consistently.

## Milestone 9 — Experimental Release

Ship behind an experimental flag with documentation (including the ~~fog trust model~~ composited-background fog privacy model (§13.2) and a privacy explanation) and a troubleshooting guide. Use it at real tables and collect failure reports before expanding scope.

## Milestone 10 — Stable V1

Promote to supported functionality only after real session use demonstrates acceptable reliability.

---

# 25. Testing Strategy

## Unit Tests

- player-safe projection: allowlisted fields present, excluded fields absent
- share-state seam: every published change is signaled; non-shareable changes need not be. For the Battle Map, publication happens only on a successful save, and unsaved changes never signal (2.3.27)
- protocol validation and malformed message rejection
- structured snapshot revision ordering (stale and duplicate snapshots ignored)
- background revision independent of the snapshot revision (saved token moves never change it; saved fog changes always do)
- Battle Map publication: capture at save time, structured state and background committed together, newest save wins, published assets retained until the next commit
- Visible to Players: a hidden token is absent from the projection (no id, fields or asset id), and its custom art is never prepared
- player asset cache: superseded and recurring background ids, abort accounting
- background composition: hidden areas opaque; no original-map pixels under fog in the encoded output
- asset ids, chunk reassembly and validation, session cache and deduplication
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
- asset transfer (background and custom token images; repeated assets not re-sent)
- progressive rendering (structured map shown before any asset arrives; failed assets fall back to markers)
- snapshot and fog synchronization: saved fog changes arrive as a new player-visible background
- Battle Map staged publishing:
  - unsaved structured changes are not transmitted;
  - unsaved fog changes produce no player-visible background update;
  - Save publishes coherent structured state and assets;
  - a failed save publishes nothing;
  - a late joiner gets the last saved map;
  - a draft restored after a reload never becomes the published state;
  - edits made while the saved map is still loading are not published.
- Visible to Players:
  - hidden tokens and their custom art are absent from everything sent;
  - Export/Import keeps the setting;
  - legacy maps without the flag stay visible.
- background recurrence (the same fog state back) and superseded backgrounds mid-transfer
- player presentation overlays (auras, vision cones), since 2.3.29: present only for visible tokens, published only on save, no background retransmission
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
- malformed, oversized or mismatched asset chunks

## Environment Tests (manual)

- same Wi-Fi, separate networks, mobile data, VPN, restrictive NAT
- Chrome, Edge, Firefox, Safari
- Android, iOS, desktop
- direct connection and TURN relay fallback

---

# 26. Future Battle Map Possibilities

After read-only sharing is proven stable, each evaluated individually rather than treated as a required roadmap item:

- ~~per-token Visible to Players toggle~~ (implemented in 2.3.27, §13.3)
- enemy health visibility options
- assigned token control / DM-configurable token permissions
- player measurement tools
- player cursor indicators
- optional map-follow mode
- co-DM role
- asset caching beyond one session (session-scoped caching is part of Milestone 3)
- incremental synchronization, if profiling justifies it
- actual visibility / line-of-sight automation: a vision system that decides which map pixels and tokens players may see, feeding host-side composition and the projection (§13.4). Not part of V1 or Milestone 4.

---

# 27. Initiative Tracker Extension (Future Scope)

The Initiative Tracker is the only planned second Live Share surface. It is not designed or implemented now.

When it is, it should reuse:

- the same room,
- the same WebRTC connections,
- the same seat model,
- the same host-authoritative, player-safe-projection approach,
- the same whole-snapshot synchronization.

It does **not** reuse the Battle Map's save gating. The Initiative Tracker has no explicit Save workflow, so it publishes its player-safe state as soon as its authoritative tracking state changes (§14). Save-gated publication is a Battle Map policy, not a Live Share one.

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
- Does the player-safe state and rendering model work: does a player see the DM's Battle Map (structure, then the player-visible background with fog and custom token art) promptly (for the Battle Map since 2.3.27: promptly after each Save), and does the projection provably exclude structured secrets?
- Does the feature still look viable once TURN requirements are understood?

*Answered so far:*
- *Milestones 0–2 showed that the signaling architecture works, that direct connections succeed and failures are diagnosable, that TURN (added in Milestone 0) closes the gap on networks where direct connections fail, and that structured rendering works in production.*
- *Milestone 3 showed in production that the player-visible background with fog baked in and custom token art work, together with 2.3.27's save-gated publication and Visible to Players.*
- *Milestone 4 answers whether the presentation players see is complete, and whether the background pipeline performs well enough on representative maps and devices.*

STUN-only connection failures are not automatically a failed product experiment if the evidence indicates the remaining gap is TURN traversal rather than a flaw in the application architecture. If the answers show an architectural problem, the roadmap is reconsidered before investing in room UX.

## Stable V1

Battle Map Live Share is stable when, after network hardening (Milestone 8), it shows acceptable real-world reliability, and:

- the DM can create a room in a few clicks,
- players can join from one URL without accounts,
- predefined seats work, and seat claims cannot race or overwrite each other,
- optional password protection works,
- the DM can lock the room and kick/reset seats,
- players see the correct map state, ~~map and token assets, and fog~~ the player-visible background (map with fog baked in) and custom token art,
- structured hidden information is never transmitted, including tokens hidden with Visible to Players and their art,
- unsaved Battle Map edits are never transmitted; players see the last explicitly saved map,
- the public presentation overlays chosen in Milestone 4 (auras, vision cones) appear for visible tokens,
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
- ~~**Fog encoding/compression** — image format, resolution, whether painted fog and fog shapes are combined or sent separately (Milestone 4).~~ Superseded on 2026-09-29: fog is baked into the player-visible background, so painted fog and fog shapes are always combined, and the question becomes background encoding (next item).
- ~~**Background encoding and limits**~~ — decided in Milestone 3 from the benchmark: WebP quality 0.85 with PNG fallback; 8192 px per side, 16.7 M pixels, 16 MiB. ~~recomposition debounced at 250 ms with a 1 s maximum wait. Still to tune with real maps and devices (Milestone 4).~~ Since 2.3.27 the Battle Map composites once per published save, so the debounce no longer applies. The settings are revisited only if Milestone 4 profiling shows a need.
- ~~**Asset caching strategy** — whether and how to hash/cache assets across reconnects (after Milestone 3).~~ Partly decided on 2026-09-29: content-derived asset ids and a session-scoped player cache with deduplication (Milestone 3, §15.4). ~~Still open: the hash and id format~~ Decided in Milestone 3: the id is the hex SHA-256 of the encoded bytes. **Persistence beyond a session stays deferred** unless Milestone 4 measurements justify revisiting it.
- **External token-image fallback** — what happens for an external token image the host browser cannot fetch or read because of CORS: require the DM to import/store it locally before sharing, show players a placeholder, allow direct third-party loading only as an explicit privacy tradeoff, or another approach (Milestone 3). *Default since 2026-09-29: players never fetch external URLs, and such a token falls back to its structured marker and name (§15.3). Still open: whether to also offer the DM an "import locally" action.*
- ~~**What counts as a custom token image**~~ — decided in Milestone 3: `data:`/`blob:` images (uploads, Character Manager tokens) are custom; same-origin URLs (built-in presets) are generic; other origins are transferred only if CORS lets the host read them.
- ~~**Asset transfer on the data channel**~~ — decided in Milestone 3: one channel, with chunks sent only within a 40 KiB buffer budget below the snapshot sender's 64 KiB busy level, so snapshots are never held back by assets.
- ~~**Auras and vision indicators in the projection**~~ — decided in 2.3.29 (Milestone 4): both are public for visible tokens, with no separate share controls. The wire form is `aura: null | { radius, color }` and `visionCone: null | { range, angle, color }` (§13.4).
- ~~**Token visibility**~~ — decided and implemented in 2.3.27: a per-token `visibleToPlayers` flag. `false` omits the token and everything about it; a missing flag means visible; Export/Import keeps it (§13.3).
- ~~**Battle Map publication policy**~~ — decided in 2.3.27: the Battle Map publishes only its last explicit save. The draft is a separate private record, and a reload publishes the saved record. The policy is the Battle Map's; generic Live Share and the future Initiative Tracker are not save-gated (§14).
- ~~**Published-asset lifetime**~~ — decided in 2.3.27: the host keeps the assets of the published state until a newer publication commits, then releases those no longer referenced. There is no history of old backgrounds (§15.4).
- **Tiled, dirty-region or delta backgrounds; multiple asset channels; patch/event synchronization** — not planned. Each is considered only if Milestone 4 profiling crosses its decision criteria (§24). Whole-background transfer stays while it remains acceptable.
- **Snapshot throttle interval** — 100 ms in Milestone 2 (`SNAPSHOT_INTERVAL_MS`), to be tuned with real use.
- **Payload and asset size limits** — maximum ~~map image,~~ background composite, custom token image and message sizes (Milestones 3 and 8). The structured-message limit is already 240 KB (Milestone 2). The background and token-image limits were set in Milestone 3: 16 MiB per background, and 512 px and 1 MiB per token image. Remaining work is relay- and host-side abuse limits (Milestone 8).
- **Seat-session credential generation** — the library and format used to create the random opaque tokens (Milestone 5).
- ~~**Share-state seam mechanism**~~ — decided in Milestone 1: change detection by value. The seam recomputes the allowlisted projection at three existing funnels (each rendered frame, `setDirty()`, `save()`) and signals only when the player-visible content differs, instead of adding a notifier call to each of the ~40 mutation sites. *Changed in 2.3.27: the seam's source is the Battle Map's published (saved) state, and it is checked when a save is published.*
- **Host grace period and room lifetime** — durations for host-refresh recovery and room expiry (Milestone 7).

---

# 31. Product Position

Live Share should not change the identity of The DM's Toolbox.

> **A local-first tabletop toolkit with an optional lightweight live tactical sharing layer.**

Battle Map (and later Initiative Tracker) Live Share lets players see — and minimally interact with — tactical state the DM is already managing. It does not turn The DM's Toolbox into a centralized cloud VTT, and it does not move campaign data off the DM's device.

---

# 32. Superseded Design — Original Asset/Fog Approach

**Superseded after Milestone 2 production validation (2026-09-29).** The sections below are the original text of §13.2, §15 and §16, kept unchanged for history. The superseded Milestones 3 and 4 remain in §24, struck through. The current design is in §13.2, §13.4, §15, §16 and the revised Milestones 3 and 4.

Why it was replaced by the host-composited player-visible background:

- **A simpler player asset model.** The player gets one background raster plus optional custom token images, instead of a map asset and a fog overlay kept in step with each other.
- **Stronger fog privacy.** The player no longer holds the unobscured map; hidden terrain is not intentionally transmitted as part of the Live Share view (§13.2).
- **Less duplication.** Map and fog are no longer transferred as two separate assets and recombined on every player.
- **Dynamic overlays stay cheap and independent.** Tokens, names, conditions, auras and measurements remain small structured state, so moving them never touches the raster.

## 32.1 Original §13.2 — Fog of war (trusted-player model)

For the initial implementation:

- the complete map image may be transferred to the player,
- fog is transferred separately and drawn over the map in the player client,
- a technically motivated player may be able to inspect the underlying transferred image.

This is a deliberate tradeoff. Fog in Live Share hides the map from normal viewing at the table; it is **not** adversarial information security, and the documentation must not claim it is.

The alternative — sending only pre-composited revealed regions of the map, and re-sending as fog is revealed — is out of scope because of its complexity and bandwidth cost.

## 32.2 Original §15 — Asset Transfer

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

## 32.3 Original §16 — Fog Synchronization

Fog is synchronized separately from the structured snapshot, because painted fog is pixel data, not small objects.

Conceptual model:

- **Structured snapshot** — grid, tokens, conditions, measurements and other small structured state (§14).
- **Fog snapshot** — a compressed/rendered representation of the current fog (painted fog and fog shapes combined, or sent side by side), sent on its own channel, throttled, and not emitted for each individual brush event.

V1 does not require an incremental fog-event protocol. The fog snapshot follows the trusted-player model (§13.2).

The exact fog encoding and compression is an open decision (§30).
