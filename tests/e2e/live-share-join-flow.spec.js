// Live Share Milestone 5B.3: the product player join flow, driven through the visible controls (the
// session page's seat / password / lock controls for the DM, the player page's join form for players).
// The wire-level admission guarantees are proven in live-share-admission.spec.js; these tests prove
// what a player sees and can do.
//
// Navigation (planning doc §11: Toolbox features open in a new tab rather than replacing the Live
// Share page): not applicable, the player page has no site navigation.
import { test, expect } from '@playwright/test';
import {
  openHost,
  openSessionPage,
  openBattleMap,
  hostSnapshot,
  importMap,
  makeMap,
  watchErrors,
  recordPlayerTraffic,
  startRoom,
  addSeat,
  chooseSeat,
  seatButton,
  seatAction,
  seatRow,
  renameSeat,
  setRoomPassword,
  removeRoomPassword,
  setRoomLocked,
  playerState,
  diagnostics,
} from '../helpers/battlemap-live-share.js';

const BARD = { id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true };
const ADMISSION = new Set(['admission-state', 'join-result', 'session-ended']);

// Every presentation state the player page passes through, in order.
function recordPlayerStates() {
  window.__states = [];
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('ls-player');
    window.__states.push(el.dataset.state);
    new MutationObserver(() => {
      if (window.__states.at(-1) !== el.dataset.state) window.__states.push(el.dataset.state);
    }).observe(el, { attributes: true, attributeFilter: ['data-state'] });
  });
}

// Test-only: while window.__holdRoom is set, the page's channel holds back the host's admission-state
// messages (everything else goes through); __releaseRoom() delivers them.
function holdRoomUpdates() {
  window.__holdRoom = false;
  const held = [];
  let deliver = null;
  window.__releaseRoom = () => {
    window.__holdRoom = false;
    for (const e of held.splice(0)) deliver(e);
  };
  const desc = Object.getOwnPropertyDescriptor(RTCDataChannel.prototype, 'onmessage');
  Object.defineProperty(RTCDataChannel.prototype, 'onmessage', {
    configurable: true,
    get() {
      return desc.get.call(this);
    },
    set(fn) {
      deliver = fn;
      desc.set.call(this, (e) => (window.__holdRoom && typeof e.data === 'string' && e.data.includes('"admission-state"') ? held.push(e) : fn(e)));
    },
  });
}

async function openPlayer(browser, joinUrl, ...scripts) {
  const context = await browser.newContext();
  for (const script of scripts) await context.addInitScript(script);
  await context.addInitScript(recordPlayerTraffic);
  await context.addInitScript(recordPlayerStates);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  return { context, player, errors };
}
// Connected and shown the join form.
async function joinForm(browser, joinUrl) {
  const p = await openPlayer(browser, joinUrl);
  await expect(p.player.getByTestId('join-panel')).toBeVisible({ timeout: 20000 });
  return p;
}

const states = (player) => player.evaluate(() => window.__states);
const seatOption = (player, label) => player.getByTestId('join-seat').locator('option').filter({ hasText: new RegExp(`^${label}$`) });
const selectedSeat = (player) => player.getByTestId('join-seat').evaluate((s) => (s.selectedIndex > 0 ? s.options[s.selectedIndex].textContent : null));
const playerLog = (player) => player.evaluate(() => window.__lsLog);
const seatState = (session, seatId) => session.locator(`[data-testid="seat"][data-seat-id="${seatId}"]`).getAttribute('data-state');
// Nothing of the map is in the page: no section shown, nothing drawn, no image.
async function expectNoMapShown(player) {
  await expect(player.getByTestId('map-section')).toBeHidden();
  expect(await player.locator('[data-testid="player-map"] *').count()).toBe(0);
  expect(await player.locator('.ls-token, .ls-background-image').count()).toBe(0);
}

// A DM with a saved map and a running room.
async function dmWithMap(browser) {
  const dm = await openHost(browser);
  await importMap(dm.host, await makeMap(dm.host), { tokens: [BARD] });
  await expect.poll(async () => (await hostSnapshot(dm.host))?.background, { timeout: 15000 }).not.toBeNull();
  return { ...dm, joinUrl: await startRoom(dm.session) };
}

test.describe('Live Share player join flow (5B.3)', () => {
  test('a player joins through the join form: connecting, choosing a seat, Join Room, loading, then the map', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    await addSeat(session, 'Aria');
    await addSeat(session, 'Brom');
    const p = await joinForm(browser, joinUrl);
    // The join form: seats by name, no password field (none is set), Join Room only once a seat is chosen.
    await expect(p.player.getByTestId('join-note')).toHaveText('Choose your seat to join the session.');
    await expect(p.player.getByLabel('Seat')).toBeVisible();
    await expect(p.player.getByTestId('join-password')).toBeHidden();
    await expect(p.player.getByTestId('join-room')).toBeDisabled();
    await expect(p.player.getByTestId('player-status')).toHaveText('Connected to host');
    await expectNoMapShown(p.player);
    expect((await playerLog(p.player)).every((m) => ADMISSION.has(m.type))).toBe(true);

    await p.player.getByLabel('Seat').selectOption({ label: 'Aria' });
    // Choosing reserves nothing: the seat is still available on the host.
    await expect(seatRow(session, 'Aria')).toHaveAttribute('data-state', 'available');
    await expect(p.player.getByTestId('join-room')).toBeEnabled();
    await p.player.getByTestId('join-room').click();
    await expect(p.player.getByTestId('join-status')).toHaveText('Joined as Aria');
    await expect(p.player.getByTestId('join-status')).toBeFocused();
    await expect(p.player.getByTestId('join-panel')).toBeHidden();
    await expect(p.player.getByTestId('map-section')).toBeVisible({ timeout: 15000 });
    await expect(p.player.locator('.ls-background-image')).toHaveCount(1, { timeout: 15000 });
    await expect(p.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    await expect(p.player.getByTestId('map-waiting')).toBeHidden();
    await expect(p.player.getByTestId('leave-session')).toBeEnabled();
    expect(await states(p.player)).toEqual(['connecting', 'waiting-for-room', 'ready-to-join', 'joining', 'joined-loading', 'connected']);
    // Normal view: no diagnostics on show.
    await expect(p.player.getByTestId('diagnostics')).toBeHidden();

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('no seats yet: the player waits, connected, and can join as soon as the DM adds one', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const p = await joinForm(browser, joinUrl);
    await expect(p.player.getByTestId('join-note')).toHaveText('No seats are available yet. Waiting for the host…');
    await expect(p.player.getByTestId('join-seat').locator('option')).toHaveCount(1); // only "Choose a seat…"
    await expect(p.player.getByTestId('join-room')).toBeDisabled();
    await p.player.getByTestId('join-room').evaluate((b) => b.closest('form').requestSubmit()); // a forced submit does nothing
    expect((await playerLog(p.player)).filter((m) => m.type === 'join-result')).toEqual([]);
    await expect(p.player.getByTestId('player-status')).toHaveText('Connected to host');

    await addSeat(session, 'Cael');
    await expect(seatOption(p.player, 'Cael')).toBeEnabled();
    await expect(p.player.getByTestId('join-note')).toHaveText('Choose your seat to join the session.');
    expect(await chooseSeat(p.player, 'Cael')).toBe('Joined as Cael');

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('password: shown only when required, a wrong one keeps the player on the form, the right one admits and is cleared', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    await addSeat(session, 'Aria');
    const p = await joinForm(browser, joinUrl);
    await expect(p.player.getByTestId('join-password')).toBeHidden();
    // The DM sets a password while the player waits: the field appears, labelled.
    await setRoomPassword(session, 'Open Sesame ');
    await expect(p.player.getByLabel('Password')).toBeVisible();
    await expect(p.player.getByLabel('Password')).toHaveAttribute('type', 'password');

    await p.player.getByLabel('Seat').selectOption({ label: 'Aria' });
    await expect(p.player.getByTestId('join-room')).toBeDisabled(); // a password is needed first
    await p.player.getByLabel('Password').fill('open sesame'); // wrong: case and the trailing space matter
    await p.player.getByTestId('join-room').click();
    await expect(p.player.getByTestId('join-error')).toHaveText('That password is incorrect.');
    await expect(p.player.getByTestId('player')).toHaveAttribute('data-state', 'join-rejected');
    await expect(p.player.getByLabel('Password')).toBeFocused();
    await expect(p.player.getByLabel('Password')).toHaveValue('open sesame'); // kept, to correct it
    expect(await selectedSeat(p.player)).toBe('Aria');
    await expectNoMapShown(p.player);

    await p.player.getByLabel('Password').fill('Open Sesame ');
    await p.player.getByTestId('join-room').click();
    await expect(p.player.getByTestId('join-status')).toHaveText('Joined as Aria');
    await expect(p.player.getByTestId('join-error')).toHaveText('');
    expect(await p.player.getByTestId('join-password').inputValue()).toBe(''); // not left in the page
    await expect(p.player.getByTestId('map-section')).toBeVisible({ timeout: 15000 });
    expect(JSON.stringify(await diagnostics(p.player))).not.toContain('Sesame');

    // The password is removed while another player waits with one typed: the field goes, emptied.
    const q = await joinForm(browser, joinUrl);
    await q.player.getByLabel('Password').fill('half typed');
    await removeRoomPassword(session);
    await expect(q.player.getByTestId('join-password')).toBeHidden();
    expect(await q.player.getByTestId('join-password').inputValue()).toBe('');

    expect(hostErrors).toEqual([]);
    for (const x of [p, q]) expect(x.errors).toEqual([]);
    await hostContext.close();
    for (const x of [p, q]) await x.context.close();
  });

  test('room lock: a waiting player sees it at once and cannot join; joined players stay; unlocking lets them in', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    await addSeat(session, 'Aria');
    await addSeat(session, 'Brom');
    const inside = await joinForm(browser, joinUrl);
    expect(await chooseSeat(inside.player, 'Aria')).toBe('Joined as Aria');
    const waiting = await joinForm(browser, joinUrl);
    await waiting.player.getByLabel('Seat').selectOption({ label: 'Brom' });
    await expect(waiting.player.getByTestId('join-room')).toBeEnabled();

    await setRoomLocked(session, true);
    await expect(waiting.player.getByTestId('join-note')).toHaveText("The room is locked. The DM isn't letting new players join right now.");
    await expect(waiting.player.getByTestId('join-room')).toBeDisabled();
    expect(await selectedSeat(waiting.player)).toBe('Brom'); // the choice is kept for later
    await expect(inside.player.getByTestId('join-status')).toHaveText('Joined as Aria');
    await expect(inside.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');

    await setRoomLocked(session, false);
    await expect(waiting.player.getByTestId('join-note')).toHaveText('Choose your seat to join the session.');
    await expect(waiting.player.getByTestId('join-room')).toBeEnabled();
    await waiting.player.getByTestId('join-room').click();
    await expect(waiting.player.getByTestId('join-status')).toHaveText('Joined as Brom');

    expect(hostErrors).toEqual([]);
    for (const x of [inside, waiting]) expect(x.errors).toEqual([]);
    await hostContext.close();
    for (const x of [inside, waiting]) await x.context.close();
  });

  test('two players press Join Room for the same seat: one gets it; the other stays on the form, is told, and joins another seat', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const seatA = await addSeat(session, 'Aria');
    await addSeat(session, 'Brom');
    const winner = await joinForm(browser, joinUrl);
    // The loser's view goes stale, as in a real near-simultaneous race: the host's room updates are
    // held back on its page (test-only), so "Aria" still looks free when it presses Join Room.
    const loser = await openPlayer(browser, joinUrl, holdRoomUpdates);
    await expect(loser.player.getByTestId('join-panel')).toBeVisible({ timeout: 20000 });
    for (const x of [winner, loser]) await x.player.getByLabel('Seat').selectOption({ label: 'Aria' });
    await loser.player.evaluate(() => (window.__holdRoom = true));
    await winner.player.getByTestId('join-room').click();
    await expect(winner.player.getByTestId('join-status')).toHaveText('Joined as Aria');
    await expect(loser.player.getByTestId('join-room')).toBeEnabled(); // stale: Aria looks free
    await loser.player.getByTestId('join-room').click();
    // The host is the authority: seat-unavailable. The loser stays on the form, with no map.
    await expect(loser.player.getByTestId('join-error')).toHaveText('That seat is no longer available. Choose another seat. If it was your seat, ask the DM to reset it.');
    await expect(loser.player.getByTestId('player')).toHaveAttribute('data-state', 'join-rejected');
    expect(await selectedSeat(loser.player)).toBeNull();
    await expectNoMapShown(loser.player);
    expect(await seatState(session, seatA)).toBe('claimed');
    // Its seat list catches up once the held updates arrive; then it joins another seat.
    await loser.player.evaluate(() => window.__releaseRoom());
    await expect(seatOption(loser.player, 'Aria — taken')).toBeDisabled();
    expect(await chooseSeat(loser.player, 'Brom')).toBe('Joined as Brom');
    await expect(winner.player.getByTestId('map-section')).toBeVisible({ timeout: 15000 });

    expect(hostErrors).toEqual([]);
    for (const x of [winner, loser]) expect(x.errors).toEqual([]);
    await hostContext.close();
    for (const x of [winner, loser]) await x.context.close();
  });

  test('a reloaded player is not leaving: its seat stays reserved, it is told to ask the DM, and a reset frees it', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const seatA = await addSeat(session, 'Aria');
    const p = await joinForm(browser, joinUrl);
    expect(await chooseSeat(p.player, 'Aria')).toBe('Joined as Aria');
    await expect(p.player.getByTestId('map-section')).toBeVisible({ timeout: 15000 });

    await p.player.reload(); // a reload: the page goes, no Leave is sent
    await expect.poll(() => seatState(session, seatA), { timeout: 15000 }).toBe('claimed-disconnected');
    await expect(p.player.getByTestId('join-panel')).toBeVisible({ timeout: 20000 });
    await expect(seatOption(p.player, 'Aria — taken')).toBeDisabled();
    await expect(p.player.getByTestId('join-seat-help')).toBeVisible();
    await expect(p.player.getByTestId('join-seat-help')).toHaveText('Taken seats are in use. If one is yours (for example after reloading this page), ask the DM to reset it, then join again.');
    await expect(p.player.getByTestId('join-note')).toHaveText('Every seat is taken right now. Waiting for the host…');
    await expect(p.player.getByTestId('join-room')).toBeDisabled();

    await seatAction(session, seatA, 'reset');
    await expect(seatOption(p.player, 'Aria')).toBeEnabled();
    await expect(p.player.getByTestId('join-seat-help')).toBeHidden();
    expect(await chooseSeat(p.player, 'Aria')).toBe('Joined as Aria');
    // No reclaim was attempted: the page never sent a rejoin-request (it keeps no credential).
    expect(await p.player.evaluate(() => window.__lsLog.filter((m) => m.type === 'join-result').map((m) => m.accepted))).toEqual([true]);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('Leave Session frees the seat and says so; it is the only way a seat is released by the player', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const seatA = await addSeat(session, 'Aria');
    const p = await joinForm(browser, joinUrl);
    expect(await chooseSeat(p.player, 'Aria')).toBe('Joined as Aria');
    await p.player.getByTestId('leave-session').click();
    await expect(p.player.getByTestId('player-status')).toHaveText('You left the session.', { timeout: 10000 });
    await expect(p.player.getByTestId('player')).toHaveAttribute('data-state', 'session-ended');
    await expect.poll(() => seatState(session, seatA)).toBe('available');
    expect((await playerLog(p.player)).filter((m) => m.type === 'session-ended').map((m) => m.reason)).toEqual(['left']);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('removed or ended: each player is told why (kick, reset, disable, End)', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const names = ['Aria', 'Brom', 'Cael', 'Dara'];
    const ids = {};
    for (const n of names) ids[n] = await addSeat(session, n);
    const players = {};
    for (const n of names) {
      players[n] = await joinForm(browser, joinUrl);
      expect(await chooseSeat(players[n].player, n)).toBe(`Joined as ${n}`);
    }
    await seatAction(session, ids.Aria, 'kick');
    await seatAction(session, ids.Brom, 'reset');
    await seatAction(session, ids.Cael, 'disable');
    await expect(players.Aria.player.getByTestId('player-status')).toHaveText('You were removed from the session.', { timeout: 10000 });
    await expect(players.Brom.player.getByTestId('player-status')).toHaveText('Your seat was reset by the host.', { timeout: 10000 });
    await expect(players.Cael.player.getByTestId('player-status')).toHaveText('Your seat was disabled by the host.', { timeout: 10000 });
    await expect(players.Dara.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    await session.getByTestId('end-session').click();
    await session.getByTestId('confirm-ok').click();
    await expect.poll(async () => (await playerLog(players.Dara.player)).filter((m) => m.type === 'session-ended').map((m) => m.reason), { timeout: 10000 }).toEqual(['ended']);
    await expect(players.Dara.player.getByTestId('player-status')).toHaveText('The host ended the session.', { timeout: 10000 });
    for (const n of names) await expect(players[n].player.getByTestId('player')).toHaveAttribute('data-state', 'session-ended');
    // Each was told by the host's own message, not inferred from a closed connection.
    for (const [n, reason] of [['Aria', 'kicked'], ['Brom', 'seat-reset'], ['Cael', 'seat-disabled'], ['Dara', 'ended']]) {
      expect((await playerLog(players[n].player)).filter((m) => m.type === 'session-ended').map((m) => m.reason)).toEqual([reason]);
      expect((await diagnostics(players[n].player)).sessionEnded).toBe(reason); // the page acted on that message
    }

    expect(hostErrors).toEqual([]);
    for (const n of names) expect(players[n].errors).toEqual([]);
    await hostContext.close();
    for (const n of names) await players[n].context.close();
  });

  test('live room changes while a player fills in the form keep its choice, its typing and its focus', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const seatA = await addSeat(session, 'Aria');
    const seatB = await addSeat(session, 'Brom');
    await addSeat(session, 'Cael');
    await setRoomPassword(session, 'pw');
    const p = await joinForm(browser, joinUrl);
    await p.player.getByLabel('Seat').selectOption({ label: 'Brom' });
    await p.player.getByLabel('Password').fill('typing');
    await expect(p.player.getByLabel('Password')).toBeFocused();

    // Another seat is renamed, another player takes a third seat, the room locks and unlocks.
    await renameSeat(session, seatA, 'Aria the Bold');
    await expect(seatOption(p.player, 'Aria the Bold')).toBeEnabled();
    const other = await joinForm(browser, joinUrl);
    expect(await chooseSeat(other.player, 'Cael', { password: 'pw' })).toBe('Joined as Cael');
    await expect(seatOption(p.player, 'Cael — taken')).toBeDisabled();
    await setRoomLocked(session, true);
    await expect(p.player.getByTestId('join-room')).toBeDisabled();
    await setRoomLocked(session, false);
    await expect(p.player.getByTestId('join-room')).toBeEnabled();
    // None of that touched the form.
    await expect(p.player.getByLabel('Password')).toBeFocused();
    await expect(p.player.getByLabel('Password')).toHaveValue('typing');
    expect(await selectedSeat(p.player)).toBe('Brom');
    await expect(p.player.getByTestId('join-error')).toHaveText('');

    // The chosen seat is taken by someone else: the choice is cleared, and the player is told.
    const thief = await joinForm(browser, joinUrl);
    expect(await chooseSeat(thief.player, 'Brom', { password: 'pw' })).toBe('Joined as Brom');
    await expect(p.player.getByTestId('join-error')).toHaveText('The seat you chose was just taken. Choose another seat.');
    expect(await selectedSeat(p.player)).toBeNull();
    await expect(p.player.getByTestId('join-room')).toBeDisabled();
    await expect(p.player.getByLabel('Password')).toHaveValue('typing');
    expect(await seatState(session, seatB)).toBe('claimed');

    expect(hostErrors).toEqual([]);
    for (const x of [p, other, thief]) expect(x.errors).toEqual([]);
    await hostContext.close();
    for (const x of [p, other, thief]) await x.context.close();
  });

  test('no map shared yet: a joined player is told so, then sees the map once the DM shares one', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostErrors = [];
    const session = await openSessionPage(hostContext, hostErrors);
    const joinUrl = await startRoom(session);
    await addSeat(session, 'Aria');
    const p = await joinForm(browser, joinUrl);
    expect(await chooseSeat(p.player, 'Aria')).toBe('Joined as Aria');
    await expect(p.player.getByTestId('map-waiting')).toHaveText("The DM isn't sharing a map yet. It will appear here when they do.");
    await expect(p.player.getByTestId('player')).toHaveAttribute('data-state', 'connected');
    await expect(p.player.getByTestId('map-section')).toBeHidden();

    const bm = await openBattleMap(hostContext, session, hostErrors);
    await importMap(bm, await makeMap(bm), { tokens: [BARD] });
    await expect(p.player.getByTestId('map-section')).toBeVisible({ timeout: 15000 });
    await expect(p.player.getByTestId('map-waiting')).toBeHidden();

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('a host speaking another protocol version gets a clear "different version" message', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const p = await joinForm(browser, joinUrl);
    // A message as a newer build of the Toolbox would send it, down the real channel.
    await session.evaluate(() => window.__lsChannels[0].send(JSON.stringify({ v: 2, type: 'admission-state', locked: false, passwordRequired: false, seats: [] })));
    await expect(p.player.getByTestId('player-status')).toHaveText("The host is using a different version of The DM's Toolbox. Reload this page and try again.");
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });
});
