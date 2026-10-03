// Live Share Milestone 5A.3: the surface ↔ session host boundary in real browsers. A test-only
// publisher page (tests/fixtures/live-share-test-publisher.*), using the production boundary client,
// publishes Battle Map content over BroadcastChannel to the real session host page (live-share.html),
// which serves the real player page (liveshare-dev.html) over WebRTC from its publication store, in the
// unchanged Milestone 0-4 wire format. The real Battle Map is not involved: it moves to this path in 5A.4.
import { test, expect } from '@playwright/test';
import { RELAY } from '../helpers/live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const HOST_PAGE = `/live-share?relay=${RELAY}`;
// The clean URL (serve redirects *.html and would drop a query string).
const PUBLISHER_PAGE = '/tests/fixtures/live-share-test-publisher';

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}
const diagnostics = async (page) => JSON.parse(await page.getByTestId('diagnostics').textContent());

async function openHost(context) {
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(HOST_PAGE);
  await expect(page.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner');
  return { page, errors };
}

async function startRoom(host) {
  await host.getByTestId('start-room').click();
  await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players', { timeout: 15000 });
  return host.getByTestId('join-link').textContent();
}

// A publisher tab in the host's browser profile (BroadcastChannel is per profile).
async function openPublisher(context, options = {}) {
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(PUBLISHER_PAGE);
  await expect(page.locator('#status')).toHaveText('Test publisher ready');
  const instanceId = await page.evaluate((o) => window.testPublisher.start(o), options);
  return { page, errors, instanceId };
}

async function joinPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { context, player, errors };
}

const surfaceRows = (host) => host.getByTestId('surface');
const hostStore = async (host) => (await diagnostics(host)).boundary.store['battle-map'];

test.describe('Live Share surface boundary (5A.3)', () => {
  test('a publisher commits through the boundary; players get it from the host, also after the publisher closed', async ({ browser }) => {
    const context = await browser.newContext();
    const host = await openHost(context);
    await expect(host.page.getByTestId('surfaces')).toHaveText('No Toolbox page is connected to this session.');
    const pub = await openPublisher(context);
    await expect(surfaceRows(host.page)).toHaveCount(1);
    await expect(surfaceRows(host.page).first()).toHaveAttribute('data-state', 'active');

    // Prepared before the session: nothing is offered until a room is open.
    const ids = await pub.page.evaluate(async () => {
      const p = window.testPublisher;
      const bg = await p.background({ width: 1400, height: 900 });
      const art = await p.tokenArt({ width: 256, height: 256, color: '#aa3322' });
      p.set({ background: bg.assetId, tokens: [{ id: 't1', name: 'Goblin', showLabel: true, x: 70, y: 70, w: 70, h: 70, art: art.assetId }] });
      return { bg: bg.assetId, art: art.assetId, offered: p.publish() };
    });
    expect(ids.offered).toBe(false);
    expect((await hostStore(host.page)).committed).toBeNull();

    // Starting the room asks surfaces to announce themselves; the active one offers by itself.
    const joinUrl = await startRoom(host.page);
    await expect.poll(async () => (await hostStore(host.page)).committed).toEqual({ revision: 1, backgroundRevision: 1, assets: 2 });
    await expect(surfaceRows(host.page).first()).toHaveText('Battle Map: open, publishing · players see revision 1');
    expect((await pub.page.evaluate(() => window.testPublisher.status())).lastCommitted).toEqual({ publicationSeq: 1, revision: 1 });

    const p1 = await joinPlayer(browser, joinUrl);
    await expect(p1.player.getByTestId('map-status')).toHaveText('Live — revision 1');
    await expect(p1.player.getByTestId('map-assets')).toHaveText('Map image shown.');
    await expect.poll(async () => (await diagnostics(p1.player)).assets.cached).toBe(2); // background and token art
    await expect.poll(async () => (await pub.page.evaluate(() => window.testPublisher.status())).players).toBe(1);

    // A token-only save: a new snapshot revision, the same background revision, no asset re-sent.
    await pub.page.evaluate(({ bg, art }) => {
      window.testPublisher.set({ background: bg, tokens: [{ id: 't1', name: 'Goblin', showLabel: true, x: 140, y: 70, w: 70, h: 70, art }] });
      window.testPublisher.publish();
    }, ids);
    await expect(p1.player.getByTestId('map-status')).toHaveText('Live — revision 2');
    expect(await hostStore(host.page)).toMatchObject({ committed: { revision: 2, backgroundRevision: 1 }, assetsReceived: 2 });

    // The publisher closes: the host keeps the committed publication; the player keeps the map.
    await pub.page.close();
    await expect(surfaceRows(host.page).first()).toHaveAttribute('data-liveness', 'closed');
    await expect(surfaceRows(host.page).first()).toHaveText('Battle Map: closed · players see revision 2');
    expect((await hostStore(host.page)).committed).toEqual({ revision: 2, backgroundRevision: 1, assets: 2 });
    await expect(p1.player.getByTestId('map-status')).toHaveText('Live — revision 2');

    // A late player (the relay allows one at a time until 5B) gets the map and its assets from the host.
    await p1.player.getByTestId('leave-session').click();
    await expect(host.page.getByTestId('peer-list')).toHaveText('No players connected.', { timeout: 15000 });
    const p2 = await joinPlayer(browser, joinUrl);
    await expect(p2.player.getByTestId('map-status')).toHaveText('Live — revision 2');
    await expect(p2.player.getByTestId('map-assets')).toHaveText('Map image shown.');
    await expect.poll(async () => (await diagnostics(p2.player)).assets.cached).toBe(2);

    // Ending the session clears the store.
    await host.page.getByTestId('end-session').click();
    await expect.poll(async () => (await hostStore(host.page)).committed).toBeNull();
    expect((await hostStore(host.page)).heldAssets).toBe(0);

    expect(host.errors).toEqual([]);
    expect(pub.errors).toEqual([]);
    expect(p1.errors).toEqual([]);
    expect(p2.errors).toEqual([]);
    await context.close();
    await p1.context.close();
    await p2.context.close();
  });

  test('two publisher tabs: the latest publishes, the other is refused; a claim switches; stale and malformed messages change nothing', async ({ browser }) => {
    const context = await browser.newContext();
    const host = await openHost(context);
    const joinUrl = await startRoom(host.page);
    const make = (x) => async (page) =>
      page.evaluate(async (tokenX) => {
        const p = window.testPublisher;
        const bg = await p.background({ width: 700, height: 450, color: tokenX > 100 ? '#225533' : '#553322' });
        p.set({ background: bg.assetId, tokens: [{ id: 't1', name: `x${tokenX}`, showLabel: true, x: tokenX, y: 0, w: 70, h: 70 }] });
        return bg.assetId;
      }, x);
    const a = await openPublisher(context);
    await make(70)(a.page);
    await a.page.evaluate(() => window.testPublisher.publish());
    await expect.poll(async () => (await hostStore(host.page)).committed).toMatchObject({ revision: 1 });

    const b = await openPublisher(context);
    await make(140)(b.page);
    await b.page.evaluate(() => window.testPublisher.publish());
    await expect.poll(async () => (await hostStore(host.page)).committed).toMatchObject({ revision: 2, backgroundRevision: 2 });
    await expect(surfaceRows(host.page)).toHaveCount(2);
    await expect(host.page.locator('[data-testid="surface"][data-state="active"]')).toHaveCount(1);
    await expect(host.page.locator('[data-testid="surface"][data-state="inactive"]')).toHaveText('Battle Map: open in another tab (not publishing)');

    const p = await joinPlayer(browser, joinUrl);
    await expect(p.player.getByTestId('map-status')).toHaveText('Live — revision 2');

    // The former publisher (now inactive) tries again: its own publish() holds back, and a forced,
    // otherwise valid offer of a later seq is refused by the host as 'inactive'.
    await make(210)(a.page);
    expect(await a.page.evaluate(() => window.testPublisher.publish())).toBe(false);
    const before = (await diagnostics(host.page)).boundary;
    await a.page.evaluate((from) => {
      const valid = window.testPublisher.current();
      window.testPublisher.raw('dmtoolbox.live-share.control', { ch: 'dmtoolbox.live-share', v: 1, type: 'publication-offer', from, to: 'host', publicationSeq: 99, structured: valid.structured, assets: valid.assets });
      window.testPublisher.raw('dmtoolbox.live-share.control', { ch: 'dmtoolbox.live-share', v: 2, type: 'surface-claim', from, to: 'host' });
      window.testPublisher.raw('dmtoolbox.live-share.control', { ch: 'dmtoolbox.live-share', v: 1, type: 'surface-claim', from: 'host', to: 'host' });
      window.testPublisher.raw('dmtoolbox.live-share.control', 'not even an object');
    }, a.instanceId);
    await expect.poll(async () => (await diagnostics(host.page)).boundary.refused).toBe(before.refused + 3);
    await expect.poll(async () => (await diagnostics(host.page)).boundary.offersRefused).toBe(before.offersRefused + 1);
    expect((await diagnostics(host.page)).boundary.lastRejection).toBe('inactive');
    expect((await hostStore(host.page)).committed).toMatchObject({ revision: 2 });
    await expect(p.player.getByTestId('map-status')).toHaveText('Live — revision 2');

    // "Publish from this tab" (the protocol only; the Battle Map's button is 5A.4).
    await a.page.evaluate(() => window.testPublisher.claim());
    await expect(p.player.getByTestId('map-status')).toHaveText('Live — revision 3');
    expect((await diagnostics(p.player)).snapshots.lastSnapshotAppliedRevision).toBe(3);
    await expect.poll(async () => (await b.page.evaluate(() => window.testPublisher.status())).roleReason).toBe('superseded');

    expect(host.errors).toEqual([]);
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect(p.errors).toEqual([]);
    await context.close();
    await p.context.close();
  });

  test('a publisher of an unsupported version is shown to the DM and never publishes', async ({ browser }) => {
    const context = await browser.newContext();
    const host = await openHost(context);
    await startRoom(host.page);
    const old = await openPublisher(context, { surfaceVersion: 99 });
    await expect(surfaceRows(host.page).first()).toHaveAttribute('data-state', 'incompatible');
    await expect(surfaceRows(host.page).first()).toHaveText('Battle Map: a different version of the Toolbox: reload that tab');
    const before = (await diagnostics(host.page)).boundary.messages;
    await old.page.evaluate(async () => {
      const p = window.testPublisher;
      p.set({ tokens: [{ id: 't1', x: 0, y: 0, w: 70, h: 70 }] });
      p.claim();
    });
    // The claim reached the host (and was answered) before checking that nothing changed.
    await expect.poll(async () => (await diagnostics(host.page)).boundary.messages).toBeGreaterThan(before);
    await expect.poll(async () => (await old.page.evaluate(() => window.testPublisher.status())).roleReason).toBe('incompatible');
    expect(await old.page.evaluate(() => window.testPublisher.status())).toMatchObject({ active: false });
    expect((await hostStore(host.page)).committed).toBeNull();
    expect(host.errors).toEqual([]);
    await context.close();
  });

  // The ADR §9 note ¹ re-check (5A.1 saw a slow 16 MiB transfer with the owner tab in front, in installed
  // Chrome only). Here a near-limit background goes publisher → BroadcastChannel → real session host →
  // production AssetSender → real player, and a structured save is made while it transfers.
  //
  // What it showed (5A.3, Playwright Chromium, every run): the boundary part is fast (publish → committed
  // snapshot ~0.1-0.4 s for 16 MiB, copy and hash included) and the host sends the save's snapshot at once
  // (sendNow). But a few dozen milliseconds into the transfer the data channel delivers nothing for ~4 s
  // (the host's bufferedAmount stays near 49 KiB, the asset sender's fallback timer fires ~38 times),
  // then resumes at full speed; the snapshot, on the same ordered channel, arrives with that burst. That
  // is a transport stall below the senders, not starvation by them, and not a correctness problem: every
  // byte arrives and verifies, and latest state wins. So this test asserts what the host controls and
  // the outcome, and records the delivery timings (annotation and console). Follow-up, ADR §9.
  test('a near-16 MiB background crosses the boundary and reaches the player; the host sends a save made during the transfer at once', async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const host = await openHost(context);
    const joinUrl = await startRoom(host.page);
    const pub = await openPublisher(context);
    const p = await joinPlayer(browser, joinUrl);

    const big = await pub.page.evaluate(async () => {
      const bg = await window.testPublisher.background({ width: 2320, height: 2320, noise: true, nearBytes: 16 * 1024 * 1024 });
      window.testPublisher.set({ background: bg.assetId, tokens: [{ id: 't1', name: 'a', showLabel: true, x: 0, y: 0, w: 70, h: 70 }] });
      const t0 = Date.now();
      window.testPublisher.publish();
      return { ...bg, t0 };
    });
    expect(big.byteLength).toBeGreaterThan(15 * 1024 * 1024);
    expect(big.byteLength).toBeLessThanOrEqual(16 * 1024 * 1024);
    await expect(p.player.getByTestId('map-status')).toHaveText('Live — revision 1', { timeout: 20000 });
    const tCommitted = Date.now();

    // While the player is still receiving the background, a structured save, made outside the sender's
    // 100 ms throttle window (inside it, sendNow() coalesces into the trailing send, by design).
    await pub.page.waitForTimeout(200);
    const tSaved = await pub.page.evaluate((bgId) => {
      window.testPublisher.set({ background: bgId, tokens: [{ id: 't1', name: 'b', showLabel: true, x: 70, y: 0, w: 70, h: 70 }] });
      window.testPublisher.publish();
      return Date.now();
    }, big.assetId);
    // The host sends it in the commit event itself (sendNow), not on a later timer: the panel, redrawn
    // right after the commit, already shows revision 2 sent when it first shows revision 2 committed.
    await expect.poll(async () => (await diagnostics(host.page)).boundary.store['battle-map'].committed.revision, { timeout: 5000, intervals: [10] }).toBe(2);
    const hostWhenSent = await diagnostics(host.page);
    const tHostSent = Date.now();
    expect(hostWhenSent.snapshots.lastSnapshotSentRevision).toBe(2);
    expect(hostWhenSent.snapshots).toMatchObject({ snapshotsSent: 2, pendingSnapshot: false });
    // Whether the background was still in flight depends on the transport (see above): recorded, not asserted.
    await expect(p.player.getByTestId('map-status')).toHaveText('Live — revision 2', { timeout: 30000 });
    const tStructured = Date.now();
    await expect(p.player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 60000 });
    const tImage = Date.now();
    await expect.poll(async () => (await diagnostics(host.page)).assets.sent).toBe(1);
    expect((await diagnostics(p.player)).assets).toMatchObject({ cached: 1, failed: 0 });

    const timings = {
      bytes: big.byteLength,
      publishToPlayerRevision1Ms: tCommitted - big.t0,
      saveToHostSentMs: tHostSent - tSaved,
      backgroundInFlightAtSave: hostWhenSent.assets.activeTransfers === 1,
      saveToPlayerRevision2Ms: tStructured - tSaved,
      publishToImageShownMs: tImage - big.t0,
    };
    test.info().annotations.push({ type: '5A.3 16 MiB re-check', description: JSON.stringify(timings) });
    console.log('5A.3 16 MiB re-check', JSON.stringify(timings));

    expect(host.errors).toEqual([]);
    expect(pub.errors).toEqual([]);
    expect(p.errors).toEqual([]);
    await context.close();
    await p.context.close();
  });
});
