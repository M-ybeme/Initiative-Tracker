# Live Share signaling relay (Milestone 0)

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

Browser side (`js/modules/live-share/`): `signaling-client.js` (relay WebSocket), `peer-link.js`
(RTCPeerConnection + data channel, failure classification), `protocol.js` (message validation),
`room-id.js` (room ids and join links), `config.js` (relay URL and STUN servers). The prototype page is
`liveshare-dev.html` with `js/live-share-dev.js`. It isn't linked from the site navigation.

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

Failures are labelled by where they happened:

| Label | Meaning |
| --- | --- |
| `Signaling failure: …` | The relay couldn't be reached, the room has no host, the host left, or the other side never answered through the relay |
| `Connection failure (ICE)` | Offer and answer were exchanged, but no network path between the browsers worked. On a STUN-only build this usually means that network needs TURN (Milestone 8), not that the design is wrong |
| `Connection failure (datachannel)` | ICE connected, but the data channel never opened |
| `Connection failure (negotiation)` | A browser rejected the offer or answer |

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
parameters exist: `?forceRelay=1` allows only TURN candidates (with no TURN configured, this
forces an ICE failure) and `?iceTimeoutMs=`.

To run the real Cloudflare code locally instead of the Node relay:

```bash
cd relay/cloudflare
npx wrangler@4 dev --port 8787       # same URL, same protocol, Durable Objects emulated locally
```

## Tests

```bash
npx vitest run tests/unit/live-share-relay.test.js tests/unit/live-share-protocol.test.js \
  tests/unit/live-share-peer-link.test.js tests/integration/live-share-node-relay.test.js
npx playwright test tests/e2e/live-share-networking.spec.js
```

Playwright starts the Node relay on port 8788 itself. To run the same browser spec against another
relay (for example `wrangler dev`, or the deployed Worker), set `LIVE_SHARE_TEST_RELAY`:

```bash
LIVE_SHARE_TEST_RELAY=ws://127.0.0.1:8787 npx playwright test tests/e2e/live-share-networking.spec.js
```

## Deploying the Cloudflare relay

Requirements: a Cloudflare account. The Workers free plan is enough, because the Durable Object class
is SQLite-backed, which the free plan requires. It stores nothing.

```bash
cd relay/cloudflare
npx wrangler@4 login                 # once per machine; opens a browser
npx wrangler@4 deploy                # prints https://dmtoolbox-live-share-relay.<subdomain>.workers.dev
curl https://dmtoolbox-live-share-relay.<subdomain>.workers.dev/health   # -> ok
```

No secrets are involved: the Worker holds no credentials, and `ALLOWED_ORIGINS` in `wrangler.toml` lists
the page origins allowed to open relay WebSockets (the Netlify site, plus localhost:3000 and :3100 for
development). This Origin check stops other websites from using the relay from their visitors'
browsers. It isn't authentication.

After the first deploy, set `PRODUCTION_RELAY_URL` in `js/modules/live-share/config.js` to the `wss://`
form of that URL, and deploy the site to Netlify. The deployed page has no other way to reach a relay
(`?relay=` is ignored off localhost), so until this is set it shows "No Live Share relay is
configured". Before that, you can check the deployed Worker from a local page, which is in
`ALLOWED_ORIGINS`: `http://localhost:3000/liveshare-dev?relay=wss://dmtoolbox-live-share-relay.<subdomain>.workers.dev`,
or `LIVE_SHARE_TEST_RELAY=wss://… npx playwright test tests/e2e/live-share-networking.spec.js`.

## Manual remote-network test (Milestone 0 exit)

The page must be on a public origin (the Netlify site) so a device on another network can open it,
which means `PRODUCTION_RELAY_URL` is set and the site deployed (see above). Each room takes one player,
so every scenario starts a new room.

1. **Baseline, same Wi-Fi:** desktop opens `https://dnddmtoolbox.netlify.app/liveshare-dev`, clicks
   **Start room**, **Copy join link**. Send the link to a phone on the same Wi-Fi and open it. Expect
   "hello" on the phone, and on the desktop `Connected — sent "hello"`.
2. **Remote, mobile data:** turn Wi-Fi off on the phone and open a new join link (start a new room).
   Expect the same result. The diagnostics' `localCandidateType`/`remoteCandidateType` will usually
   show `srflx` (NAT traversal via STUN).
3. **Remote, two home networks:** start a new room; a person on another network opens its link.
4. **Clean disconnect:** tap **Leave** on the phone (the desktop's player list empties), then start a
   new room, join, and click **End session** on the desktop (the phone shows "The host ended the
   session.").

For each scenario, record the network pair, browser/OS, whether the data channel opened, whether "hello"
arrived, and on failure the **Copy diagnostics** output. A `Connection failure (ICE)` on a strict network
(some mobile carriers, corporate or school networks, symmetric NAT) is an acceptable Milestone 0 result:
it shows TURN is needed there, which is Milestone 8. Milestone 0 needs at least one remote scenario to
succeed.
