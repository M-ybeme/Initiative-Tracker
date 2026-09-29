// Helpers for the Live Share Milestone 0 browser specs (liveshare-dev.html): a host and a player in
// separate browser contexts, connected through a signaling relay.
import { expect } from '@playwright/test';

// LIVE_SHARE_TEST_RELAY runs these specs against another relay speaking the same protocol, e.g.
// `wrangler dev` (ws://localhost:8787) or the deployed Cloudflare relay (wss://...workers.dev).
export const RELAY = process.env.LIVE_SHARE_TEST_RELAY || 'ws://localhost:8788';
// The clean URL: `serve` redirects /liveshare-dev.html to /liveshare-dev and drops the query string.
export const PAGE = `/liveshare-dev?relay=${RELAY}`;

export async function startHost(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(PAGE);
  await page.getByTestId('start-room').click();
  await expect(page.getByTestId('host-status')).toHaveText('Room open — waiting for players');
  const joinUrl = await page.getByTestId('join-link').textContent();
  return { context, page, joinUrl };
}

export async function diagnostics(page) {
  return JSON.parse(await page.getByTestId('diagnostics').textContent());
}

export async function hostPeerDiag(page) {
  return Object.values((await diagnostics(page)).peers)[0];
}

// Every ICE candidate one side generated was sent, arrived at the other side and was applied there
// without error, and ICE left "new". Candidates can still trickle in just after "hello", so the
// counts are polled until they line up.
export async function expectCandidatePathComplete(hostPage, playerPage) {
  await expect
    .poll(async () => {
      const h = (await hostPeerDiag(hostPage)).candidates;
      const p = (await diagnostics(playerPage)).peers.host.candidates;
      return {
        hostSentAll: h.localGenerated > 0 && h.localSent === h.localGenerated,
        playerSentAll: p.localGenerated > 0 && p.localSent === p.localGenerated,
        playerReceivedHosts: p.remoteReceived === h.localSent,
        hostReceivedPlayers: h.remoteReceived === p.localSent,
        playerAppliedAll: p.remoteApplied === p.remoteReceived && p.remotePending === 0,
        hostAppliedAll: h.remoteApplied === h.remoteReceived && h.remotePending === 0,
        noApplyErrors: h.remoteApplyErrors + p.remoteApplyErrors === 0,
      };
    })
    .toEqual({
      hostSentAll: true,
      playerSentAll: true,
      playerReceivedHosts: true,
      hostReceivedPlayers: true,
      playerAppliedAll: true,
      hostAppliedAll: true,
      noApplyErrors: true,
    });
  const host = await hostPeerDiag(hostPage);
  const player = (await diagnostics(playerPage)).peers.host;
  for (const side of [host, player]) {
    expect(side.iceConnectionState).not.toBe('new');
    expect(side.connectionState).toBe('connected');
    expect(side.remoteDescriptionSet).toBe(true);
  }
  return { host: host.candidates, player: player.candidates };
}

// Make the relay's TURN credential endpoint unreachable for this page, as when TURN is down.
export async function blockTurnCredentials(page) {
  await page.route('**/turn-credentials', (route) => route.abort('connectionrefused'));
}

// The selected candidate pair is read from getStats() just after the connection comes up, so poll.
export async function selectedPath(page, peerKey = null) {
  let snapshot = null;
  await expect
    .poll(async () => {
      const peers = (await diagnostics(page)).peers;
      snapshot = peerKey ? peers[peerKey] : Object.values(peers)[0];
      return snapshot && snapshot.localCandidateType;
    })
    .not.toBeNull();
  return snapshot;
}

