// Live Share Milestone 5C: the DM's side, through the visible controls of the Live Share page
// (live-share.html) and the Battle Map's compact Live Share panel, with real player pages
// (liveshare-dev.html) for what players see. The wire-level admission guarantees stay in
// live-share-admission.spec.js and the player join flow in live-share-join-flow.spec.js.
import { test, expect } from '@playwright/test';
import {
  HOST_PAGE,
  openSessionPage,
  openBattleMap,
  hostSnapshot,
  importMap,
  makeMap,
  save,
  addPresetToken,
  watchErrors,
  recordHostSends,
  recordPlayerTraffic,
  startRoom,
  addSeat,
  seatRow,
  seatButton,
  seatAction,
  setRoomPassword,
  removeRoomPassword,
  setRoomLocked,
  endSession,
  chooseSeat,
  liveShareState,
} from '../helpers/battlemap-live-share.js';

const BARD = { id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true };
const PASSWORD = 'Dragon Hoard 7!';

const diagnosticsText = (session) => session.getByTestId('diagnostics').textContent();
const diagnostics = async (session) => JSON.parse(await diagnosticsText(session));
const seatState = (session, seatId) => session.locator(`[data-testid="seat"][data-seat-id="${seatId}"]`).getAttribute('data-state');
const seatCard = (session, seatId) => session.locator(`[data-testid="seat"][data-seat-id="${seatId}"]`);
const confirmDialog = (session) => session.getByTestId('confirm-dialog');

// The DM's browser: the Live Share page (not started) and a Battle Map with a saved map.
async function dm(browser, { permissions = [], start = false } = {}) {
  const hostContext = await browser.newContext({ permissions });
  await hostContext.addInitScript(recordHostSends);
  const hostErrors = [];
  const session = await openSessionPage(hostContext, hostErrors, { start });
  const host = await openBattleMap(hostContext, session, hostErrors);
  await importMap(host, await makeMap(host), { tokens: [BARD] });
  return { hostContext, session, host, hostErrors };
}
async function openPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  await context.addInitScript(recordPlayerTraffic);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('join-panel')).toBeVisible({ timeout: 20000 });
  return { context, player, errors };
}
async function joined(browser, joinUrl, name, options) {
  const p = await openPlayer(browser, joinUrl);
  expect(await chooseSeat(p.player, name, options)).toBe(`Joined as ${name}`);
  return p;
}
// Every window.open() call on a page: how many, and the last window it returned. That a later call
// returns the very same window object proves the browser created no new one.
function recordWindowOpens() {
  const open = window.open.bind(window);
  window.__opens = 0;
  window.__lastOpen = null;
  window.open = (...args) => {
    const win = open(...args);
    window.__opens += 1;
    window.__lastOpen = win;
    return win;
  };
}
// New pages (tabs, pop-ups, blank windows: any URL) opened in a context from now on.
function countNewPages(context) {
  let n = 0;
  context.on('page', () => (n += 1));
  return () => n;
}
// Records every dialog the page shows (type), and answers it.
function watchDialogs(page, answer = 'dismiss') {
  const seen = [];
  page.on('dialog', async (d) => {
    seen.push(d.type());
    await (answer === 'accept' ? d.accept() : d.dismiss());
  });
  return seen;
}

test.describe('Live Share host and session UX (5C)', () => {
  test('a DM runs a session from the Live Share page: start, a seat, a password, the link, a player, lock, leave, end', async ({ browser }) => {
    const { hostContext, session, host, hostErrors } = await dm(browser, { permissions: ['clipboard-read', 'clipboard-write'] });

    // Before Start: what the page is for, Start Session, and nothing that needs a running session.
    await expect(session.getByRole('heading', { name: /Live Share/, level: 1 })).toBeVisible();
    await expect(session.getByTestId('host-status')).toHaveText('Not running');
    await expect(session.getByTestId('host-detail')).toContainText('Keep this tab open while you play');
    await expect(session.getByRole('button', { name: 'Start Session' })).toBeEnabled();
    for (const id of ['end-session', 'copy-link', 'add-seat', 'lock-room', 'set-password']) await expect(session.getByTestId(id)).toBeHidden();
    await expect(session.getByTestId('share-status')).toHaveText('The Battle Map is open. Players will see its last saved map once the session starts.');
    expect((await diagnostics(session)).leaveWarning).toBe(false);

    // Start: one session (a second click does nothing), then Live, with the link controls.
    await session.getByTestId('start-room').dblclick();
    await expect(session.getByTestId('host-status')).toHaveText('Live', { timeout: 15000 });
    await expect(session.getByTestId('start-room')).toBeHidden();
    await expect(session.getByTestId('end-session')).toBeEnabled();
    expect((await diagnostics(session)).leaveWarning).toBe(true);
    await expect(session.getByTestId('share-status')).toHaveAttribute('data-state', 'sharing', { timeout: 15000 });
    await expect(session.getByTestId('share-status')).toHaveText('Sharing your saved Battle Map with players.');
    // No seats yet: the page says so where the link is, and in the seat list.
    await expect(session.getByTestId('link-warning')).toBeVisible();
    await expect(session.getByTestId('no-seats')).toHaveText("No seats yet. Players can't join until you add one.");

    // A seat with the suggested name, renamed in place (Enter saves).
    await expect(session.getByTestId('seat-name')).toHaveAttribute('placeholder', 'Player 1');
    await session.getByTestId('add-seat').click();
    const seat = await seatRow(session, 'Player 1').getAttribute('data-seat-id');
    await expect(session.getByTestId('link-warning')).toBeHidden();
    await expect(session.getByTestId('seat-name')).toHaveAttribute('placeholder', 'Player 2');
    await seatButton(session, seat, 'rename').click();
    await expect(seatCard(session, seat).getByTestId('rename-input')).toBeFocused();
    await seatCard(session, seat).getByTestId('rename-input').fill('Aria');
    await seatCard(session, seat).getByTestId('rename-input').press('Enter');
    await expect(seatCard(session, seat).getByTestId('seat-label')).toHaveText('Aria');
    await expect(seatCard(session, seat).getByTestId('seat-state')).toHaveText('Available');
    await expect(seatButton(session, seat, 'rename')).toBeFocused();

    // A password: hidden while typed, shown on request, saved, then gone from the page.
    await expect(session.getByTestId('password-status')).toHaveText('Off');
    await session.getByTestId('set-password').click();
    await expect(session.getByTestId('room-password')).toBeFocused();
    await expect(session.getByTestId('room-password')).toHaveAttribute('autocomplete', 'off'); // a room password, not one for the browser to save
    await expect(session.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
    await session.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await session.getByTestId('show-password').click();
    await expect(session.getByTestId('room-password')).toHaveAttribute('type', 'text');
    await session.getByTestId('save-password').click();
    await expect(session.getByTestId('password-status')).toHaveText('Required');
    await expect(session.getByTestId('room-password')).toBeHidden();
    expect(await session.getByTestId('room-password').inputValue()).toBe('');
    await expect(session.getByTestId('set-password')).toHaveText('Change Password');

    // The join link: hidden until shown, copied without being shown, never carrying the password.
    await expect(session.getByTestId('join-link')).toBeHidden();
    await session.getByTestId('reveal-link').click();
    await expect(session.getByTestId('join-link')).toBeVisible();
    await expect(session.getByTestId('reveal-link')).toHaveText('Hide Join Link');
    const joinUrl = await session.getByTestId('join-link').textContent();
    await session.getByTestId('reveal-link').click();
    await expect(session.getByTestId('join-link')).toBeHidden();
    await session.getByTestId('copy-link').click();
    await expect(session.getByTestId('copy-status')).toHaveText('Join link copied.');
    await expect(session.getByTestId('join-link')).toBeHidden();
    expect(await session.evaluate(() => navigator.clipboard.readText())).toBe(joinUrl);
    expect(joinUrl).not.toContain(encodeURIComponent(PASSWORD));
    expect(joinUrl).not.toContain('Dragon');

    // A player joins with the password; the DM sees them joined, and they get the saved map.
    const p = await joined(browser, joinUrl, 'Aria', { password: PASSWORD });
    await expect(seatCard(session, seat).getByTestId('seat-state')).toHaveText('Joined');
    await expect(session.getByTestId('player-count')).toHaveText('1 player joined');
    await expect(p.player.getByTestId('map-section')).toBeVisible({ timeout: 15000 });
    await expect(liveShareState(host)).toHaveText('Live Share is on · 1 player joined. This tab shares your saved map.');

    // Lock: said plainly; the player in the session stays. Unlock again.
    await session.getByTestId('lock-room').click();
    await expect(session.getByTestId('lock-status')).toHaveText('Locked: new players cannot join. Players already in the session stay connected.');
    await expect(session.getByTestId('lock-room')).toHaveText('Unlock Room');
    await expect(p.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    await session.getByTestId('lock-room').click();
    await expect(session.getByTestId('lock-status')).toHaveText('New players can join available seats.');

    // The player leaves: the seat is available again.
    await p.player.getByTestId('leave-session').click();
    await expect(seatCard(session, seat).getByTestId('seat-state')).toHaveText('Available', { timeout: 10000 });
    await expect(session.getByTestId('player-count')).toHaveText('No players yet');

    // End Session asks first; Cancel keeps the session; confirming ends it at once.
    await session.getByTestId('end-session').click();
    await expect(confirmDialog(session)).toBeVisible();
    await expect(confirmDialog(session).getByTestId('confirm-body')).toHaveText('All players are disconnected, and the seats, password and join link are discarded. Your Battle Map and its saved map are unchanged.');
    await expect(confirmDialog(session).getByTestId('confirm-cancel')).toBeFocused();
    await session.keyboard.press('Escape');
    await expect(confirmDialog(session)).toBeHidden();
    await expect(session.getByTestId('host-status')).toHaveText('Live');
    await expect(session.getByTestId('end-session')).toBeFocused();
    await endSession(session);
    await expect(session.getByTestId('host-status')).toHaveText('Session ended');
    await expect(session.getByTestId('host-detail')).toContainText('Your Battle Map is unchanged');
    await expect(session.getByRole('button', { name: 'Start New Session' })).toBeEnabled();
    for (const id of ['end-session', 'copy-link', 'add-seat', 'lock-room']) await expect(session.getByTestId(id)).toBeHidden();
    expect((await diagnostics(session)).leaveWarning).toBe(false);
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'not-running');

    // The password never showed on the page or in the diagnostics, and never left this browser.
    expect(await session.locator('body').innerText()).not.toContain(PASSWORD);
    expect(await diagnosticsText(session)).not.toContain('Dragon');
    expect((await session.evaluate(() => window.__lsSent.filter((m) => typeof m === 'string'))).some((m) => m.includes('Dragon'))).toBe(false);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('Copy Join Link without clipboard access shows the link selected to copy by hand', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => ({ writeText: () => Promise.reject(new Error('denied')) }), configurable: true });
    });
    const errors = [];
    const session = await openSessionPage(context, errors);
    const joinUrl = await session.getByTestId('join-link').textContent();
    await session.getByTestId('copy-link').click();
    await expect(session.getByTestId('copy-status')).toHaveText("Couldn't copy automatically. The link is selected below: press Ctrl+C (⌘C on a Mac) to copy it.");
    await expect(session.getByTestId('join-link')).toBeVisible();
    expect(await session.evaluate(() => window.getSelection().toString())).toBe(joinUrl);
    expect(errors).toEqual([]);
    await context.close();
  });

  test('seats: add, rename, disable and enable; kick and disable a joined player ask first and remove only that player', async ({ browser }) => {
    const { hostContext, session, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    const ids = {};
    for (const n of ['Aria', 'Brom', 'Cael']) ids[n] = await addSeat(session, n);
    // An empty name gets the next suggested one; a name of only spaces is refused, with a reason.
    await session.getByTestId('add-seat').click();
    await expect(seatRow(session, 'Player 1')).toHaveCount(1);
    await session.getByTestId('seat-name').fill('   ');
    await session.getByTestId('add-seat').click();
    await expect(session.getByTestId('seat-error')).toHaveText('A seat name is 1–40 characters (not only spaces).');
    // A double click adds one seat.
    await session.getByTestId('seat-name').fill('Dara');
    await session.getByTestId('add-seat').dblclick();
    await expect(seatRow(session, 'Dara')).toHaveCount(1);
    await expect(session.getByTestId('seat')).toHaveCount(5);

    // Rename: Escape cancels and keeps the old name; a bad name is refused in place.
    await seatButton(session, ids.Cael, 'rename').click();
    await seatCard(session, ids.Cael).getByTestId('rename-input').fill('Somebody else');
    await seatCard(session, ids.Cael).getByTestId('rename-input').press('Escape');
    await expect(seatCard(session, ids.Cael).getByTestId('seat-label')).toHaveText('Cael');
    await seatButton(session, ids.Cael, 'rename').click();
    await seatCard(session, ids.Cael).getByTestId('rename-input').fill(' ');
    await seatCard(session, ids.Cael).getByTestId('rename-save').click();
    await expect(seatCard(session, ids.Cael).getByTestId('rename-error')).toHaveText('A seat name is 1–40 characters (not only spaces).');
    await seatCard(session, ids.Cael).getByTestId('rename-cancel').click();

    // Disable / enable an available seat: no question; a waiting player sees it go and come back.
    const waiting = await openPlayer(browser, joinUrl);
    await seatButton(session, ids.Cael, 'disable').click();
    await expect(confirmDialog(session)).toBeHidden();
    await expect(seatCard(session, ids.Cael).getByTestId('seat-state')).toHaveText('Disabled');
    await expect(seatButton(session, ids.Cael, 'enable')).toBeVisible();
    await expect(seatButton(session, ids.Cael, 'disable')).toBeHidden();
    await expect(waiting.player.getByTestId('join-seat').locator('option', { hasText: 'Cael' })).toHaveCount(0);
    await seatButton(session, ids.Cael, 'enable').click();
    await expect(seatCard(session, ids.Cael).getByTestId('seat-state')).toHaveText('Available');
    await expect(waiting.player.getByTestId('join-seat').locator('option', { hasText: /^Cael$/ })).toBeEnabled();

    // Two players join; one is still waiting.
    const a = await joined(browser, joinUrl, 'Aria');
    const b = await joined(browser, joinUrl, 'Brom');
    await expect(session.getByTestId('player-count')).toHaveText('2 players joined · 1 waiting to join');
    // A joined seat offers Kick, Reset Seat and Disable; an available one doesn't offer Kick.
    for (const action of ['rename', 'kick', 'reset', 'disable']) await expect(seatButton(session, ids.Aria, action)).toBeVisible();
    await expect(seatButton(session, ids.Cael, 'kick')).toBeHidden();

    // Kick Aria: asked first (not a ban), and only Aria's player is removed.
    await seatButton(session, ids.Aria, 'kick').click();
    await expect(confirmDialog(session)).toBeVisible();
    await expect(confirmDialog(session).getByRole('heading')).toHaveText('Kick Aria?');
    await expect(confirmDialog(session).getByTestId('confirm-body')).toContainText("This isn't a ban: they can join again with the join link");
    await confirmDialog(session).getByTestId('confirm-ok').click();
    await expect(a.player.getByTestId('player-status')).toHaveText('You were removed from the session.', { timeout: 10000 });
    await expect(seatCard(session, ids.Aria).getByTestId('seat-state')).toHaveText('Available');
    await expect(b.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    await expect(waiting.player.getByTestId('join-seat').locator('option', { hasText: /^Aria$/ })).toBeEnabled();
    await expect.poll(() => session.evaluate(() => document.activeElement.closest('[data-testid="seat"]')?.dataset.seatId)).toBe(ids.Aria); // focus stays on Aria's card
    await expect(session.getByTestId('player-count')).toHaveText('1 player joined · 1 waiting to join');

    // Disable Brom while joined: asked first; Cancel changes nothing; confirming removes only Brom.
    await seatButton(session, ids.Brom, 'disable').click();
    await expect(confirmDialog(session).getByTestId('confirm-body')).toHaveText('The player in this seat is disconnected, and nobody can join this seat until you enable it again.');
    await confirmDialog(session).getByTestId('confirm-cancel').click();
    await expect(seatCard(session, ids.Brom).getByTestId('seat-state')).toHaveText('Joined');
    await seatAction(session, ids.Brom, 'disable');
    await expect(b.player.getByTestId('player-status')).toHaveText('Your seat was disabled by the host.', { timeout: 10000 });
    await expect(seatCard(session, ids.Brom).getByTestId('seat-state')).toHaveText('Disabled');
    await expect(waiting.player.getByTestId('player')).toHaveAttribute('data-state', 'ready-to-join');
    await seatButton(session, ids.Brom, 'enable').click();
    await expect(seatCard(session, ids.Brom).getByTestId('seat-state')).toHaveText('Available');
    expect(await chooseSeat(waiting.player, 'Brom')).toBe('Joined as Brom');

    expect(hostErrors).toEqual([]);
    for (const x of [a, b, waiting]) expect(x.errors).toEqual([]);
    await hostContext.close();
    for (const x of [a, b, waiting]) await x.context.close();
  });

  test('a player who drops leaves the seat "Disconnected — seat reserved"; Reset Seat frees it and they join again', async ({ browser }) => {
    const { hostContext, session, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    const seat = await addSeat(session, 'Aria');
    const first = await joined(browser, joinUrl, 'Aria');
    await first.context.close(); // unexpectedly gone: no Leave
    await expect(seatCard(session, seat).getByTestId('seat-state')).toHaveText('Disconnected — seat reserved', { timeout: 15000 });
    expect(await seatState(session, seat)).toBe('claimed-disconnected');
    await expect(seatCard(session, seat).getByTestId('seat-hint')).toHaveText('Reset this seat if the player needs to join again (for example after reloading their page). Live Share does not reconnect players by itself yet.');
    await expect(session.getByTestId('player-count')).toHaveText('1 disconnected seat');
    // Reset Seat is the obvious action (first, highlighted); Kick isn't offered.
    await expect(seatButton(session, seat, 'reset')).toHaveClass(/btn-warning/);
    await expect(seatCard(session, seat).locator('button[data-action]:not([hidden])')).toHaveText(['Rename', 'Disable', 'Reset Seat']); // Reset in its usual place, highlighted
    await expect(seatButton(session, seat, 'kick')).toBeHidden();

    // The player comes back (a new page): the seat is taken until the DM resets it.
    const again = await openPlayer(browser, joinUrl);
    await expect(again.player.getByTestId('join-seat').locator('option', { hasText: 'Aria — taken' })).toBeDisabled();
    await seatButton(session, seat, 'reset').click(); // nobody is connected to it: no question
    await expect(confirmDialog(session)).toBeHidden();
    await expect(seatCard(session, seat).getByTestId('seat-state')).toHaveText('Available');
    await expect(seatButton(session, seat, 'reset')).toBeHidden();
    expect(await chooseSeat(again.player, 'Aria')).toBe('Joined as Aria');
    await expect(seatCard(session, seat).getByTestId('seat-state')).toHaveText('Joined');

    expect(hostErrors).toEqual([]);
    expect(again.errors).toEqual([]);
    await hostContext.close();
    await again.context.close();
  });

  test('password: set, change (joined players stay), remove (a waiting player sees it go); never shown or sent', async ({ browser }) => {
    const { hostContext, session, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    for (const n of ['Aria', 'Brom', 'Cael']) await addSeat(session, n);
    // Validation in place: empty, and over 128 characters (never cut short silently).
    await session.getByTestId('set-password').click();
    await session.getByTestId('save-password').click();
    await expect(session.getByTestId('password-error')).toHaveText('Enter a password, or press Cancel.');
    await session.getByTestId('room-password').fill('x'.repeat(129));
    await session.getByTestId('room-password').press('Enter');
    await expect(session.getByTestId('password-error')).toHaveText('A password can be at most 128 characters.');
    await session.getByTestId('cancel-password').click();
    await expect(session.getByTestId('password-status')).toHaveText('Off');

    await setRoomPassword(session, 'First Pass');
    const a = await joined(browser, joinUrl, 'Aria', { password: 'First Pass' });
    // Change it: Aria stays; a new player needs the new one.
    await setRoomPassword(session, 'Second Pass');
    await expect(a.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    const b = await openPlayer(browser, joinUrl);
    expect(await chooseSeat(b.player, 'Brom', { password: 'First Pass' })).toBe('That password is incorrect.');
    expect(await chooseSeat(b.player, 'Brom', { password: 'Second Pass' })).toBe('Joined as Brom');
    // Remove it while a player waits with the field showing: it goes, live.
    const c = await openPlayer(browser, joinUrl);
    await expect(c.player.getByTestId('join-password')).toBeVisible();
    await removeRoomPassword(session);
    await expect(c.player.getByTestId('join-password')).toBeHidden();
    await expect(session.getByTestId('set-password')).toHaveText('Set Password');
    expect(await chooseSeat(c.player, 'Cael')).toBe('Joined as Cael');

    // Never on the DM's page, in the diagnostics, or in anything sent to a player.
    const page = await session.locator('body').innerText();
    for (const secret of ['First Pass', 'Second Pass']) {
      expect(page).not.toContain(secret);
      expect(await diagnosticsText(session)).not.toContain(secret);
    }
    const sent = await session.evaluate(() => window.__lsSent.filter((m) => typeof m === 'string'));
    expect(sent.some((m) => m.includes('Pass'))).toBe(false);

    expect(hostErrors).toEqual([]);
    for (const x of [a, b, c]) expect(x.errors).toEqual([]);
    await hostContext.close();
    for (const x of [a, b, c]) await x.context.close();
  });

  test('room lock: the waiting player is told and cannot join; the joined player stays; unlocking lets them in', async ({ browser }) => {
    const { hostContext, session, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    await addSeat(session, 'Aria');
    await addSeat(session, 'Brom');
    const inside = await joined(browser, joinUrl, 'Aria');
    const waiting = await openPlayer(browser, joinUrl);
    await setRoomLocked(session, true);
    await expect(session.getByTestId('lock-room')).toHaveText('Unlock Room');
    await expect(waiting.player.getByTestId('join-note')).toHaveText("The room is locked. The DM isn't letting new players join right now.");
    await waiting.player.getByTestId('join-seat').selectOption({ label: 'Brom' });
    await expect(waiting.player.getByTestId('join-room')).toBeDisabled();
    await expect(inside.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    await expect(session.getByTestId('player-count')).toHaveText('1 player joined · 1 waiting to join');
    await setRoomLocked(session, false);
    await expect(waiting.player.getByTestId('join-note')).toHaveText('Choose your seat to join the session.');
    expect(await chooseSeat(waiting.player, 'Brom')).toBe('Joined as Brom');
    expect(hostErrors).toEqual([]);
    await hostContext.close();
    for (const x of [inside, waiting]) await x.context.close();
  });

  test('beforeunload: armed only while a session is live on the owning tab; End disarms it; the Battle Map and a second tab never warn', async ({ browser }) => {
    const context = await browser.newContext();
    const errors = [];
    // Not started: no warning (the page has been used, so the browser would show one if armed).
    const idle = await openSessionPage(context, errors, { start: false });
    await idle.getByText('Troubleshooting details').click();
    const idleDialogs = watchDialogs(idle);
    await idle.close({ runBeforeUnload: true });
    await expect.poll(() => idle.isClosed()).toBe(true);
    expect(idleDialogs).toEqual([]);

    // Live: closing asks first (the browser's own dialog); staying keeps the session.
    const session = await openSessionPage(context, errors);
    const dialogs = watchDialogs(session);
    const host = await openBattleMap(context, session, errors);
    await importMap(host, await makeMap(host), { tokens: [BARD] });
    // A second Live Share tab: never warns (it runs nothing).
    const second = await context.newPage();
    await second.goto(`/live-share${new URL(session.url()).search}`);
    await expect(second.getByTestId('owner-status')).toHaveAttribute('data-state', 'busy');
    await second.getByText('Troubleshooting details').click();
    const secondDialogs = watchDialogs(second);
    await second.close({ runBeforeUnload: true });
    await expect.poll(() => second.isClosed()).toBe(true);
    expect(secondDialogs).toEqual([]);
    // The (saved) Battle Map closes without a Live Share warning.
    await host.getByTestId('bm-live-share-status').click(); // a harmless click, so the browser would ask if armed
    const hostDialogs = watchDialogs(host);
    await host.close({ runBeforeUnload: true });
    await expect.poll(() => host.isClosed()).toBe(true);
    expect(hostDialogs).toEqual([]);

    await session.close({ runBeforeUnload: true });
    await expect.poll(() => dialogs).toEqual(['beforeunload']);
    expect(session.isClosed()).toBe(false);
    await expect(session.getByTestId('host-status')).toHaveText('Live');
    expect((await diagnostics(session)).leaveWarning).toBe(true);

    // Ended: no warning; the page closes.
    await endSession(session);
    expect((await diagnostics(session)).leaveWarning).toBe(false);
    await session.close({ runBeforeUnload: true });
    await expect.poll(() => session.isClosed()).toBe(true);
    expect(dialogs).toEqual(['beforeunload']);
    expect(errors).toEqual([]);
    await context.close();
  });

  test('Open Battle Map: opens one Battle Map, then focuses that same tab (never reloaded, never a second)', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(recordWindowOpens);
    const errors = [];
    const session = await openSessionPage(context, errors);
    const created = countNewPages(context);
    await expect(session.getByTestId('share-status')).toHaveAttribute('data-state', 'none'); // no Battle Map open
    const [opened] = await Promise.all([context.waitForEvent('page'), session.getByTestId('open-battlemap').click()]);
    watchErrors(opened, errors);
    await opened.waitForURL(/\/battlemap/);
    await opened.waitForFunction(() => window.BattleMapLiveShare);
    await opened.evaluate(() => (window.__sameLoad = true));
    await expect(session.getByTestId('host-status')).toHaveText('Live'); // the session tab stayed
    await expect(session.getByTestId('surface')).toHaveAttribute('data-liveness', 'open');
    expect(created()).toBe(1);
    await session.evaluate(() => (window.__firstOpen = window.__lastOpen));
    // Again: the browser hands back the same window (proof that nothing new was created), focused, not reloaded.
    await session.getByTestId('open-battlemap').click();
    await expect.poll(() => session.evaluate(() => window.__opens)).toBe(2);
    expect(await session.evaluate(() => window.__lastOpen === window.__firstOpen)).toBe(true);
    expect(created()).toBe(1);
    expect(await opened.evaluate(() => window.__sameLoad)).toBe(true);
    await expect(session.getByTestId('open-battlemap-note')).toHaveText('');
    // That Battle Map reaches the Live Share page by name: Open Live Share focuses it and opens nothing.
    await expect(liveShareState(opened)).toHaveAttribute('data-state', 'active');
    await opened.getByTestId('bm-open-live-share').click();
    await expect.poll(() => opened.evaluate(() => window.__opens)).toBe(1);
    expect(await opened.evaluate(() => window.__lastOpen === window.opener)).toBe(true);
    expect(created()).toBe(1);
    expect(errors).toEqual([]);
    await context.close();
  });

  test('Open Battle Map with a Battle Map opened separately: no second Battle Map, and the page says so', async ({ browser }) => {
    const context = await browser.newContext();
    const errors = [];
    const session = await openSessionPage(context, errors);
    const existing = await openBattleMap(context, session, errors); // typed in by the DM: not reachable by name
    await expect(session.getByTestId('surface')).toHaveAttribute('data-liveness', 'open');
    const pages = [];
    context.on('page', (p) => pages.push(p));
    await session.getByTestId('open-battlemap').click();
    await expect(session.getByTestId('open-battlemap-note')).toHaveText('The Battle Map is already open in another tab.');
    // The browser's blank window, if any, is closed at once; only the session page and the DM's own
    // Battle Map are left, and the boundary still knows one Battle Map.
    for (const p of pages) await expect.poll(() => p.isClosed()).toBe(true);
    expect(pages.every((p) => !new URL(p.url()).pathname.startsWith('/battlemap'))).toBe(true);
    const left = context.pages().filter((p) => !p.isClosed());
    expect(left.length).toBe(2);
    expect(left.includes(session) && left.includes(existing)).toBe(true);
    await expect(session.getByTestId('surface')).toHaveCount(1);
    // The note outlives the page's own refreshes (the sharing status is rewritten every second).
    await session.getByTestId('share-status').evaluate((el) => (el.textContent = 'stale'));
    await expect(session.getByTestId('share-status')).not.toHaveText('stale', { timeout: 5000 });
    await expect(session.getByTestId('open-battlemap-note')).toHaveText('The Battle Map is already open in another tab.');
    // The Battle Map side: opened on its own, it can't reach the Live Share tab either, and opens no second one.
    const before = context.pages().filter((p) => !p.isClosed()).length;
    await existing.getByTestId('bm-open-live-share').click();
    await expect(existing.getByTestId('bm-live-share-note')).toHaveText('Live Share is already open in another tab of this browser: switch to that tab.');
    await expect.poll(() => context.pages().filter((p) => !p.isClosed()).length).toBe(before);
    await expect(session.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner');
    expect(errors).toEqual([]);
    await context.close();
  });

  test('Open Battle Map with pop-ups blocked: no tab, and a note that stays through the page refreshes', async ({ browser }) => {
    const context = await browser.newContext();
    const errors = [];
    const session = await openSessionPage(context, errors);
    await session.evaluate(() => (window.open = () => null));
    const created = countNewPages(context);
    const status = await session.getByTestId('share-status').textContent();
    await session.getByTestId('open-battlemap').click();
    await expect(session.getByTestId('open-battlemap-note')).toHaveText('Your browser blocked the Battle Map tab. Allow pop-ups and try again.');
    await session.getByTestId('share-status').evaluate((el) => (el.textContent = 'stale'));
    await expect(session.getByTestId('share-status')).toHaveText(status, { timeout: 5000 }); // a refresh ran
    await expect(session.getByTestId('open-battlemap-note')).toHaveText('Your browser blocked the Battle Map tab. Allow pop-ups and try again.');
    expect(created()).toBe(0);
    await expect(session.getByTestId('host-status')).toHaveText('Live');
    expect(errors).toEqual([]);
    await context.close();
  });

  test('Open Live Share with no Live Share page open opens one; a second click opens nothing more', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(recordWindowOpens);
    const errors = [];
    const bm = await context.newPage();
    watchErrors(bm, errors);
    await bm.goto(HOST_PAGE + '&liveshare=1'); // the development panel flag: no Live Share page yet
    await expect(liveShareState(bm)).toHaveAttribute('data-state', 'not-running');
    const created = countNewPages(context);
    const [live] = await Promise.all([context.waitForEvent('page'), bm.getByTestId('bm-open-live-share').click()]);
    await live.waitForURL(/\/live-share/);
    await expect(live.getByTestId('owner-status')).toHaveAttribute('data-state', 'owner');
    await bm.evaluate(() => (window.__firstOpen = window.__lastOpen));
    await bm.getByTestId('bm-open-live-share').click();
    await expect.poll(() => bm.evaluate(() => window.__opens)).toBe(2);
    expect(await bm.evaluate(() => window.__lastOpen === window.__firstOpen)).toBe(true);
    expect(created()).toBe(1);
    expect(errors).toEqual([]);
    await context.close();
  });

  test('the Battle Map panel: running, joined players, this tab sharing, unsaved edits private, another tab sharing', async ({ browser }) => {
    const { hostContext, session, host, hostErrors } = await dm(browser);
    await expect(liveShareState(host)).toHaveText('Live Share is open but not running. Start a session on the Live Share page.');
    const joinUrl = await startRoom(session);
    await expect(liveShareState(host)).toHaveText('Live Share is on · 0 players joined. This tab shares your saved map.');
    await expect(host.getByTestId('bm-live-share-publication')).toHaveText('Players have your last saved map.', { timeout: 15000 });
    await addSeat(session, 'Aria');
    const p = await joined(browser, joinUrl, 'Aria');
    await expect(liveShareState(host)).toHaveText('Live Share is on · 1 player joined. This tab shares your saved map.');
    // No room controls here: those are on the Live Share page.
    for (const label of [/kick/i, /reset/i, /lock/i, /password/i, /end session/i]) await expect(host.locator('#bm-live-share').getByRole('button', { name: label })).toHaveCount(0);
    // An unsaved edit: players keep the last save, and the panel says the edit is private.
    const before = await hostSnapshot(host);
    await addPresetToken(host, 'Fighter');
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect(host.getByTestId('bm-live-share-unsaved')).toBeVisible();
    await expect(host.getByTestId('bm-live-share-unsaved')).toHaveText('You have unsaved edits: they stay private until you save.');
    expect(await hostSnapshot(host)).toEqual(before);
    await save(host);
    await expect(host.getByTestId('bm-live-share-unsaved')).toBeHidden();
    await expect.poll(async () => (await hostSnapshot(host)).revision).toBeGreaterThan(before.revision);
    // A second Battle Map tab: one shares; the other says so and offers "Publish from this tab".
    const tab2 = await openBattleMap(hostContext, session, hostErrors);
    await expect.poll(async () => [await liveShareState(host).getAttribute('data-state'), await liveShareState(tab2).getAttribute('data-state')].sort()).toEqual(['active', 'inactive']);
    const inactive = (await liveShareState(host).getAttribute('data-state')) === 'inactive' ? host : tab2;
    await expect(liveShareState(inactive)).toHaveText("Another Battle Map tab is sharing. Saving here doesn't update players.");
    await expect(inactive.getByTestId('bm-claim-publisher')).toBeVisible();
    await expect(session.getByTestId('share-status')).toContainText('from one of 2 open Battle Map tabs');
    // Closing the Battle Maps: players keep the last map, and the Live Share page says so.
    await host.close();
    await tab2.close();
    await expect(session.getByTestId('share-status')).toHaveText('The Battle Map is closed. Players still see the last map you shared.', { timeout: 15000 });
    await expect(p.player.getByTestId('map-section')).toBeVisible();
    expect(hostErrors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('live updates never disturb the DM: a rename being typed, a password being typed, an open confirmation', async ({ browser }) => {
    const { hostContext, session, host, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    const ids = {};
    for (const n of ['Aria', 'Brom', 'Cael']) ids[n] = await addSeat(session, n);
    const a = await joined(browser, joinUrl, 'Aria');

    // A. A rename in progress while a player joins, the map is saved (a new publication and its
    // background transfer) and a seat changes.
    await seatButton(session, ids.Cael, 'rename').click();
    const rename = seatCard(session, ids.Cael).getByTestId('rename-input');
    await rename.fill('Cael the Quick');
    const b = await joined(browser, joinUrl, 'Brom');
    await importMap(host, await makeMap(host, { width: 900 }), { tokens: [{ ...BARD, x: 300 }] });
    await expect.poll(async () => (await hostSnapshot(host)).map.width).toBe(900);
    await session.waitForTimeout(1500); // a few of the page's own refreshes
    await expect(rename).toBeVisible();
    await expect(rename).toHaveValue('Cael the Quick');
    await rename.focus();
    await rename.press('Enter');
    await expect(seatCard(session, ids.Cael).getByTestId('seat-label')).toHaveText('Cael the Quick');

    // B. A password being typed while a player leaves and the counts change.
    await session.getByTestId('set-password').click();
    await session.getByTestId('room-password').pressSequentially('half-typ');
    await b.player.getByTestId('leave-session').click();
    await expect(session.getByTestId('player-count')).toHaveText('1 player joined', { timeout: 10000 });
    await expect(session.getByTestId('room-password')).toBeFocused();
    await session.getByTestId('room-password').pressSequentially('ed');
    await expect(session.getByTestId('room-password')).toHaveValue('half-typed');
    await session.getByTestId('cancel-password').click();

    // C. A confirmation open while players come and go: it stays, and acts on the seat it named.
    await seatButton(session, ids.Aria, 'kick').click();
    await expect(confirmDialog(session).getByRole('heading')).toHaveText('Kick Aria?');
    const c = await joined(browser, joinUrl, 'Brom');
    await session.waitForTimeout(1200);
    await expect(confirmDialog(session)).toBeVisible();
    await confirmDialog(session).getByTestId('confirm-ok').click();
    await expect(a.player.getByTestId('player-status')).toHaveText('You were removed from the session.', { timeout: 10000 });
    await expect(c.player.getByTestId('player')).toHaveAttribute('data-state', /joined-loading|connected/);
    expect(await seatState(session, ids.Brom)).toBe('claimed');

    expect(hostErrors).toEqual([]);
    await hostContext.close();
    for (const x of [a, b, c]) await x.context.close();
  });

  test('a confirmation never acts on a new occupant: if the seat changed while it was open, nothing is done', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, session, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    const ended = (p) => p.player.evaluate(() => window.__lsLog.filter((m) => m.type === 'session-ended').map((m) => m.reason));
    const REASON = { kick: 'kicked', reset: 'seat-reset', disable: 'seat-disabled' };
    const contexts = [];
    // Every destructive confirmation shares the guard: Kick, Reset Seat and Disable of a joined seat.
    for (const action of ['kick', 'reset', 'disable']) {
      const name = `Seat ${action}`;
      const seat = await addSeat(session, name);
      const first = await joined(browser, joinUrl, name);
      contexts.push(first.context);
      await seatButton(session, seat, action).click();
      await expect(confirmDialog(session)).toBeVisible();
      // While the DM reads it, the first player leaves and another takes the same seat.
      await first.player.getByTestId('leave-session').click();
      await expect.poll(() => seatState(session, seat)).toBe('available');
      const second = await joined(browser, joinUrl, name);
      contexts.push(second.context);
      await expect.poll(() => seatState(session, seat)).toBe('claimed');
      await expect(confirmDialog(session)).toBeVisible(); // the updates didn't close it
      await confirmDialog(session).getByTestId('confirm-ok').click();
      await expect(session.getByTestId('seat-error')).toHaveText('That seat changed while this confirmation was open. Review it and try again.');
      // The new player is untouched: still in the seat, still connected, told nothing.
      await second.player.waitForTimeout(500); // a removal would be sent at once; give it a moment to show
      expect(await seatState(session, seat)).toBe('claimed');
      await expect(second.player.getByTestId('player')).toHaveAttribute('data-state', /joined-loading|connected/);
      expect(await ended(second)).toEqual([]);
      // The DM can act on the current occupant with a new confirmation.
      await seatAction(session, seat, action);
      await expect.poll(() => ended(second), { timeout: 10000 }).toEqual([REASON[action]]);
      await expect(session.getByTestId('seat-error')).toHaveText('');
    }
    expect(hostErrors).toEqual([]);
    await hostContext.close();
    for (const c of contexts) await c.close();
  });

  test('seat buttons never move: the same buttons in the same order through every state; Rename stays Rename under the pointer and focus', async ({ browser }) => {
    const { hostContext, session, hostErrors } = await dm(browser, { start: true });
    const joinUrl = await startRoom(session);
    const seat = await addSeat(session, 'Aria');
    const card = seatCard(session, seat);
    const shown = () => card.locator('button[data-action]:not([hidden])');
    const sameButtons = () => card.evaluate((c) => {
      const now = [...c.querySelectorAll('button[data-seat-id]')];
      if (!window.__buttons) window.__buttons = now;
      return now.length === window.__buttons.length && now.every((b, i) => b === window.__buttons[i]);
    });
    const renameX = async () => (await seatButton(session, seat, 'rename').boundingBox()).x;
    expect(await sameButtons()).toBe(true);
    const x = await renameX();
    await expect(shown()).toHaveText(['Rename', 'Disable']);

    // Available -> Joined, while the pointer is pressed on Rename: the release still lands on Rename.
    const rename = await seatButton(session, seat, 'rename').boundingBox();
    await session.mouse.move(rename.x + rename.width / 2, rename.y + rename.height / 2);
    await session.mouse.down();
    const p = await joined(browser, joinUrl, 'Aria');
    await expect(card).toHaveAttribute('data-state', 'claimed');
    await session.mouse.up();
    await expect(card.getByTestId('rename-input')).toBeVisible(); // Rename's editor, not a removal
    await expect(confirmDialog(session)).toBeHidden();
    await card.getByTestId('rename-cancel').click();
    await expect(shown()).toHaveText(['Rename', 'Disable', 'Reset Seat', 'Kick']);
    expect(await sameButtons()).toBe(true);
    expect(await renameX()).toBe(x);

    // Joined -> Disconnected, reserved, while Rename has keyboard focus: it is still Rename.
    await seatButton(session, seat, 'rename').focus();
    await p.context.close();
    await expect(card).toHaveAttribute('data-state', 'claimed-disconnected', { timeout: 15000 });
    await expect(seatButton(session, seat, 'rename')).toBeFocused();
    await expect(shown()).toHaveText(['Rename', 'Disable', 'Reset Seat']);
    await expect(seatButton(session, seat, 'reset')).toHaveClass(/btn-warning/);
    expect(await sameButtons()).toBe(true);
    expect(await renameX()).toBe(x);
    await session.keyboard.press('Enter');
    await expect(card.getByTestId('rename-input')).toBeFocused(); // Enter opened Rename, not Reset Seat
    expect(await seatState(session, seat)).toBe('claimed-disconnected');

    // Reserved -> Available (Reset Seat) with the rename editor open and typed in: it survives.
    await card.getByTestId('rename-input').fill('Aria the Bold');
    await seatButton(session, seat, 'reset').click();
    await expect(card).toHaveAttribute('data-state', 'available');
    await expect(card.getByTestId('rename-input')).toHaveValue('Aria the Bold');
    await card.getByTestId('rename-cancel').click();
    await expect(shown()).toHaveText(['Rename', 'Disable']);
    // Available -> Disabled: the same button now says Enable.
    await seatButton(session, seat, 'disable').click();
    await expect(card).toHaveAttribute('data-state', 'disabled');
    await expect(shown()).toHaveText(['Rename', 'Enable']);
    expect(await sameButtons()).toBe(true);
    expect(await renameX()).toBe(x);
    expect(hostErrors).toEqual([]);
    await hostContext.close();
  });

  test('narrow screen: the page fits, and seat actions wrap', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const errors = [];
    const session = await openSessionPage(context, errors);
    await addSeat(session, 'A seat with a rather long name for tests'); // 40 characters
    await session.getByTestId('reveal-link').click();
    const overflow = await session.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(session.getByTestId('end-session')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });
});
