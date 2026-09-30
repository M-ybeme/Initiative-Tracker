# Live Share signaling relay (Milestone 0)

> **Milestone 0 is complete** (2.3.22–2.3.23, validated in production on 2026-09-28): production
> signaling, a direct desktop-to-desktop connection (`usingTurnRelay: false`) and a desktop-to-Android-5G
> connection through TURN (`usingTurnRelay: true`) all delivered `"hello"` over the data channel. See
> [Milestone 0 results](#milestone-0-results).

Live Share (see [the planning document](../docs/DMS_Toolbox_Live_Share_Planning.md)) connects the
DM's browser to each player's browser over WebRTC. Browsers cannot find each other on their own, so a
small **signaling relay** passes the WebRTC setup messages (offer, answer, ICE candidates) between them.
Once the data channel opens, all traffic goes browser-to-browser; the relay never sees session content.

The relay is deliberately generic: it knows rooms, one host per room, and peers (one per room in
Milestone 0). It knows nothing about
seats, passwords, the Battle Map or any game state.

> **Development prototype.** Milestone 0 has no admission model: anyone holding a room link can
> connect to that room's host and receive the prototype's test message. This is not Stable V1
> admission behavior (seats, passwords and DM-side admission arrive in Milestone 5, planning doc §11).

## Layout

| File | Purpose |
| --- | --- |
| `room-core.mjs` | The relay's room logic and wire protocol, shared unchanged by both runtimes |
| `node-relay.mjs` | Local relay (Node + `ws`) for development and Playwright |
| `cloudflare/worker.mjs` | Deployed relay: a Worker routes each room to its own Durable Object |
| `cloudflare/wrangler.toml` | Cloudflare config (Durable Object binding, allowed page origins) |
| `turn-credentials.mjs` | `GET /turn-credentials`: short-lived TURN credentials, shared unchanged by both runtimes (see [TURN fallback](#turn-fallback)) |

Browser side (`js/modules/live-share/`): `signaling-client.js` (relay WebSocket), `peer-link.js`
(RTCPeerConnection + data channel, failure classification), `protocol.js` (message validation),
`room-id.js` (room ids and join links), `config.js` (relay URL and STUN servers), `ice-config.js` (fetches
TURN credentials and builds each connection's ICE servers). The prototype page is
`liveshare-dev.html` with `js/live-share-dev.js`. It isn't linked from the site navigation.

Milestone 2 (2.3.25) adds a second host: `battlemap.html?liveshare=1` (`js/battlemap-live-share.js`)
shares the Battle Map, and its join links open `liveshare-dev.html` as the player, which draws the
map read-only. It uses the same relay and query parameters (`?relay=`, `?forceRelay=1`,
`?iceTimeoutMs=`), and the data channel carries `{v:0, type:'battlemap-snapshot', payload}` messages
(see the planning document, Milestone 2).

Milestone 3 (2.3.26) adds asset transfer on the same data channel, player-requested and never through
the relay: `asset-request` (player → host), `asset-meta`/`asset-abort` and binary 16 KiB chunk frames
(host → player) for the player-visible background (map with fog baked in) and custom token art.

## How Milestone 0 works

1. The host opens `liveshare-dev.html` and clicks **Start room**. The browser generates a 128-bit
   random room id and registers it with the relay as host (`/rooms/<id>?role=host`).
2. The join link is the same page with `#room=<id>` in the fragment, which is never sent to the web
   server. Opening it makes that browser a player (`/rooms/<id>?role=peer`).
3. The relay tells the host a peer joined. The host creates a peer connection and data channel, and
   the offer, answer and ICE candidates flow through the relay.
4. When the data channel opens, the host sends `hello` and the player displays it.
5. **Leave** (player) and **End session** (host) close everything. When the host leaves, the relay
   tells every player "host left" and forgets the room.

### Wire protocol (JSON text frames)

| Direction | Frame |
| --- | --- |
| relay → host | `{type:'registered', version}` |
| relay → player | `{type:'welcome', peerId, version}` |
| relay → host | `{type:'peer-joined', peerId}`, `{type:'peer-left', peerId}` |
| host → relay | `{type:'signal', to: peerId, data}` |
| player → relay | `{type:'signal', data}` (always delivered to the host) |
| relay → either | `{type:'signal', from: peerId \| 'host', data}` |
| relay → player | `{type:'host-left'}` |
| relay → either | `{type:'error', code, message}` (non-fatal, e.g. `unknown-peer`) |

`data` is opaque to the relay. Browsers exchange `{kind:'description', description:{type, sdp}}` and
`{kind:'candidate', candidate:{candidate, sdpMid, sdpMLineIndex}}` in it, and validate what they
receive (`protocol.js`). Over the data channel, Milestone 0 has one message: `{v:0, type:'hello', text}`.

Fatal problems close the socket with a code the client turns into a signaling error:
`4400` bad request, `4404` no host in the room, `4409` room already has a host, `4410` host left,
`4413` message too large, `4429` rate limited, `4503` room full. Limits: 16 KB per frame, a
per-connection token bucket (60 burst, 20 per second), and **one player per room**: Milestone 0 is
one host and one player, so a second player is refused with `4503` (shown as "The room is full")
while the first pair carries on. The host's one socket carries the signaling for every player, so
rooms for more players need the host's rate allowance to scale with them; that comes with the
multi-player session model, not before.

### Diagnostics

The page's diagnostics panel (and **Copy diagnostics**) shows the relay host, signaling state, room
registered / room found, players on the relay, and for each peer connection: its stage, connection, ICE,
gathering, signaling and data channel states, the selected candidate *types* (host / srflx / relay), the
last protocol error and the last message sent or received. It never contains the room id, join link
or IP addresses.

Each peer connection also counts its ICE candidates through every step, so a stalled connection shows
which step stopped (`peers.<id>.candidates`):

| Field | Meaning |
| --- | --- |
| `localGenerated` / `localTypes` | candidates this browser gathered, by type (`host` is usually an mDNS `.local` name, `srflx` comes from STUN) |
| `localSent` | of those, how many went to the relay (should equal `localGenerated`) |
| `localGatheringComplete` | this browser finished gathering |
| `remoteReceived` / `remoteTypes` | candidates that arrived from the other side (should equal the other side's `localSent`) |
| `remoteQueued` | of those, how many arrived before the offer/answer was applied and waited for it |
| `remoteApplied` / `remoteApplyErrors` | `addIceCandidate` successes and failures; `lastError` keeps the latest failure |
| `remotePending` | candidates still waiting for the remote description (0 once it is set) |

`remoteDescriptionSet` says whether the other side's offer/answer has been applied. There is no
end-of-candidates message: the other side doesn't need one for a data channel.

Failures are labelled by where they happened:

| Label | Meaning |
| --- | --- |
| `Signaling failure: …` | The relay couldn't be reached, the room has no host, the host left, or the other side never answered through the relay |
| `Connection failure (ICE)` | Offer and answer were exchanged, but no network path between the browsers worked. With TURN available this means even the relay path failed (check `turn` and the TURN notice); without TURN, that network probably needs it |
| `Connection failure (datachannel)` | ICE connected, but the data channel never opened |
| `Connection failure (negotiation)` | A browser rejected the offer or answer |
| `WebRTC blocked in this browser` | This browser gathered **no** ICE candidates at all, so it can't connect to anyone. Reported as soon as gathering ends, on the host's status line or the player's. Almost always an extension (VPN or "WebRTC leak" protection), a privacy setting (e.g. Brave shields) or a managed policy |

An ICE timeout says which step stalled: no candidates received from the other side (look at the other
side: it probably shows `WebRTC blocked in this browser`), candidates received but none applied, or
candidates exchanged with no working path (a network that needs TURN).

**Checking a browser:** in its developer console on any page, this prints how many candidates the browser
can gather (a normal browser gathers several within a second; `0` means WebRTC is blocked there):

```js
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
pc.createDataChannel('x'); let n = 0;
pc.onicecandidate = (e) => (e.candidate ? n++ : console.log('candidates gathered:', n));
await pc.setLocalDescription(await pc.createOffer());
```

## Running locally

```bash
node relay/node-relay.mjs            # relay on ws://localhost:8787
npx serve .                          # site on http://localhost:3000
```

Open `http://localhost:3000/liveshare-dev`, click **Start room**, **Reveal join link**, and open the
link in another browser window or profile. On localhost the page uses `ws://localhost:8787`
automatically. `?relay=ws(s)://…` picks another relay, and join links keep it. The override only works
on a local page (`localhost`, `127.0.0.1`, `[::1]`): any other origin, including the Netlify site,
ignores it and always uses `PRODUCTION_RELAY_URL`, so a crafted link to the real site can't route
signaling through a relay of its author's choosing. An override that isn't a valid `ws://`/`wss://` URL
falls back to the local relay. Two more development
parameters exist: `?forceRelay=1` allows only TURN relay candidates (debug/test only; see
[TURN fallback](#turn-fallback)) and `?iceTimeoutMs=`.

To run the real Cloudflare code locally instead of the Node relay:

```bash
cd relay/cloudflare
npx wrangler@4 dev --port 8787       # same URL, same protocol, Durable Objects emulated locally
```

## Tests

```bash
npx vitest run tests/unit/live-share-relay.test.js tests/unit/live-share-protocol.test.js \
  tests/unit/live-share-peer-link.test.js tests/unit/live-share-turn.test.js \
  tests/integration/live-share-node-relay.test.js
npx playwright test tests/e2e/live-share-networking.spec.js tests/e2e/live-share-mdns.spec.js
```

`live-share-networking.spec.js` launches Chromium with plain local IP host candidates;
`live-share-mdns.spec.js` runs the same flow with Chrome's default mDNS (`.local`) host candidates, as
real browsers gather them. Both assert that every candidate is generated, sent, received and applied.
The networking spec also covers TURN: a direct path wins while TURN is available (`usingTurnRelay:
false`), a forced relay-only connection goes through a TURN server (`usingTurnRelay: true`), and a
page that can't get TURN credentials still connects directly.

Playwright's global setup (`tests/helpers/live-share-turn-server.js`) starts a small TURN server
(`node-turn`, loopback only, UDP port 3479) with credentials made up fresh for each run, and starts the
Node relay with the same values as `DEV_TURN_*`, so no test needs Cloudflare or the internet.

Playwright starts the Node relay on port 8788 itself. To run the same browser spec against another
relay (for example `wrangler dev`, or the deployed Worker), set `LIVE_SHARE_TEST_RELAY`:

```bash
LIVE_SHARE_TEST_RELAY=ws://127.0.0.1:8787 npx playwright test tests/e2e/live-share-networking.spec.js tests/e2e/live-share-mdns.spec.js
```

For the TURN tests to pass against `wrangler dev`, give the Worker the test TURN server's credentials:
set `LIVE_SHARE_TEST_TURN_USERNAME` and `LIVE_SHARE_TEST_TURN_CREDENTIAL` to values of your choice
for the Playwright run, and start `wrangler dev` with the same values as
`--var DEV_TURN_URLS:turn:127.0.0.1:3479?transport=udp --var DEV_TURN_USERNAME:… --var DEV_TURN_CREDENTIAL:…`.

## Deploying the Cloudflare relay

Requirements: a Cloudflare account. The Workers free plan is enough, because the Durable Object class
is SQLite-backed, which the free plan requires. It stores nothing.

```bash
cd relay/cloudflare
npx wrangler@4 login                 # once per machine; opens a browser
npx wrangler@4 deploy                # prints https://dmtoolbox-live-share-relay.<subdomain>.workers.dev
curl https://dmtoolbox-live-share-relay.<subdomain>.workers.dev/health   # -> ok
```

Signaling needs no secrets. The only secrets are the TURN key's (see [TURN fallback](#turn-fallback)),
and they live in Wrangler secrets, never in `wrangler.toml`. `ALLOWED_ORIGINS` in `wrangler.toml` lists
the page origins allowed to open relay WebSockets and fetch TURN credentials (the Netlify site, plus
localhost:3000 and :3100 for development). This Origin check stops other websites from using the relay
from their visitors' browsers. It isn't authentication.

After the first deploy, set `PRODUCTION_RELAY_URL` in `js/modules/live-share/config.js` to the `wss://`
form of that URL, and deploy the site to Netlify. The deployed page has no other way to reach a relay
(`?relay=` is ignored off localhost), so until this is set it shows "No Live Share relay is
configured". Before that, you can check the deployed Worker from a local page, which is in
`ALLOWED_ORIGINS`: `http://localhost:3000/liveshare-dev?relay=wss://dmtoolbox-live-share-relay.<subdomain>.workers.dev`,
or `LIVE_SHARE_TEST_RELAY=wss://… npx playwright test tests/e2e/live-share-networking.spec.js`.

## TURN fallback

Some networks (many mobile carriers, symmetric NATs, corporate and school networks) block every direct
path between two browsers, so STUN alone can't connect them. A **TURN server** then relays the
browsers' WebRTC packets. Live Share uses TURN only as a fallback: peer connections keep
`iceTransportPolicy: "all"`, so ICE still picks a direct (`host` / `srflx` / `prflx`) path whenever one
works, and uses a `relay` candidate only when nothing direct does.

### Signaling and TURN are separate

| | Signaling relay (this Worker / Durable Objects) | TURN (Cloudflare Realtime TURN) |
| --- | --- | --- |
| Carries | offers, answers, ICE candidates, while connecting | the connection's encrypted WebRTC packets, only when no direct path works |
| Knows | room ids and connection ids | the two browsers' IP addresses and ports, packet sizes and timing |
| Can read content | no content passes through it | no: the data channel is end-to-end encrypted (DTLS) between the browsers |
| Stores | nothing | nothing from the app; the provider keeps its own usage/billing records |

The Worker's only TURN role is `GET /turn-credentials`, a stateless route kept apart from the room code
(`turn-credentials.mjs`): no TURN traffic passes through the Worker or the Durable Objects. The app
never stores campaign data on either service. As with any relay, the TURN provider can see *that*
two addresses exchanged encrypted traffic, how much and when; it cannot read it.

### Credential flow

```text
page (host: each time a player joins; player: before joining the room)
  └─ GET https://<relay>/turn-credentials         (Origin must be in ALLOWED_ORIGINS)
       └─ Worker: POST https://rtc.live.cloudflare.com/v1/turn/keys/$TURN_KEY_ID/credentials/generate-ice-servers
                  Authorization: Bearer $TURN_KEY_API_TOKEN, { "ttl": 14400 }
       ◄─ { iceServers: [{ urls: [turn:…udp, turn:…tcp, turns:…tls], username, credential }], ttlSeconds }
  └─ RTCPeerConnection({ iceServers: [STUN…, TURN…], iceTransportPolicy: "all" })
```

- The long-term TURN key (`TURN_KEY_ID`, `TURN_KEY_API_TOKEN`) never leaves the Worker; browsers only
  ever get credentials that expire after **4 hours** (`TURN_CREDENTIAL_TTL_SECONDS`, long enough for a
  play session: TURN checks them again whenever a browser refreshes its relay allocation).
- The Worker keeps TURN over UDP (3478, 443), TCP (3478, 80) and TLS (5349, 443) and drops the port-53
  URLs, which browsers block.
- The page holds credentials in memory for one connection attempt: never in storage, logs or diagnostics.
- Responses are `Cache-Control: no-store`; provider errors reach the page only as `turn-unavailable`.

### When TURN is unavailable

If the credential request fails, times out (5 s), is refused or returns anything unusable, the page
says **"TURN unavailable; direct connections may still work."** and connects STUN-only. A relay with no
TURN source answers `503 turn-not-configured` and the page says so. Neither stops a room from being
created or joined; only networks that need a relay will fail, with the usual ICE diagnosis.

### Setting up Cloudflare TURN (production)

1. In the Cloudflare dashboard, open **Realtime → TURN Server** and create a TURN key. Note its
   **Key ID** and **API token** (the token is shown once).
2. Store both as Worker secrets (you'll be prompted for each value; nothing goes into a file or the repo):

   ```bash
   cd relay/cloudflare
   npx wrangler@4 secret put TURN_KEY_ID
   npx wrangler@4 secret put TURN_KEY_API_TOKEN
   npx wrangler@4 deploy
   ```

3. Check it (expect `200` and a JSON body with `iceServers`; the credentials shown are short-lived):

   ```bash
   curl -i -H "Origin: https://dnddmtoolbox.netlify.app" https://dmtoolbox-live-share-relay.<subdomain>.workers.dev/turn-credentials
   ```

Cloudflare bills TURN by relayed traffic, with a monthly free allowance; see Cloudflare's Realtime
pricing page. Only connections that actually need a relay use it.

**Rotating the TURN key:** create a new TURN key, `wrangler secret put` both values again and deploy,
then delete the old key in the dashboard. Pages fetch credentials per connection, so new connections use
the new key at once; credentials minted from the old key stop working when it is deleted (and expire
within 4 hours regardless).

**Abuse note:** the Origin check keeps other websites' pages from requesting credentials, but a
non-browser client can send any Origin, so anyone could mint short-lived credentials and relay traffic
at the project's expense. Rate limiting and tying credentials to a live room are Milestone 8 work.

### Local development

`node relay/node-relay.mjs` serves the same `/turn-credentials` route from environment variables:

| Variables | Effect |
| --- | --- |
| `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` | real Cloudflare TURN credentials (the same key as production, or a separate development key) |
| `DEV_TURN_URLS` (comma-separated `turn:` URLs), `DEV_TURN_USERNAME`, `DEV_TURN_CREDENTIAL` | a fixed TURN server of your own, e.g. a local test server |
| neither | `503 turn-not-configured`: STUN-only, which is all you need on one machine or one network |
| `LIVE_SHARE_ALLOWED_ORIGINS` | page origins it serves (default `http://localhost:3000,http://localhost:3100`, as in `wrangler.toml`) |

For `wrangler dev`, put the same variables in `relay/cloudflare/.dev.vars` (gitignored) or pass them
with `--var NAME:value`.

### Diagnostics

| Field | Meaning |
| --- | --- |
| `turn.status` (page) | `available`, `not-configured` or `unavailable` for this page's last credential fetch |
| `turnConfigured` (peer) | this connection was given at least one TURN server |
| `localCandidateType` / `remoteCandidateType` | the selected candidate pair, from `getStats()`: `host`, `srflx`, `prflx` or `relay` |
| `usingTurnRelay` | `true` only when the selected pair has a `relay` candidate on either side, never just because TURN was configured |
| `turnTransport` | when this side's selected candidate is `relay`: how it reaches the TURN server (`udp`, `tcp` or `tls`). `null` when this side's own candidate is not a relay, even if `usingTurnRelay` is true because the *other* side is relaying (then its diagnostics show the transport) |
| `transportProtocol` | the selected candidate's protocol |

Troubleshooting:

- `turn.status: "not-configured"` on the live site → the TURN secrets aren't set on the Worker.
- `turn.status: "unavailable"` → the credential request failed; the Worker's logs
  (`npx wrangler@4 tail`) show `turn-credentials: TURN provider answered 401` and similar, never secrets.
- TURN available but `Connection failure (ICE)` → even the relay path failed; try `?forceRelay=1` on
  both sides to test TURN alone. Networks that block UDP need TURN over TCP/TLS, which the credentials
  include.
- `?forceRelay=1` (debug/test only) makes both pages relay-only, which proves TURN end to end:
  expect `usingTurnRelay: true` and `localCandidateType: "relay"`.

## Milestone 0 results

Validated in production on 2026-09-28 with the deployed Worker, Durable Objects and Cloudflare Realtime
TURN, using a clean Chrome Guest profile as the host:

| Path | Result |
| --- | --- |
| Chrome host → Brave desktop player | ICE `connected`, data channel `open`, `"hello"` received, `usingTurnRelay: false` (direct path) |
| Chrome host → Android phone on 5G (Wi-Fi off) | connection and ICE `connected`, data channel `open`, `"hello"` received, `turn.status: "available"`, `usingTurnRelay: true`; the phone's selected pair was `prflx` (local) / `relay` (remote) over UDP |

On the phone, the candidate lifecycle lined up: 9 local candidates generated and sent (host 1, srflx 2,
relay 6), 16 remote candidates received and applied, 0 apply errors, 0 pending. TURN was used only on
the path that needed it; the direct path stayed direct.

The phone's `turnTransport` was `null`: its own selected candidate was peer-reflexive, and the relay in
the pair was the host's TURN allocation, so the transport to TURN appears in the host's diagnostics.

The developer's normal Chrome profile gathered **zero** ICE candidates (WebRTC blocked in that profile by
an extension or setting). That was an environment issue, not an application defect; the page now
reports it as "WebRTC blocked in this browser", and the console check in [Diagnostics](#diagnostics)
confirms it.

What the services hold: the Cloudflare Worker and Durable Objects do signaling and TURN credential
issuance only; Cloudflare Realtime TURN relays the encrypted WebRTC packets when no direct path works.
Neither stores the app's game state. The TURN provider does see the two endpoints' addresses and the
traffic volume and timing (see [Signaling and TURN are separate](#signaling-and-turn-are-separate)).

## Manual remote-network test (Milestone 0 exit)

The page must be on a public origin (the Netlify site) so a device on another network can open it,
which means `PRODUCTION_RELAY_URL` is set and the site deployed (see above). Each room takes one player,
so every scenario starts a new room.

1. **Baseline, same Wi-Fi:** desktop opens `https://dnddmtoolbox.netlify.app/liveshare-dev`, clicks
   **Start room**, **Copy join link**. Send the link to a phone on the same Wi-Fi and open it. Expect
   "hello" on the phone, and on the desktop `Connected — sent "hello"`.
2. **Remote, mobile data:** use a clean Chrome or Guest profile as the host, turn Wi-Fi off on the
   phone and open a new join link (start a new room). Expect the same result. The diagnostics show
   either a direct path (`srflx`/`prflx`, `usingTurnRelay: false`) or, on carriers that block direct
   paths, `localCandidateType`/`remoteCandidateType: "relay"` and `usingTurnRelay: true`.
3. **Remote, two home networks:** start a new room; a person on another network opens its link.
4. **Clean disconnect:** tap **Leave** on the phone (the desktop's player list empties), then start a
   new room, join, and click **End session** on the desktop (the phone shows "The host ended the
   session.").

For each scenario, record the network pair, browser/OS, whether the data channel opened, whether "hello"
arrived, and on failure the **Copy diagnostics** output. A `Connection failure (ICE)` on a strict network
(some mobile carriers, corporate or school networks, symmetric NAT) is an acceptable Milestone 0 result:
it shows TURN is needed there, which is Milestone 8. Milestone 0 needs at least one remote scenario to
succeed.
