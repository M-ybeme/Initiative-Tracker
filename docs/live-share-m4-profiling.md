# Live Share Milestone 4B: Save → player-visible profiling

*Measured 2026-10-01 on 2.3.30. No production code was changed for this pass. Real-device results are still to come (see "Real-device check" below). Linked from `DMS_Toolbox_Live_Share_Planning.md` §24, Milestone 4 part B.*

## Summary

- **Live Share's own pipeline fits the whole-background design.** On the host, composition runs on the main thread for 23–139 ms. WebP encoding (0.2–1.3 s) and hashing (under 20 ms) run asynchronously and cause no long tasks. Player validation plus apply takes under 45 ms. Typical backgrounds are 40 KiB–1.2 MiB. No case comes near the 16 MiB cap; the largest is 3.6 MiB.
- **The one threshold crossed everywhere is main-thread blocking (about 200 ms).** The cause is not Live Share. Every Battle Map save serializes the whole fog canvas with a synchronous `canvas.toDataURL()` (PNG) for persistence. That blocks the DM's page for about 230 ms on a 2800×2000 map, about 430–480 ms at 4096×2730, and about 1.9 s at 8000×6000. It happens on every save, including saves that changed only tokens, and with Live Share off too. It also holds back the Live Share publication, which starts only after the save has been stored.
- **Large maps project above the direct-connection latency threshold on slower uploads.** These are estimates, not measurements: a 3.5 MiB background over a 10 Mbit/s upload would take about 6 s from Save to visible. More than half of that is host preparation, and most of the preparation is the persistence step above. The real-device check has to confirm it.
- **Decision (pending the real-device check):** keep whole-background transfer. No protocol or architecture change is justified. One concrete bottleneck was found, and the proposed fix is a small, scoped Milestone 4 part C change to the Battle Map's fog persistence (below). It was not implemented in this pass.

## Method

**Harness:** `tests/perf/live-share-save-profile.perf.js`, run with `npx playwright test --config playwright.perf.config.js`.
- It is not part of the normal test run. Results go to `perf-results/live-share-profile/*.json`, which is git-ignored.
- It drives the real pages. The DM uses `battlemap.html?liveshare=1` with real Ctrl+S saves and real fog brush strokes. A player uses `liveshare-dev.html` in a separate browser context.
- They connect over real WebRTC through the local signaling relay:
  - **direct:** ICE "all"; the pair chosen was host/host or srflx/srflx, never relay;
  - **loopback TURN:** `?forceRelay=1` with the test suite's loopback TURN server, and `usingTurnRelay: true` was verified in the player's diagnostics.
- Each case runs 1 warm-up save, then 5 measured saves (3 for E, F and the TURN run of D). Each measured save changes the background with a fog brush stroke in a new place, so every save produces a new background that has to be transferred. The tables give median / worst.

**Instrumentation:** test-only init scripts timestamp what the pages already do. Nothing in the app was changed.
- **Host:**
  - Save keypress (T0).
  - The IndexedDB save.
  - Each large `toDataURL` (persistence).
  - The composite's map `drawImage` (composition start).
  - `getImageData`/`putImageData` (the fog mask).
  - `toBlob` start and end (encoding).
  - `SubtleCrypto.digest` (the asset id).
  - Every data-channel send: snapshot, asset meta, chunks.
- **Player:**
  - Every message received.
  - The `asset-request` it sends.
  - `digest` (byte verification).
  - The background `<image>` being attached, and its load / decode.
- **Main thread:**
  - The Long Tasks API (tasks over 50 ms) on the host.
  - `requestAnimationFrame` gaps.

**Clocks:** host and player are pages of one browser on one machine. Their wall-clock timestamps (`performance.timeOrigin + performance.now()`) are therefore comparable. That is not true across real devices, so the real-device check below uses per-device observation instead of subtracting clocks.

**What this measures and what it doesn't:** composition, encoding, hashing, chunking, validation and decode on this machine (Windows desktop, Chromium). The network is loopback, so the transfer times below are **not** real network throughput. Real links are covered by the estimates below and by the real-device check.

**Existing tooling:** `scripts/bench-live-share-background.mjs` (the Milestone 3 encoder benchmark) was kept as it is. The harness measures composition and encoding inside the real save path, which the benchmark can't.

## Fixtures

All fixtures are deterministic: generated in the page with a seeded random generator, or taken from `images/BGMap.png`. None was picked for good results; B and D add synthetic grain on purpose, as a harsh case.

| Case | Map | Notes |
|---|---|---|
| A ordinary dungeon | 2800×2000 PNG: flat floor, rooms, drawn grid, light texture | 1 cover shape, one preset token |
| B high-detail (harsh) | 4096×2730 JPEG: painted art tiled, plus per-pixel grain | Grain is close to a worst case for WebP |
| B2 painted | 4096×2730 JPEG: painted art without the grain | Closer to a real painted map |
| C heavy fog | as B (grain), plus a saved painted fog bitmap covering about 80% | Saves reveal areas, as during play |
| D large | 8000×6000 JPEG (48 MP, grain): composed at a reduced scale, 4729×3547 (16.7 MP) | Near the practical limits |
| E custom token art | as A, plus 8 distinct 256×256 uploaded token images | |
| F structured-heavy | as A, plus 200 tokens (labels, conditions, auras, vision cones) and 60 measurements | |

## Results: saves that change the background

Medians / worst. All runs used WebP.
- **Host prep:** Save keypress → the structured snapshot naming the new background is sent.
- **Transfer:** the player's `asset-request` → the last chunk received.
- **Player validate + apply:** hash verification plus the `<image>` load / decode.
- **Save → visible:** keypress → the new background has loaded on the player.

| Case | Connection | Source | Composite | Fog | Encoded size | Compose ms (main thread) | Encode ms (async) | Host prep ms | Transfer ms (loopback) | Player validate + apply ms | Save → visible ms | Longest host task ms | TURN? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A dungeon | direct (host/host) | 2800×2000 PNG | 2800×2000 | cover shape about 13% + strokes | 40 KiB | 25 / 28 | 196 / 210 | 458 / 469 | 3 / 3 | 2 / 3 | 465 / 474 | 235 / 240 | no |
| A dungeon | loopback TURN | 2800×2000 PNG | 2800×2000 | as above | 40 KiB | 24 / 27 | 189 / 201 | 444 / 457 | 3 / 3 | 2 / 3 | 450 / 465 | 224 / 229 | yes (relay/relay) |
| B2 painted | direct (srflx/srflx) | 4096×2730 JPEG | 4096×2730 | strokes only (under 2%) | 1.22 MiB | 51 / 53 | 704 / 712 | 1214 / 1234 | 31 / 33 | 14 / 15 | 1253 / 1274 | 435 / 445 | no |
| B high-detail (harsh) | direct (srflx/srflx) | 4096×2730 JPEG + grain | 4096×2730 | strokes only | 3.56 MiB | 46 / 47 | 966 / 986 | 1482 / 1493 | 99 / 100 | 39 / 42 | 1603 / 1618 | 438 / 440 | no |
| C heavy fog | direct (host/host) | 4096×2730 JPEG + grain | 4096×2730 | painted fog about 80% + reveal strokes | 793 KiB | 58 / 62 | 476 / 477 | 1030 / 1039 | 20 / 20 | 12 / 13 | 1058 / 1067 | 476 / 487 | no |
| D large | direct (srflx/srflx) | 8000×6000 JPEG + grain | 4729×3547 | cover shape about 16% + strokes | 3.48 MiB | 139 / 142 | 1299 / 1329 | 3423 / 3473 | 94 / 98 | 41 / 43 | 3547 / 3594 | 1917 / 1941 | no |
| D large | loopback TURN | as above | 4729×3547 | as above | 3.48 MiB | 135 / 135 | 1258 / 1265 | 3281 / 3295 | 154 / 162 | 40 / 43 | 3452 / 3484 | 1839 / 1841 | yes (relay/relay) |
| E custom token art | direct (host/host) | 2800×2000 PNG + 8 token images | 2800×2000 | strokes | 44 KiB | 27 / 33 | 198 / 232 | 478 / 493 | 4 / 5 | 2 / 4 | 486 / 501 | 226 / 239 | no |
| F structured-heavy | direct (srflx/srflx) | 2800×2000 PNG, 200 tokens, 60 measurements | 2800×2000 | strokes | 44 KiB | 26 / 28 | 192 / 195 | 444 / 452 | 12 / 15 | 12 / 15 | 470 / 484 | 225 / 228 | no |

**Where host prep goes** (medians, ms):

| Case | Persistence (IndexedDB save) | of which fog `toDataURL` (sync) | Compose, incl. fog mask (sync) | Encode (async) | Hash (async) |
|---|---|---|---|---|---|
| A | 239 | 232 | 25 (mask 14) | 196 | under 1 |
| B2 | 441 | 424 | 51 (mask 26) | 704 | 6 |
| C | 481 | 468 | 58 (mask 25) | 476 | 4 |
| D | 1933 | 1879 | 139 (mask 70) | 1299 | 16 |

- **What the host prep consists of:** persistence, then composition, encoding and hashing, then the snapshot. In every case the longest main-thread task is the persistence `toDataURL` of the fog canvas.
- **WebP encoding is not a long task.** Chromium's `toBlob` encodes off the main thread. That was confirmed by the Long Tasks API: in case D, encoding takes about 1.3 s, yet no long task besides the fog `toDataURL` appears.
- **The player side is quick:** after the snapshot arrives, the player requests the background within 1–2 ms.

**Custom token art (E):**
- 8 images prepared on the host: 42 ms of encoding in total, 12–13 KB each.
- A joining player received 9 assets (8 token images plus the background), 143,509 bytes, and showed all the art 422 ms after the page was opened.
- Saves after that send only the changed background. The token art is not sent again.

## Results: saves that don't change the background (case A, 3 saves each; F, 5 saves)

| Change | Host prep ms (Save → snapshot sent) | Save → applied on player ms | Snapshot bytes | Background encodes | Background transfers | Longest host task ms |
|---|---|---|---|---|---|---|
| token move | 245 / 246 | 246 / 247 | 580 | 0 | 0 | 236 / 238 |
| token rotation | 245 / 245 | 247 / 247 | 598 | 0 | 0 | 236 / 241 |
| aura | 248 / 253 | 250 / 255 | 624 | 0 | 0 | 233 / 243 |
| vision cone | 234 / 240 | 236 / 242 | 660 | 0 | 0 | 228 / 229 |
| grid style | 251 / 263 | 252 / 265 | 660 | 0 | 0 | 229 / 247 |
| token move, F (200 tokens, 60 measurements) | 257 / 257 | 264 / 265 | 40,025 | 0 | 0 | 237 / 237 |

- None of these saves composed, encoded or transferred a background. The background's id and revision were unchanged after every one (asserted).
- The structured snapshot is small: about 0.6 KB for a one-token map, and about 40 KB for 200 tokens with 60 measurements.
- It reaches the player about 2 ms after it is sent, even on the heavy map, where the player applied it within 7–8 ms.
- Nearly all of the about 250 ms before it is sent is the persistence `toDataURL`. That is the DM's page freezing for about a quarter of a second on every save, Live Share or not.

**Structured snapshots during an asset transfer:**
- On loopback, a 3.5 MiB background transfers in 94–160 ms. That is faster than the next save can publish, since every save spends at least about 230 ms in persistence. So no real overlap could be produced on this machine.
- The guarantee comes from the design, which is unchanged: asset chunks are sent only while less than 40 KiB is queued, below the snapshot sender's 64 KiB "busy" level. The existing browser test "a large background is chunked, paced by backpressure, and does not hold up structured updates" covers it.
- The real-device check includes a step for it.

## First save after a host reload

| Case | First save after reload | Second save |
|---|---|---|
| A | background re-encoded once: 187 ms, async; same bytes, no transfer | no re-encode |
| D | background re-encoded once: 1240 ms, async; same bytes, no transfer | no re-encode |

- **Cause:** the reload published the saved record under its own fog version (2.3.27), so the first live save's background key differs. The re-encode yields identical bytes, so the asset id and revision are unchanged and nothing is sent.
- **It doesn't block the main thread.** The long task in that save is the same persistence `toDataURL` as in every save.
- **What it costs:** that one save's snapshot is published after the re-encode, about 0.2 s later on an ordinary map and about 1.2 s later on a large one. Players have to rejoin after a host reload anyway, since the reload closes the room.
- **Verdict:** negligible. Leave it.

## Main-thread blocking (host)

| Work | Main thread? | Largest seen |
|---|---|---|
| Fog persistence `toDataURL` (Battle Map save, every save) | yes, one task | 232 ms (A), 468 ms (C), 1895 ms (D) |
| Background composition, including the fog mask (`getImageData`/`putImageData` + JS loop) | yes | 142 ms (D), 62 ms (C), 28 ms (A) |
| WebP encode (`toBlob`) | no | 1.33 s (D) without a long task |
| SHA-256 (`crypto.subtle`) | no | 17 ms |

- **What the DM experiences:** the Battle Map is frozen for about the longest task. The `requestAnimationFrame` gaps match it: 217 ms (A), 417–483 ms (B/B2/C), about 1.9 s (D).
- **Live Share's own synchronous work stays under the threshold in every case:** composition at most 142 ms.

## Real networks (estimates only)

Save → visible ≈ host prep + bytes ÷ upload bandwidth. Player-side work is under 50 ms and is ignored. **These numbers are not measured.**

| Case (bytes, host prep) | 50 Mbit/s | 20 Mbit/s | 10 Mbit/s | 5 Mbit/s | 2 Mbit/s |
|---|---|---|---|---|---|
| A (40 KiB, 0.46 s) | 0.5 s | 0.5 s | 0.5 s | 0.5 s | 0.6 s |
| C (793 KiB, 1.03 s) | 1.2 s | 1.4 s | 1.7 s | 2.4 s | 4.3 s |
| B2 (1.22 MiB, 1.21 s) | 1.4 s | 1.7 s | 2.2 s | 3.3 s | 6.3 s |
| B harsh (3.56 MiB, 1.48 s) | 2.1 s | 3.0 s | 4.5 s | 7.5 s | 16.4 s |
| D large (3.48 MiB, 3.42 s) | 4.0 s | 4.9 s | 6.3 s | 9.3 s | 18.0 s |

- **Typical maps** stay well inside both latency thresholds unless the link is very slow.
- **Large or high-detail maps (about 3.5 MiB)** cross the 5 s direct threshold below about 15–20 Mbit/s of upload, and approach or cross the 10 s TURN/mobile threshold at about 5 Mbit/s. On a large map, about 1.9 s of that is the fog persistence step that runs before publication.

## Decision criteria (§24, Milestone 4 part B)

| Criterion | Threshold | Observed | Result | Conclusion |
|---|---|---|---|---|
| Direct Save → player-visible, changed background | about 5 s | Measured, loopback: 0.47–3.6 s. Estimated, real link: 0.5–2.2 s for typical maps; 4–6.3 s for large/harsh maps below about 20 Mbit/s | **pass (typical) / investigate (large maps, real links)** | Confirm with the real-device check. The largest part on large maps is host persistence, not transfer |
| TURN/mobile Save → player-visible | about 10 s | Measured, loopback TURN: 0.45–3.5 s (relay overhead under 0.1 s). Real mobile TURN: not yet measured. Estimated 9.3 s at 5 Mbit/s for a large map | **pending the real-device check** | Large maps on slow mobile uplinks are the risk case |
| Main-thread blocking during a save | about 200 ms | **230 ms (ordinary map) – 1.9 s (large map), on every save.** Cause: Battle Map persistence (`toDataURL` of the fog canvas). Live Share's own synchronous work is at most 142 ms | **investigate: crossed** | A concrete bottleneck outside Live Share's protocol; proposed fix below |
| Typical saved background | about 2 MiB | 40 KiB–1.22 MiB for typical maps (A, B2, C, E, F). 3.5 MiB for the harsh grain and large cases (B, D) | **pass (typical)** | Re-check with the DM's real maps in the device test. Tune encoding (quality, scale) only if real maps are large |
| Any background near the 16 MiB cap | 16 MiB | Largest 3.56 MiB (22% of the cap) | **pass** | |
| Structured snapshots held back by asset transfer | about 56 KiB queued | Not reproducible on loopback (transfers end before the next save publishes). The pacing design and an existing browser test cover it | **pass (by design and test); confirm on a real link** | |

## Bottlenecks and recommendation

- **The bottleneck found:** Battle Map save persistence serializes the whole fog canvas synchronously (`buildSavePayload` → `tryCanvasToDataURL(fog)`, a PNG `toDataURL`).
  - It runs on **every** save, including saves where the fog did not change, and on draft writes.
  - It blocks the DM's page for 0.23–1.9 s depending on map size.
  - It delays Live Share's publication by the same amount.
  - Live Share doesn't cause it; it exists without Live Share too. Since 2.3.27, though, every publish waits for it.
- **Not bottlenecks:**
  - **Composition:** 25–139 ms.
  - **Encoding:** asynchronous.
  - **Hashing.**
  - **Player validation and decode.**
  - **Background size for typical maps.**
  - **Structured snapshot size and speed.**
  - **Transfer pacing.**
  - **The first-save-after-reload re-encode.**
- **Proposed scoped Milestone 4 part C optimization (not implemented here; to be scoped separately):**
  1. Reuse the last serialized fog data URL while the fog pixels are unchanged. `fogPixelsVersion` already tracks this. That removes the cost from every save that doesn't touch the fog: token, overlay, rotation, grid and measurement saves would drop from about 250 ms to a few ms on the host.
  2. For saves where the fog did change, serialize the fog off the main thread with `toBlob` instead of the synchronous `toDataURL`. This only shortens the freeze, not the latency.

  Both stay inside the Battle Map's persistence code and change no Live Share protocol, publication rule or stored format.
- **Not justified by these measurements:** tiles, deltas, dirty regions, more data channels, workers for composition, persistent asset caching, patch synchronization, or encoder setting changes. Revisit encoder quality or scale only if the real-device check shows large real maps over the latency thresholds after the persistence fix.

**Conclusion so far (pending the real-device check):**
- **A**, whole-background transfer remains appropriate. No Live Share protocol or architecture optimization is required.
- One concrete **Battle Map** bottleneck (fog persistence) does justify a small, scoped part C pass.

Milestone 4 stays open until the real-device check is in.

## Real-device check (manual, on the live site)

Use 2.3.30 on the live site with a map you really play on. If you can, also use one large or high-detail map, 4000 px or more on a side.

**Setup**
1. On the DM's computer, open `https://dnddmtoolbox.netlify.app/battlemap?liveshare=1`, load the map and save it. Start the room. Then open the Live Share panel's **Diagnostics**.
2. On the phone, open the join link.
   - **Run 1 (direct):** the phone on the same Wi-Fi as the DM.
   - **Run 2 (TURN/mobile):** Wi-Fi off, mobile data only. If the player's diagnostics then show `"usingTurnRelay": false`, mobile data still found a direct path, which is fine; record it. To force TURN, open the DM page with `?liveshare=1&forceRelay=1`. The join link carries the setting, so start a new room afterwards.

**For each run, 3 times:**
1. Paint or reveal a visible patch of fog, so the background must change.
2. Start a stopwatch as you press Save (or Ctrl+S). Stop it when the change appears on the phone. A screen recording of both screens works too.
3. Note whether the DM's page stuttered or froze when you pressed Save, and for roughly how long.

**Once per run:**
1. Move a token and Save: how long until it moves on the phone?
2. Paint fog, Save, then **immediately** move a token and Save again. Does the token move on the phone before the new background finishes loading?

**Please copy back:**
- **From the DM's Live Share Diagnostics:**
  - `preparedAssets.background`: `width`, `height`, `mime`, `bytes`, `encodeMs`;
  - `assets.sent`.
- **From the phone's Diagnostics (Copy diagnostics):**
  - `peers.host`: `usingTurnRelay`, `localCandidateType`, `remoteCandidateType`, `transportProtocol`;
  - `assets`: `bytesReceived`, `failed`;
  - `snapshots`: `snapshotsApplied`.
- **Your stopwatch times** (3 per run) and any stutter you noticed.
- **The map's pixel size** and roughly how much of it was fogged.

Results go into this document's tables. Milestone 4 closes when they are in and the thresholds are re-checked against them.

## Re-running

```bash
npx playwright test --config playwright.perf.config.js          # all cases, about 3.5 min
PROFILE_SAVES=10 npx playwright test --config playwright.perf.config.js -g "D. large"
```
