// Live Share Milestone 0: host and player in separate browser contexts, connected through the
// local Node relay (started by playwright.config.js on port 8788), exchange "hello" over a real
// RTCDataChannel. No network access beyond localhost is needed: with no reachable STUN server the
// browsers still connect over their host candidates.
import { test, expect } from '@playwright/test';
import { PAGE, startHost, diagnostics, expectCandidatePathComplete, blockTurnCredentials, dropStunServers, selectedPath } from '../helpers/live-share.js';

// Chromium hides local IPs behind mDNS names by default; two contexts on one machine can then fail
// to resolve each other's candidates. Real deployments are unaffected (they use STUN candidates).
test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

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

    await expectCandidatePathComplete(host.page, player);

    // TURN was available as a fallback, but a direct path won: TURN is not used just because it is configured.
    for (const [page, key] of [[host.page, null], [player, 'host']]) {
      const path = await selectedPath(page, key);
      expect(path).toMatchObject({ turnConfigured: true, usingTurnRelay: false, turnTransport: null });
      // Direct: host candidates, or peer-reflexive when the connection comes up before the other
      // side's candidate has arrived through signaling (common on a fast local link). Never relay.
      expect(['host', 'prflx']).toContain(path.localCandidateType);
      expect(['host', 'prflx']).toContain(path.remoteCandidateType);
      expect((await diagnostics(page)).turn).toMatchObject({ configured: true, status: 'available' });
    }
    await expect(player.getByTestId('turn-note')).toBeHidden();

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

  test('a player whose browser gathers no ICE candidates is told WebRTC is blocked, not left to time out', async ({ browser }) => {
    // forceRelay=1 on the player only: it may use TURN candidates alone, and with no TURN server it
    // gathers none, exactly like a browser whose WebRTC is blocked by an extension or policy.
    const host = await startHost(browser);
    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await blockTurnCredentials(player); // relay-only with no TURN server: nothing to gather
    await dropStunServers(player); // and no wait for public STUN servers (see the helper)
    await player.goto(host.joinUrl.replace('#room=', '&forceRelay=1&iceTimeoutMs=15000#room='));

    // Reported as soon as gathering ends, well before the 15 s connection timeout.
    await expect(player.getByTestId('player-status')).toContainText('WebRTC blocked in this browser', { timeout: 5000 });
    const playerLink = (await diagnostics(player)).peers.host;
    expect(playerLink.failure.kind).toBe('no-candidates');
    expect(playerLink.failure.message).toContain('gathered no network candidates');
    expect(playerLink.stage).toBe('answered');
    expect(playerLink.candidates).toMatchObject({ localGenerated: 0, localSent: 0, localGatheringComplete: true });
    await expect(player.getByTestId('received-message')).toHaveText('');
    // The player leaves; the host's room stays open for the next one.
    await expect(host.page.getByTestId('peer-list')).toContainText('No players connected.');
    await expect(host.page.getByTestId('host-status')).toHaveText('Room open — waiting for players');

    await host.context.close();
    await playerContext.close();
  });

  test('a player whose host sends no candidates is told so by its ICE diagnosis', async ({ browser }) => {
    // Only the host is blocked (forceRelay on the host page, not in the player's link): the player
    // gathers normally but never receives a candidate from the host, the reported symptom.
    const hostContext = await browser.newContext();
    const host = await hostContext.newPage();
    await blockTurnCredentials(host); // relay-only with no TURN server: the host gathers nothing
    await dropStunServers(host); // and no wait for public STUN servers (see the helper)
    await host.goto(`${PAGE}&forceRelay=1`);
    await host.getByTestId('start-room').click();
    await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    const joinUrl = (await host.getByTestId('join-link').textContent()).replace('&forceRelay=1', '&iceTimeoutMs=3000');

    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await player.goto(joinUrl);

    await expect(player.getByTestId('player-status')).toContainText('Connection failure (ICE)', { timeout: 15000 });
    await expect(player.getByTestId('player-status')).toContainText('received no network candidates from the host');
    const playerLink = (await diagnostics(player)).peers.host;
    // The player's own browser works: it generated candidates; it is the host that sent none.
    expect(playerLink.stage).toBe('answered');
    expect(playerLink.failure.kind).toBe('ice');
    expect(playerLink.candidates.remoteReceived).toBe(0);
    expect(playerLink.candidates.localGenerated).toBeGreaterThan(0);
    // The host diagnoses itself: its browser gathered nothing.
    await expect(host.getByTestId('host-status')).toContainText('WebRTC blocked in this browser');
    // (The player's row is gone once it leaves; the host keeps the last failure for its diagnosis.)
    const hostFailure = (await diagnostics(host)).lastPeerFailure;
    expect(hostFailure.kind).toBe('no-candidates');
    expect(hostFailure.message).toContain('gathered no network candidates');

    await hostContext.close();
    await playerContext.close();
  });

  test('forced TURN: with relay-only ICE the connection goes through the TURN server and "hello" arrives', async ({ browser }) => {
    // forceRelay=1 (debug/test only) on both sides: only relay candidates from the local TURN server.
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto(`${PAGE}&forceRelay=1`);
    await hostPage.getByTestId('start-room').click();
    await expect(hostPage.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    const joinUrl = await hostPage.getByTestId('join-link').textContent();
    expect(joinUrl).toContain('forceRelay=1');

    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    const started = Date.now();
    await player.goto(joinUrl);
    await expect(player.getByTestId('received-message')).toHaveText('hello', { timeout: 20000 });
    const connectMs = Date.now() - started;

    const counts = await expectCandidatePathComplete(hostPage, player);
    expect(Object.keys(counts.host.localTypes)).toEqual(['relay']);
    expect(Object.keys(counts.player.localTypes)).toEqual(['relay']);
    for (const [page, key] of [[hostPage, null], [player, 'host']]) {
      const path = await selectedPath(page, key);
      expect(path).toMatchObject({
        turnConfigured: true,
        usingTurnRelay: true,
        localCandidateType: 'relay',
        remoteCandidateType: 'relay',
        turnTransport: 'udp',
        dataChannelState: 'open',
        connectionState: 'connected',
      });
    }
    expect((await diagnostics(player)).lastReceived).toBe('hello');
    // Well inside the 20 s connection timeout on a relayed path.
    expect(connectMs).toBeLessThan(10000);

    // No credential ever reaches the diagnostics.
    const text = JSON.stringify(await diagnostics(hostPage)) + JSON.stringify(await diagnostics(player));
    expect(text).not.toContain(process.env.LIVE_SHARE_TEST_TURN_CREDENTIAL);
    expect(text).not.toContain(process.env.LIVE_SHARE_TEST_TURN_USERNAME);

    await hostContext.close();
    await playerContext.close();
  });

  test('TURN unavailable: both sides say so, and a direct connection still works', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await blockTurnCredentials(hostPage);
    await hostPage.goto(PAGE);
    await hostPage.getByTestId('start-room').click();
    await expect(hostPage.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    const joinUrl = await hostPage.getByTestId('join-link').textContent();

    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await blockTurnCredentials(player);
    await player.goto(joinUrl);
    await expect(player.getByTestId('received-message')).toHaveText('hello', { timeout: 20000 });

    for (const [page, key] of [[hostPage, null], [player, 'host']]) {
      await expect(page.getByTestId('turn-note')).toHaveText('TURN unavailable; direct connections may still work.');
      expect((await diagnostics(page)).turn).toMatchObject({ configured: false, status: 'unavailable' });
      expect(await selectedPath(page, key)).toMatchObject({ turnConfigured: false, usingTurnRelay: false, dataChannelState: 'open' });
    }

    await hostContext.close();
    await playerContext.close();
  });
});
