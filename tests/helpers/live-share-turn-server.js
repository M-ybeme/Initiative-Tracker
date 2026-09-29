// Playwright global setup: a local TURN server for the Live Share specs, so the relayed (TURN)
// path is tested without Cloudflare or the internet. playwright.config.js gives the local signaling
// relay the same URL and credentials (DEV_TURN_*), so its /turn-credentials endpoint hands them out.
// node-turn is a small UDP TURN server, used only here; it listens on loopback only.
import Turn from 'node-turn';

export const TEST_TURN_PORT = 3479;

export default async function startTestTurnServer() {
  const username = process.env.LIVE_SHARE_TEST_TURN_USERNAME;
  const credential = process.env.LIVE_SHARE_TEST_TURN_CREDENTIAL;
  const server = new Turn({
    authMech: 'long-term',
    credentials: { [username]: credential },
    realm: 'live-share-test',
    listeningPort: TEST_TURN_PORT,
    listeningIps: ['127.0.0.1'],
    relayIps: ['127.0.0.1'],
    minPort: 49160,
    maxPort: 49260,
    debugLevel: 'OFF',
  });
  server.start();
  return async () => server.stop();
}
