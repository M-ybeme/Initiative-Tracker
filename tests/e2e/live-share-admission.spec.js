// Live Share Milestone 5B.2: admission enforced on real peers, several players at once. The production
// topology (the session page owning the room, the Battle Map publishing its saved map to it) with real
// player pages over WebRTC through the local relay. The DM acts on the session page's seat controls,
// players on the player page's join controls; raw protocol messages go down the real data channel.
import { test, expect } from '@playwright/test';
import {
  openHost,
  sessionOf,
  hostSnapshot,
  battleMapSnapshot,
  diagnostics,
  save,
  importMap,
  makeMap,
  makeTokenPng,
  watchErrors,
  recordPlayerTraffic,
  startRoom,
  addSeat,
  chooseSeat,
  joinSeat,
  seatButton,
} from '../helpers/battlemap-live-share.js';

const BARD = { id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true };
const ADMISSION = new Set(['admission-state', 'join-result', 'session-ended']);
const playerRevision = async (player) => Number(await player.getByTestId('player-map').getAttribute('data-revision'));
const playerLog = (player) => player.evaluate(() => window.__lsLog);
const sendRaw = (player, msg) => player.evaluate((m) => window.__lsPlayerChannel.send(typeof m === 'string' ? m : JSON.stringify(m)), msg);
const seatState = (session, seatId) => session.locator(`[data-testid="seat"][data-seat-id="${seatId}"]`).getAttribute('data-state');
const playerCount = (session) => session.getByTestId('player-count');
// The host's parsed sends (every channel of the session page).
const hostSent = async (session) => (await session.evaluate(() => window.__lsSent.filter((m) => typeof m === 'string'))).map((t) => JSON.parse(t));

// A DM with a saved map that has a background and custom token art, and a running room. moveAndSave()
// saves a structured change (the bard moves; same background and art), a new revision for players.
async function dmWithMap(browser) {
  const dm = await openHost(browser);
  const art = `data:image/png;base64,${(await makeTokenPng(dm.host)).toString('base64')}`;
  const mapUrl = await makeMap(dm.host);
  const hero = { id: 't_hero', name: 'Hero', imgSrc: art, x: 300, y: 100, w: 50, h: 50, rot: 0 };
  let moves = 0;
  dm.moveAndSave = async () => {
    const before = (await hostSnapshot(dm.host)).revision;
    await importMap(dm.host, mapUrl, { tokens: [{ ...BARD, x: BARD.x + 50 * ++moves }, hero] });
    await expect.poll(async () => (await hostSnapshot(dm.host)).revision, { timeout: 15000 }).toBeGreaterThan(before);
    return hostSnapshot(dm.host);
  };
  dm.mapUrl = mapUrl;
  await importMap(dm.host, mapUrl, { tokens: [BARD, hero] });
  await expect.poll(async () => (await hostSnapshot(dm.host))?.background, { timeout: 15000 }).not.toBeNull();
  await expect.poll(async () => (await hostSnapshot(dm.host)).tokens[1].assetId, { timeout: 15000 }).toMatch(/^[0-9a-f]{64}$/);
  const joinUrl = await startRoom(dm.session);
  return { ...dm, joinUrl, snapshot: await hostSnapshot(dm.host) };
}

// A player page connected to the room, not joined.
async function connectPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  await context.addInitScript(recordPlayerTraffic);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  await expect(player.getByTestId('join-panel')).toBeVisible();
  return { context, player, errors };
}

async function joinedPlayer(browser, joinUrl, name) {
  const p = await connectPlayer(browser, joinUrl);
  await joinSeat(p.player, joinUrl, { name });
  return p;
}

// What a player has been sent, by type, from the start.
const receivedTypes = async (player) => (await playerLog(player)).map((m) => m.type);

test.describe('Live Share admission on real peers (5B.2)', () => {
  test('an unadmitted player receives no map, background, token art or asset ids until it joins', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, session, hostErrors, joinUrl, snapshot, moveAndSave } = await dmWithMap(browser);
    await addSeat(session, 'Aria');
    const p = await connectPlayer(browser, joinUrl);
    // It waits; the DM saves a change meanwhile (a new revision is committed and sent to admitted players).
    await moveAndSave();
    await expect.poll(async () => (await hostSnapshot(host)).revision).toBeGreaterThan(snapshot.revision);
    // Try to fetch the map's assets by id, unadmitted.
    await sendRaw(p.player, { v: 1, type: 'asset-request', assetIds: [snapshot.background.assetId, snapshot.tokens[1].assetId] });
    await p.player.waitForTimeout(1500);

    const before = await playerLog(p.player);
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((m) => ADMISSION.has(m.type))).toBe(true); // no snapshot, meta, abort or chunk
    expect(JSON.stringify(before)).not.toContain(snapshot.background.assetId);
    await expect(p.player.getByTestId('map-section')).toBeHidden();
    // On the host: nothing gameplay was sent at all, and the asset request was refused unread.
    const sent = await hostSent(session);
    expect(sent.every((m) => ADMISSION.has(m.type))).toBe(true);
    expect(JSON.stringify(sent)).not.toMatch(/assetId|tokens|"map"|fog/);
    const d = await diagnostics(host);
    expect(d.snapshots).toMatchObject({ snapshotsSent: 0 });
    expect(d.assets).toMatchObject({ requests: 0, sent: 0 });
    expect(d.players).toMatchObject({ admitted: 0, waiting: 1, messagesRefused: 1, sendsBlocked: 0 });
    await expect(playerCount(session)).toHaveText('0 joined · 1 connected, not joined');
    await expect(host.getByTestId('bm-live-share-status')).toContainText('with 0 players');

    // Joining: only now the map arrives, then its background and art.
    expect(await chooseSeat(p.player, 'Aria')).toBe('Joined as Aria');
    await expect.poll(() => playerRevision(p.player), { timeout: 15000 }).toBe((await hostSnapshot(host)).revision);
    await expect(p.player.locator('.ls-background-image')).toHaveCount(1, { timeout: 15000 });
    await expect(p.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 15000 });
    const types = await receivedTypes(p.player);
    const firstGameplay = types.findIndex((t) => !ADMISSION.has(t));
    expect(types.slice(0, firstGameplay).at(-1)).toBe('join-result');
    expect(types.slice(firstGameplay, firstGameplay + 2)).toEqual(['session-state', 'surface-snapshot']); // whether a map is shared, then the map
    await expect(playerCount(session)).toHaveText('1 joined · 0 connected, not joined');
    await expect(host.getByTestId('bm-live-share-status')).toContainText('with 1 player.');

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('three players on three seats get the same map and their own assets; a late joiner and a closed Battle Map change nothing', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, session, hostErrors, joinUrl, moveAndSave } = await dmWithMap(browser);
    const players = [];
    for (const name of ['Aria', 'Brom', 'Cael']) players.push(await joinedPlayer(browser, joinUrl, name));
    const committed = await hostSnapshot(host);
    for (const p of players) {
      await expect.poll(() => playerRevision(p.player), { timeout: 15000 }).toBe(committed.revision);
      await expect(p.player.locator('.ls-background-image')).toHaveCount(1, { timeout: 15000 });
      await expect(p.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 15000 });
      // Each asked for and got the assets itself.
      expect((await playerLog(p.player)).filter((m) => m.type === 'asset-meta').length).toBe(2);
    }
    await expect(playerCount(session)).toHaveText('3 joined · 0 connected, not joined');
    await expect(host.getByTestId('bm-live-share-status')).toContainText('with 3 players.');
    const seats = session.getByTestId('seat');
    await expect(seats).toHaveCount(3);
    for (const s of await seats.all()) await expect(s).toHaveAttribute('data-state', 'claimed');

    // A save reaches all three.
    await moveAndSave();
    const next = await hostSnapshot(host);
    expect(next.revision).toBe(committed.revision + 1);
    for (const p of players) await expect.poll(() => playerRevision(p.player), { timeout: 15000 }).toBe(next.revision);

    // The Battle Map closes: the players keep the map; a late joiner still gets it, with its assets.
    await host.close();
    const late = await joinedPlayer(browser, joinUrl, 'Dara');
    await expect.poll(() => playerRevision(late.player), { timeout: 15000 }).toBe(next.revision);
    await expect(late.player.locator('.ls-background-image')).toHaveCount(1, { timeout: 15000 });
    await expect(late.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 15000 });
    for (const p of players) await expect(p.player.getByTestId('map-status')).toHaveText(`Live — revision ${next.revision}`);
    await expect(playerCount(session)).toHaveText('4 joined · 0 connected, not joined');

    expect(hostErrors).toEqual([]);
    for (const p of [...players, late]) expect(p.errors).toEqual([]);
    await hostContext.close();
    for (const p of [...players, late]) await p.context.close();
  });

  test('two players asking for the same seat at once: exactly one gets it; the other sees no map and takes another seat', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const seatA = await addSeat(session, 'Aria');
    await addSeat(session, 'Brom');
    const one = await connectPlayer(browser, joinUrl);
    const two = await connectPlayer(browser, joinUrl);
    await expect(two.player.getByTestId('join-seat').locator('option:not([value=""])')).toHaveCount(2);
    // Both requests leave at (nearly) the same moment, down the real channels.
    await Promise.all([sendRaw(one.player, { v: 1, type: 'join-request', seatId: seatA }), sendRaw(two.player, { v: 1, type: 'join-request', seatId: seatA })]);
    const results = async (p) => (await playerLog(p.player)).filter((m) => m.type === 'join-result');
    await expect.poll(async () => (await results(one)).length + (await results(two)).length, { timeout: 10000 }).toBe(2);
    const outcomes = [(await results(one))[0], (await results(two))[0]];
    expect(outcomes.filter((r) => r.accepted).length).toBe(1);
    expect(outcomes.filter((r) => !r.accepted)).toEqual([{ type: 'join-result', accepted: false, reason: 'seat-unavailable' }].map((r) => expect.objectContaining(r)));
    const [winner, loser] = outcomes[0].accepted ? [one, two] : [two, one];
    await expect.poll(() => playerRevision(winner.player), { timeout: 15000 }).toBeGreaterThan(0);
    expect(await seatState(session, seatA)).toBe('claimed');
    await expect(session.getByTestId('player-count')).toHaveText('1 joined · 1 connected, not joined');
    // The loser: no gameplay, its seat list shows the seat taken, and it joins the other one.
    expect((await playerLog(loser.player)).every((m) => ADMISSION.has(m.type))).toBe(true);
    await expect(loser.player.getByTestId('join-seat').locator('option', { hasText: 'Aria — taken' })).toBeDisabled();
    expect(await chooseSeat(loser.player, 'Brom')).toBe('Joined as Brom');
    await expect.poll(() => playerRevision(loser.player), { timeout: 15000 }).toBe(await playerRevision(winner.player));

    expect(hostErrors).toEqual([]);
    expect(one.errors).toEqual([]);
    expect(two.errors).toEqual([]);
    await hostContext.close();
    await one.context.close();
    await two.context.close();
  });

  test('password and lock on real peers: wrong passwords claim nothing and throttle; a lock refuses even the right one; a valid credential still reclaims', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const seatA = await addSeat(session, 'Aria');
    await addSeat(session, 'Brom');
    await addSeat(session, 'Cael');
    await session.getByTestId('room-password').fill('open sesame');
    await session.getByTestId('set-password').click();
    await expect(session.getByTestId('password-status')).toHaveText('A password is required to join.');

    // Aria joins with the right password; the password never reaches a player.
    const aria = await connectPlayer(browser, joinUrl);
    await expect(aria.player.getByTestId('join-password')).toBeVisible();
    expect(await chooseSeat(aria.player, 'Aria', { password: 'open sesame' })).toBe('Joined as Aria');
    const ariaCredential = (await hostSent(session)).find((m) => m.type === 'join-result' && m.accepted && m.seat.id === seatA).credential;

    // A guesser: wrong passwords claim nothing and send nothing; the sixth attempt is throttled.
    const guesser = await connectPlayer(browser, joinUrl);
    expect(await chooseSeat(guesser.player, 'Brom', { password: 'nope' })).toBe('That password is incorrect.');
    for (let i = 0; i < 4; i++) await sendRaw(guesser.player, { v: 1, type: 'join-request', seatId: 's2', password: `guess${i}` });
    expect(await chooseSeat(guesser.player, 'Brom', { password: 'open sesame' })).toBe('Too many attempts. Try again shortly.');
    expect((await playerLog(guesser.player)).every((m) => ADMISSION.has(m.type))).toBe(true);
    await expect(session.locator('[data-testid="seat"][data-seat-id="s2"]')).toHaveAttribute('data-state', 'available');

    // Lock: the right password is refused; Aria stays and keeps getting saves.
    await session.getByTestId('lock-room').check();
    const late = await connectPlayer(browser, joinUrl);
    await expect(late.player.getByTestId('join-note')).toHaveText("The room is locked. The DM isn't letting new players join right now.");
    await sendRaw(late.player, { v: 1, type: 'join-request', seatId: 's3', password: 'open sesame' });
    await expect.poll(async () => (await playerLog(late.player)).filter((m) => m.type === 'join-result').map((m) => m.reason)).toEqual(['room-locked']);
    expect((await playerLog(late.player)).every((m) => ADMISSION.has(m.type))).toBe(true);
    await expect(aria.player.getByTestId('join-status')).toHaveText('Joined as Aria');

    // Aria's connection drops: her seat is kept. Another peer floods wrong passwords (the room-wide
    // limit trips), yet the valid credential reclaims the seat, while locked, with no password.
    await aria.context.close();
    await expect.poll(() => seatState(session, seatA), { timeout: 15000 }).toBe('claimed-disconnected');
    await session.getByTestId('lock-room').uncheck();
    const flooders = [];
    for (let i = 0; i < 4; i++) {
      // (8 connections at most: these 4, the guesser, the locked-out player, and two more below.)
      const f = await connectPlayer(browser, joinUrl);
      flooders.push(f);
      for (let j = 0; j < 5; j++) await sendRaw(f.player, { v: 1, type: 'join-request', seatId: 's2', password: `flood${i}-${j}` });
    }
    await expect.poll(async () => (await diagnostics(session)).players.admission.throttled, { timeout: 10000 }).toBeGreaterThan(0);
    await session.getByTestId('lock-room').check();
    const back = await connectPlayer(browser, joinUrl);
    await sendRaw(back.player, { v: 1, type: 'rejoin-request', seatId: seatA, credential: ariaCredential });
    await expect.poll(async () => (await playerLog(back.player)).filter((m) => m.type === 'join-result').map((m) => m.accepted), { timeout: 10000 }).toEqual([true]);
    await expect.poll(() => playerRevision(back.player), { timeout: 15000 }).toBeGreaterThan(0);
    expect(await seatState(session, seatA)).toBe('claimed');
    // The old credential is spent: the reclaim rotated it.
    const newCredential = (await hostSent(session)).filter((m) => m.type === 'join-result' && m.accepted && m.seat.id === seatA).at(-1).credential;
    expect(newCredential).not.toBe(ariaCredential);
    const stale = await connectPlayer(browser, joinUrl);
    await sendRaw(stale.player, { v: 1, type: 'rejoin-request', seatId: seatA, credential: ariaCredential });
    await expect.poll(async () => (await playerLog(stale.player)).filter((m) => m.type === 'join-result').map((m) => m.reason)).toEqual(['invalid-credential']);

    // Unlocked and without a password: new claims still wait while the flood's room-wide limit lasts
    // (its minute), the deliberate cost of limiting password guesses.
    await session.getByTestId('lock-room').uncheck();
    await session.getByTestId('clear-password').click();
    await expect(session.getByTestId('password-status')).toHaveText('No password.');
    expect(await chooseSeat(late.player, 'Cael')).toBe('Too many attempts. Try again shortly.');
    await expect(session.locator('[data-testid="seat"][data-seat-id="s3"]')).toHaveAttribute('data-state', 'available');

    const everyone = [guesser, late, back, stale, ...flooders];
    expect(JSON.stringify(await Promise.all(everyone.map((p) => playerLog(p.player))))).not.toContain('open sesame');
    expect(JSON.stringify(await diagnostics(session))).not.toContain('open sesame');
    expect(hostErrors).toEqual([]);
    for (const p of everyone) expect(p.errors).toEqual([]);
    await hostContext.close();
    for (const p of everyone) await p.context.close();
  });

  test('hostile clients, before and after admission, get nothing and disturb no one', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, session, hostErrors, joinUrl, snapshot, moveAndSave } = await dmWithMap(browser);
    const honest = await joinedPlayer(browser, joinUrl, 'Honest');
    const seatB = await addSeat(session, 'Spare');
    const mallory = await connectPlayer(browser, joinUrl);
    const unadmittedJunk = [
      { v: 1, type: 'asset-request', assetIds: [snapshot.background.assetId] },
      { v: 1, type: 'surface-snapshot', surface: 'battle-map', revision: 1, payload: {} },
      { v: 0, type: 'asset-request', assetIds: [snapshot.background.assetId] },
      { v: 0, type: 'battlemap-snapshot', payload: snapshot },
      { v: 1, type: 'ping', x: 1 },
      '{"v":1,"type":"join-request"',
      { v: 1, type: 'join-request', seatId: '__proto__' },
      { v: 1, type: 'join-request', seatId: 'constructor' },
      { v: 1, type: 'join-request', seatId: seatB, extra: true },
      { v: 1, type: 'rejoin-request', seatId: 's1', credential: 'A'.repeat(43) },
      JSON.stringify({ v: 1, type: 'join-request', seatId: seatB, password: 'x'.repeat(200 * 1024) }),
    ];
    for (const m of unadmittedJunk) await sendRaw(mallory.player, m);
    await mallory.player.waitForTimeout(1000);
    const malloryLog = await playerLog(mallory.player);
    expect(malloryLog.every((m) => ADMISSION.has(m.type))).toBe(true);
    // Only the fabricated credential was an admission request the host answered.
    expect(malloryLog.filter((m) => m.type === 'join-result').map((m) => m.reason)).toEqual(['invalid-credential']);
    expect(await seatState(session, seatB)).toBe('available');

    // Admitted, then misbehaving.
    expect(await chooseSeat(mallory.player, 'Spare')).toBe('Joined as Spare');
    await expect.poll(() => playerRevision(mallory.player), { timeout: 15000 }).toBeGreaterThan(0);
    const unknown = 'f'.repeat(64);
    const before = (await playerLog(mallory.player)).length;
    for (const m of [
      { v: 1, type: 'asset-request', assetIds: [unknown] },
      { v: 1, type: 'join-request', seatId: 's1' },
      { v: 1, type: 'rejoin-request', seatId: 's1', credential: 'B'.repeat(43) },
      { v: 1, type: 'session-ended', reason: 'kicked' },
      { v: 1, type: 'admission-state', locked: false, passwordRequired: false, seats: [] },
      'garbage',
    ]) await sendRaw(mallory.player, m);
    for (let i = 0; i < 30; i++) await sendRaw(mallory.player, { v: 1, type: 'asset-request', assetIds: [unknown] });
    await expect.poll(async () => (await playerLog(mallory.player)).slice(before).filter((m) => m.type === 'asset-abort').length, { timeout: 10000 }).toBeGreaterThan(0);
    const after = (await playerLog(mallory.player)).slice(before);
    expect(after.every((m) => m.type === 'asset-abort' && m.assetId === unknown)).toBe(true);
    await expect(session.locator('[data-testid="seat"][data-seat-id="s1"]')).toHaveAttribute('data-state', 'claimed');

    // The honest player is untouched and still gets saves.
    await moveAndSave();
    const next = await hostSnapshot(host);
    await expect.poll(() => playerRevision(honest.player), { timeout: 15000 }).toBe(next.revision);
    await expect(honest.player.getByTestId('join-status')).toHaveText('Joined as Honest');
    expect((await diagnostics(session)).players).toMatchObject({ admitted: 2, sendsBlocked: 0 });

    expect(hostErrors).toEqual([]);
    expect(honest.errors).toEqual([]);
    await hostContext.close();
    await honest.context.close();
    await mallory.context.close();
  });

  test('a dropped player keeps its seat (no one else may take it); a kicked one loses it; the others never notice', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, session, hostErrors, joinUrl, moveAndSave } = await dmWithMap(browser);
    const [a, b, c] = [await joinedPlayer(browser, joinUrl, 'Aria'), await joinedPlayer(browser, joinUrl, 'Brom'), await joinedPlayer(browser, joinUrl, 'Cael')];
    const seatId = async (name) => session.getByTestId('seat').filter({ hasText: `${name}:` }).getAttribute('data-seat-id');
    const [sa, sb] = [await seatId('Aria'), await seatId('Brom')];
    const waiting = await connectPlayer(browser, joinUrl);

    // A drops unexpectedly: its seat stays claimed-disconnected; B and C carry on.
    await a.context.close();
    await expect.poll(() => seatState(session, sa), { timeout: 15000 }).toBe('claimed-disconnected');
    await expect(waiting.player.getByTestId('join-seat').locator('option', { hasText: 'Aria — taken' })).toBeDisabled();
    await sendRaw(waiting.player, { v: 1, type: 'join-request', seatId: sa });
    await expect.poll(async () => (await playerLog(waiting.player)).filter((m) => m.type === 'join-result').map((m) => m.reason)).toEqual(['seat-unavailable']);
    await moveAndSave();
    let next = await hostSnapshot(host);
    for (const p of [b, c]) await expect.poll(() => playerRevision(p.player), { timeout: 15000 }).toBe(next.revision);
    await expect(playerCount(session)).toHaveText('2 joined · 1 connected, not joined');

    // Kick B: only B is told and removed; its seat is free again (the waiting player sees that).
    await seatButton(session, sb, 'kick').click();
    await expect(b.player.getByTestId('player-status')).toHaveText('You were removed from the session.', { timeout: 10000 });
    await expect(b.player.getByTestId('map-status')).toContainText('Disconnected — showing the last map received');
    await expect.poll(() => seatState(session, sb)).toBe('available');
    await expect(waiting.player.getByTestId('join-seat').locator('option').filter({ hasText: /^Brom$/ })).toBeEnabled();
    await expect(c.player.getByTestId('join-status')).toHaveText('Joined as Cael');
    await moveAndSave();
    next = await hostSnapshot(host);
    await expect.poll(() => playerRevision(c.player), { timeout: 15000 }).toBe(next.revision);
    expect(await playerRevision(b.player)).toBeLessThan(next.revision);
    // The kicked player's credential is dead; the waiting player can take the freed seat.
    const bCredential = (await hostSent(session)).find((m) => m.type === 'join-result' && m.accepted && m.seat.id === sb).credential;
    const ghost = await connectPlayer(browser, joinUrl);
    await sendRaw(ghost.player, { v: 1, type: 'rejoin-request', seatId: sb, credential: bCredential });
    await expect.poll(async () => (await playerLog(ghost.player)).filter((m) => m.type === 'join-result').map((m) => m.reason)).toEqual(['invalid-credential']);
    expect(await chooseSeat(waiting.player, 'Brom')).toBe('Joined as Brom');
    await expect(playerCount(session)).toHaveText('2 joined · 1 connected, not joined');

    // Reset C's seat: C is told its own reason.
    await seatButton(session, await seatId('Cael'), 'reset').click();
    await expect(c.player.getByTestId('player-status')).toHaveText('Your seat was reset by the host.', { timeout: 10000 });

    expect(hostErrors).toEqual([]);
    for (const p of [b, c, waiting, ghost]) expect(p.errors).toEqual([]);
    await hostContext.close();
    for (const p of [b, c, waiting, ghost]) await p.context.close();
  });

  test('End session tells every player, joined or not, forgets every seat, and leaves the Battle Map usable', async ({ browser }) => {
    const { hostContext, host, session, hostErrors, joinUrl, mapUrl } = await dmWithMap(browser);
    const a = await joinedPlayer(browser, joinUrl, 'Aria');
    const b = await joinedPlayer(browser, joinUrl, 'Brom');
    const waiting = await connectPlayer(browser, joinUrl);
    // What the Battle Map hears about the session from here on (the session page's status broadcasts).
    await host.evaluate(() => {
      window.__statuses = [];
      new BroadcastChannel('dmtoolbox.live-share.control').onmessage = (e) => {
        const m = e.data;
        if (m && m.type === 'session-status') window.__statuses.push(m.running ?? (m.payload && m.payload.running));
      };
    });
    await session.getByTestId('end-session').click();
    // The host's own protocol-v1 session-ended reached every link, joined or not: read from what each
    // player's channel received (the relay's "host left" shows the same text, so the text proves nothing).
    const ended = async (p) => (await playerLog(p.player)).filter((m) => m.type === 'session-ended').map((m) => m.reason);
    for (const p of [a, b, waiting]) await expect.poll(() => ended(p), { timeout: 10000 }).toEqual(['ended']);
    for (const p of [a, b, waiting]) await expect(p.player.getByTestId('player-status')).toHaveText('The host ended the session.', { timeout: 10000 });
    // The teardown finished by itself, triggered by the players closing their links (not by the 1 s
    // grace, and not by a later Start, which would force it).
    await expect.poll(async () => (await diagnostics(session)).signaling, { timeout: 10000 }).toBe('closed');
    expect((await diagnostics(session)).lastTeardown).toBe('players-closed');
    await expect(session.getByTestId('seat-list')).toHaveText('Seats exist while a session runs.');
    await expect(session.getByTestId('add-seat')).toBeDisabled();
    await expect(host.getByTestId('bm-live-share-status')).toHaveAttribute('data-state', 'not-running');
    // From End on, the session was never reported as running (no running:true, players:0 blip).
    const statuses = await host.evaluate(() => window.__statuses);
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((running) => running === false)).toBe(true);
    // The Battle Map still saves locally.
    await importMap(host, mapUrl, { tokens: [{ ...BARD, x: 600 }] });
    await expect.poll(async () => (await battleMapSnapshot(host)).tokens.map((t) => t.x)).toEqual([600]);
    // A new session is a new admission model: none of the old seats exist.
    const fresh = await startRoom(session);
    expect(fresh).not.toBe(joinUrl);
    await expect(session.getByTestId('seat-list')).toHaveText('No seats yet: add one for each player.');

    expect(hostErrors).toEqual([]);
    for (const p of [a, b, waiting]) expect(p.errors).toEqual([]);
    await hostContext.close();
    for (const p of [a, b, waiting]) await p.context.close();
  });

  test('End session with a player that never closes: it is told, and the teardown still finishes after the close grace', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    // A player that ignores session-ended: closing its channel, peer connection or relay socket does
    // nothing, so only the host's CLOSE_GRACE_MS fallback can end its link.
    // (Before recordPlayerTraffic, which replaces the RTCPeerConnection constructor.)
    const context = await browser.newContext();
    await context.addInitScript(() => {
      for (const C of [RTCDataChannel, RTCPeerConnection, WebSocket]) C.prototype.close = function () {};
    });
    await context.addInitScript(recordPlayerTraffic);
    const stubborn = await context.newPage();
    const stubbornErrors = watchErrors(stubborn);
    await stubborn.goto(joinUrl);
    await expect(stubborn.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
    await joinSeat(stubborn, joinUrl, { name: 'Stubborn' });
    const polite = await joinedPlayer(browser, joinUrl, 'Polite');

    await session.getByTestId('end-session').click();
    await expect(session.getByTestId('host-status')).toHaveText('Session ended'); // shown at once
    const ended = async (page) => (await playerLog(page)).filter((m) => m.type === 'session-ended').map((m) => m.reason);
    for (const page of [stubborn, polite.player]) await expect.poll(() => ended(page), { timeout: 10000 }).toEqual(['ended']);
    // No Start: the teardown completes on its own, through the grace fallback (the stubborn link never
    // closes, so the last-link trigger can't fire).
    await expect.poll(async () => (await diagnostics(session)).signaling, { timeout: 10000 }).toBe('closed');
    expect((await diagnostics(session)).lastTeardown).toBe('grace');
    // The host closed the stubborn player's channel itself.
    await expect.poll(() => stubborn.evaluate(() => window.__lsPlayerChannel.readyState), { timeout: 10000 }).toBe('closed');

    expect(hostErrors).toEqual([]);
    expect(stubbornErrors).toEqual([]);
    expect(polite.errors).toEqual([]);
    await hostContext.close();
    await context.close();
    await polite.context.close();
  });

  test('a player who leaves releases its seat; the host closes its connection', async ({ browser }) => {
    const { hostContext, session, hostErrors, joinUrl } = await dmWithMap(browser);
    const a = await joinedPlayer(browser, joinUrl, 'Aria');
    const seatA = await session.getByTestId('seat').filter({ hasText: 'Aria:' }).getAttribute('data-seat-id');
    await a.player.getByTestId('leave-session').click();
    await expect(a.player.getByTestId('player-status')).toHaveText('You left the session.', { timeout: 10000 });
    await expect.poll(() => seatState(session, seatA)).toBe('available');
    await expect(session.getByTestId('player-count')).toHaveText('0 joined · 0 connected, not joined', { timeout: 10000 });
    expect((await playerLog(a.player)).filter((m) => m.type === 'session-ended').map((m) => m.reason)).toEqual(['left']);
    expect(hostErrors).toEqual([]);
    expect(a.errors).toEqual([]);
    await hostContext.close();
    await a.context.close();
  });

  test('a large background to two players at once: both get it intact; a save during the transfers reaches both', async ({ browser }) => {
    test.setTimeout(240000);
    const dm = await openHost(browser);
    const joinUrl = await startRoom(dm.session);
    const players = [await joinedPlayer(browser, joinUrl, 'Aria'), await joinedPlayer(browser, joinUrl, 'Brom')];
    const bigMap = await makeMap(dm.host, { width: 3000, height: 3000, noise: true });
    await importMap(dm.host, bigMap, { tokens: [BARD], fogShapes: [] });
    const big = await hostSnapshot(dm.host);
    // While both transfers run, a structured save.
    await expect.poll(async () => (await diagnostics(dm.session)).assets.activeTransfers, { timeout: 30000, intervals: [50] }).toBeGreaterThan(0);
    await importMap(dm.host, bigMap, { tokens: [{ ...BARD, x: 400 }], fogShapes: [] }); // the same image, the bard moved
    await expect.poll(async () => (await hostSnapshot(dm.host)).revision, { timeout: 30000 }).toBeGreaterThan(big.revision);
    const after = await hostSnapshot(dm.host);
    expect(after.background.assetId).toBe(big.background.assetId);
    for (const p of players) {
      await expect.poll(() => playerRevision(p.player), { timeout: 120000 }).toBe(after.revision);
      await expect(p.player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 120000 });
      expect(await p.player.locator('.ls-background-image').getAttribute('data-asset-id')).toBe(big.background.assetId);
      expect((await diagnostics(p.player)).assets).toMatchObject({ failed: 0, rejected: 0 });
    }
    await expect.poll(async () => (await diagnostics(dm.session)).assets.sent).toBeGreaterThanOrEqual(2); // one complete send per player
    expect(dm.hostErrors).toEqual([]);
    for (const p of players) expect(p.errors).toEqual([]);
    await dm.hostContext.close();
    for (const p of players) await p.context.close();
  });
});
