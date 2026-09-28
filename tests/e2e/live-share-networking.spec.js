// Live Share Milestone 0: host and player in separate browser contexts, connected through the
// local Node relay (started by playwright.config.js on port 8788), exchange "hello" over a real
// RTCDataChannel. No network access beyond localhost is needed: with no reachable STUN server the
// browsers still connect over their host candidates.
import { test, expect } from '@playwright/test';

// LIVE_SHARE_TEST_RELAY runs this spec against another relay speaking the same protocol, e.g.
// `wrangler dev` (ws://localhost:8787) or the deployed Cloudflare relay (wss://...workers.dev).
const RELAY = process.env.LIVE_SHARE_TEST_RELAY || 'ws://localhost:8788';
// The clean URL: `serve` redirects /liveshare-dev.html to /liveshare-dev and drops the query string.
const PAGE = `/liveshare-dev?relay=${RELAY}`;

// Chromium hides local IPs behind mDNS names by default; two contexts on one machine can then fail
// to resolve each other's candidates. Real deployments are unaffected (they use STUN candidates).
test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

async function startHost(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(PAGE);
  await page.getByTestId('start-room').click();
  await expect(page.getByTestId('host-status')).toHaveText('Room open — waiting for players');
  const joinUrl = await page.getByTestId('join-link').textContent();
  return { context, page, joinUrl };
}

async function diagnostics(page) {
  return JSON.parse(await page.getByTestId('diagnostics').textContent());
}

test.describe('Live Share networking (Milestone 0)', () => {
  test('host and player connect over a data channel, "hello" arrives, and both disconnect cleanly', async ({ browser }) => {
    const host = await startHost(browser);
    expect(host.joinUrl).toMatch(/#room=[A-Za-z0-9_-]{22}$/);
    // The join link is hidden until revealed.
    await expect(host.page.getByTestId('join-link')).toBeHidden();

    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await player.goto(host.joinUrl);

    await expect(player.getByTestId('received-message')).toHaveText('hello', { timeout: 20000 });
    await expect(player.getByTestId('player-status')).toHaveText('Connected to host');
    await expect(host.page.getByTestId('peer-list')).toContainText('Connected — sent "hello"');

    const hostDiag = await diagnostics(host.page);
    expect(hostDiag).toMatchObject({ role: 'host', signaling: 'ready', roomRegistered: true, playersOnRelay: 1, lastSent: 'hello' });
    const [peerDiag] = Object.values(hostDiag.peers);
    expect(peerDiag).toMatchObject({ connectionState: 'connected', dataChannelState: 'open', failure: null });

    const playerDiag = await diagnostics(player);
    expect(playerDiag).toMatchObject({ role: 'player', signaling: 'ready', roomFound: true, lastReceived: 'hello' });
    expect(playerDiag.peers.host).toMatchObject({ connectionState: 'connected', dataChannelState: 'open', failure: null });
    // Diagnostics never contain the room id.
    const roomId = host.joinUrl.split('#room=')[1];
    expect(JSON.stringify(hostDiag) + JSON.stringify(playerDiag)).not.toContain(roomId);

    // Player leaves: the host sees the player go, and its room stays open.
    await player.getByTestId('leave-session').click();
    await expect(player.getByTestId('player-status')).toHaveText('You left the session.');
    await expect(host.page.getByTestId('peer-list')).toContainText('No players connected.');
    await expect(host.page.getByTestId('host-status')).toHaveText('Room open — waiting for players');

    // A second player joins, then the host ends the session.
    const player2 = await playerContext.newPage();
    await player2.goto(host.joinUrl);
    await expect(player2.getByTestId('received-message')).toHaveText('hello', { timeout: 20000 });
    await host.page.getByTestId('end-session').click();
    await expect(host.page.getByTestId('host-status')).toHaveText('Session ended');
    await expect(player2.getByTestId('player-status')).toHaveText('The host ended the session.');
    expect((await diagnostics(player2)).signalingError).toMatchObject({ code: 'host-left' });

    // The ended room is gone from the relay: its link no longer finds a host.
    const late = await playerContext.newPage();
    await late.goto(host.joinUrl);
    await expect(late.getByTestId('player-status')).toContainText('Signaling failure: No host is sharing this room');

    await host.context.close();
    await playerContext.close();
  });

  test('a room takes one player: a second is told the room is full and the first stays connected', async ({ browser }) => {
    const host = await startHost(browser);
    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await player.goto(host.joinUrl);
    await expect(player.getByTestId('received-message')).toHaveText('hello', { timeout: 20000 });

    const second = await playerContext.newPage();
    await second.goto(host.joinUrl);
    await expect(second.getByTestId('player-status')).toHaveText('Signaling failure: The room is full.');
    expect((await diagnostics(second)).signalingError).toMatchObject({ code: 'room-full' });

    await expect(player.getByTestId('player-status')).toHaveText('Connected to host');
    expect((await diagnostics(player)).peers.host).toMatchObject({ dataChannelState: 'open', failure: null });
    await expect(host.page.getByTestId('peer-list').locator('li')).toHaveCount(1);
    await expect(host.page.getByTestId('peer-list')).toContainText('Connected — sent "hello"');

    await host.context.close();
    await playerContext.close();
  });

  test('a link to a room with no host is reported as a signaling failure', async ({ page }) => {
    await page.goto(`${PAGE}#room=AbCdEfGhIjKlMnOpQrStUv`);
    await expect(page.getByTestId('player-status')).toContainText('Signaling failure: No host is sharing this room');
    const diag = await diagnostics(page);
    expect(diag).toMatchObject({ roomFound: false, signaling: 'closed', signalingError: { code: 'no-host' } });
    expect(diag.peers).toEqual({});
  });

  test('an unreachable relay is reported as a signaling failure', async ({ page }) => {
    await page.goto('/liveshare-dev?relay=ws://localhost:1');
    await page.getByTestId('start-room').click();
    await expect(page.getByTestId('host-status')).toContainText('Signaling failure: Could not reach the relay');
  });

  test('when no network path works, the failure is reported as ICE, not signaling', async ({ browser }) => {
    // forceRelay=1 allows only TURN candidates; with no TURN server there are none, so signaling
    // completes but ICE cannot.
    const url = `${PAGE}&forceRelay=1&iceTimeoutMs=3000`;
    const hostContext = await browser.newContext();
    const host = await hostContext.newPage();
    await host.goto(url);
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    const joinUrl = await host.getByTestId('join-link').textContent();

    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await player.goto(joinUrl);

    await expect(player.getByTestId('player-status')).toContainText('Connection failure (ICE)', { timeout: 15000 });
    const diag = await diagnostics(player);
    expect(diag.signaling).toBe('closed');
    expect(diag.roomFound).toBe(true);
    expect(diag.peers.host.failure.kind).toBe('ice');
    expect(diag.peers.host.stage).toBe('answered');
    await expect(player.getByTestId('received-message')).toHaveText('');

    await hostContext.close();
    await playerContext.close();
  });
});
