// Live Share Milestone 5A.2: the dedicated session host page (live-share.html,
// js/live-share-host.js). It owns the room, the signaling socket and every player connection, and only
// one such page per browser profile may host (an exclusive Web Lock). No Toolbox page is open in these
// tests, so a connected player gets a working connection but no map. The surface boundary and the
// Battle Map publishing to this page are tested in live-share-surface-boundary.spec.js and
// live-share-battlemap-session.spec.js.
import { test, expect } from '@playwright/test';
import { RELAY } from '../helpers/live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const HOST_PAGE = `/live-share?relay=${RELAY}`;

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}
const diagnostics = async (page) => JSON.parse(await page.getByTestId('diagnostics').textContent());

// The Start button is disabled when this tab may not host. A browser delivers no click to a disabled
// button (not even Playwright's forced click), so to test start()'s own ownership guard, the button
// is re-enabled (test only) and clicked: the page's real click handler runs start(), which must refuse.
async function clickStartDespiteDisabled(page) {
  await expect(page.getByTestId('start-room')).toBeDisabled();
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="start-room"]');
    button.disabled = false;
    button.click();
  });
}
async function expectNoRoomStarted(page) {
  await page.waitForTimeout(500); // a room would show "Connecting to relay…" at once, then open
  await expect(page.getByTestId('host-status')).toHaveText('Not started');
  await expect(page.getByTestId('join-link')).toHaveText('');
  const d = await diagnostics(page);
  expect(d.signaling).toBe('idle');
  expect(d.snapshots).toBeNull(); // no senders, so no HostSession was set up
  expect(d.peers).toEqual({});
}

async function openHostPage(context) {
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(HOST_PAGE);
  return { page, errors };
}

async function startRoom(host) {
  await expect(host.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner');
  await host.getByTestId('start-room').click();
  await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players', { timeout: 15000 });
  return host.getByTestId('join-link').textContent();
}

async function joinPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { context, player, errors };
}

test.describe('Live Share session host page (5A.2)', () => {
  test('hosts a room: link, a player connects over WebRTC (no map yet), End closes everything', async ({ browser }) => {
    const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const { page: host, errors: hostErrors } = await openHostPage(hostContext);
    await expect(host).toHaveTitle("The DM's Toolbox: Live Share session");
    await expect(host.getByText('This tab keeps Live Share running for your players.')).toBeVisible();
    await expect(host.getByTestId('owner-status')).toHaveText(/This tab keeps Live Share running\. Keep it open while you share/);
    expect(await host.evaluate(() => window.name)).toBe('dmtoolbox-live-share');
    await expect(host.getByTestId('end-session')).toBeDisabled();

    const joinUrl = await startRoom(host);
    expect(joinUrl).toMatch(/\/liveshare-dev\?relay=.+#room=[A-Za-z0-9_-]{22,}$/);
    await expect(host.getByTestId('join-link')).toBeHidden();
    await host.getByTestId('reveal-link').click();
    await expect(host.getByTestId('join-link')).toBeVisible();
    await host.getByTestId('copy-link').click();
    expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(joinUrl);
    await expect(host.getByTestId('start-room')).toBeDisabled();

    const p = await joinPlayer(browser, joinUrl);
    await expect(host.getByTestId('peer')).toHaveText('Player 1: Connected');
    await expect.poll(async () => Object.values((await diagnostics(host)).peers)[0]?.dataChannelState).toBe('open');
    // No surface publishes yet: the player is connected but receives no map.
    await p.player.waitForTimeout(1000);
    await expect(p.player.getByTestId('map-section')).toBeHidden();
    const playerDiag = await diagnostics(p.player);
    expect(playerDiag.snapshots).toMatchObject({ snapshotsReceived: 0, snapshotsApplied: 0 });
    const hostDiag = await diagnostics(host);
    expect(hostDiag).toMatchObject({ owner: 'owner', signaling: 'ready', snapshots: { snapshotsSent: 0, peers: 1 } });
    expect(JSON.stringify(hostDiag)).not.toContain(joinUrl.split('#room=')[1]); // no room id in diagnostics

    // End: the player is told, the host is reset and can start again.
    await host.getByTestId('end-session').click();
    await expect(host.getByTestId('host-status')).toHaveText('Session ended');
    await expect(p.player.getByTestId('player-status')).toHaveText('The host ended the session.', { timeout: 10000 });
    await expect(host.getByTestId('peer-list')).toHaveText('No players connected.');
    await expect(host.getByTestId('start-room')).toBeEnabled();
    await expect(host.getByTestId('end-session')).toBeDisabled();
    await expect(host.getByTestId('join-link')).toBeHidden();
    const restarted = await startRoom(host);
    expect(restarted).not.toBe(joinUrl); // a fresh room

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('one host per browser profile: a second tab starts nothing until the first closes', async ({ browser }) => {
    const context = await browser.newContext();
    const first = await openHostPage(context);
    await startRoom(first.page);
    const second = await openHostPage(context);
    await expect(second.page.getByTestId('owner-status')).toHaveAttribute('data-state', 'busy');
    await expect(second.page.getByTestId('owner-status')).toHaveText(/Live Share is already running in another tab/);
    // The disabled button, and behind it start()'s own guard: neither starts a room.
    await clickStartDespiteDisabled(second.page);
    await expectNoRoomStarted(second.page);
    expect((await diagnostics(second.page)).owner).toBe('busy');
    expect(await second.page.evaluate(() => window.name)).not.toBe('dmtoolbox-live-share');

    // Another profile (a separate browser context) is a separate owner, as two browsers would be.
    const otherProfile = await browser.newContext();
    const other = await openHostPage(otherProfile);
    await expect(other.page.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner');
    await otherProfile.close();

    // Closing the owner frees the lock: the waiting tab takes over (and still starts nothing itself).
    await first.page.close();
    await expect(second.page.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner', { timeout: 10000 });
    await expect(second.page.getByTestId('owner-status')).toHaveText(/The other Live Share tab closed: this tab now keeps Live Share running/);
    await expect(second.page.getByTestId('host-status')).toHaveText('Not started');
    await expect(second.page.getByTestId('start-room')).toBeEnabled();
    await startRoom(second.page);
    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    await context.close();
  });

  test('closing or reloading the host page ends the room for the player (Milestone 5: no recovery)', async ({ browser }) => {
    const context = await browser.newContext();
    const host = await openHostPage(context);
    const p1 = await joinPlayer(browser, await startRoom(host.page));

    // Reload: the room ends; the reloaded page owns the lock again and can start a new room.
    await host.page.reload();
    await expect(p1.player.getByTestId('player-status')).toHaveText('The host ended the session.', { timeout: 10000 });
    await expect(host.page.getByTestId('host-status')).toHaveText('Not started');
    await expect(host.page.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner');

    // Close: the same for a player of the new room.
    const p2 = await joinPlayer(browser, await startRoom(host.page));
    await host.page.close();
    await expect(p2.player.getByTestId('player-status')).toHaveText('The host ended the session.', { timeout: 10000 });
    expect((await diagnostics(p2.player)).signalingError).toMatchObject({ code: 'host-left' });

    expect(host.errors).toEqual([]);
    expect(p1.errors).toEqual([]);
    expect(p2.errors).toEqual([]);
    await context.close();
    await p1.context.close();
    await p2.context.close();
  });

  test('without Web Locks the page fails closed: it cannot host', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined, configurable: true });
    });
    const { page, errors } = await openHostPage(context);
    await expect(page.getByTestId('owner-status')).toHaveAttribute('data-state', 'unsupported');
    await expect(page.getByTestId('owner-status')).toHaveText(/This browser cannot host Live Share/);
    await clickStartDespiteDisabled(page);
    await expectNoRoomStarted(page);
    expect((await diagnostics(page)).owner).toBe('unsupported');
    expect(errors).toEqual([]);
    await context.close();
  });
});
