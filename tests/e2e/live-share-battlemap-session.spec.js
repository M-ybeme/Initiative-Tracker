// Live Share Milestone 5A.4: the real Battle Map publishes to the Live Share session page.
//
// The production topology: the session page (live-share.html) owns the room, signaling, every player
// connection and the session's lifetime; the Battle Map (battlemap.html, no flag) is a surface
// publisher that offers its last SAVED map over the surface boundary (BroadcastChannel); a player
// (liveshare-dev.html) in another browser context receives the unchanged Milestone 0-4 wire format.
// Everything here runs the real pages and modules; nothing bypasses the BroadcastChannel boundary.
import { test, expect } from '@playwright/test';
import {
  openHost,
  openBattleMap,
  startAndJoin,
  startRoom,
  sessionOf,
  hostSnapshot,
  battleMapSnapshot,
  diagnostics,
  sentText,
  save,
  importMap,
  makeMap,
  makeTokenPng,
  screenOf,
  tokenMenu,
  liveShareState,
  watchErrors,
  recordPlayerTraffic,
} from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const BARD = { id: 't_bard', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true };
const playerMap = (player) => player.getByTestId('player-map');
const playerRevision = async (player) => Number(await playerMap(player).getAttribute('data-revision'));
const playerTokens = (player) => player.evaluate(() => [...document.querySelectorAll('[data-testid="player-map"] .ls-token')].map((g) => ({ id: g.getAttribute('data-token-id'), at: g.querySelector('.ls-token-body').getAttribute('transform') })));
const playerBackground = (player) => player.locator('.ls-background-image').getAttribute('data-asset-id');
const store = async (host) => (await diagnostics(host)).boundary.store['battle-map'];
const publication = (host) => host.getByTestId('bm-live-share-publication');

// Drag a token by its world centre (the imported view: x 0, y 0, scale 0.6).
async function drag(host, world, dx, dy) {
  const at = await screenOf(host, world.x, world.y);
  await host.mouse.move(at.x, at.y);
  await host.mouse.down();
  await host.mouse.move(at.x + dx, at.y + dy, { steps: 8 });
  await host.mouse.up();
}

async function joinPlayer(browser, joinUrl) {
  const context = await browser.newContext();
  await context.addInitScript(recordPlayerTraffic);
  const player = await context.newPage();
  const errors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { context, player, errors };
}

// A map that is all the DM saved: the bard plus a token with custom art.
async function savedMapWithArt(host) {
  const art = `data:image/png;base64,${(await makeTokenPng(host)).toString('base64')}`;
  await importMap(host, await makeMap(host), { tokens: [BARD, { id: 't_hero', name: 'Hero', imgSrc: art, x: 300, y: 100, w: 50, h: 50, rot: 0, showLabel: true }] });
  await expect.poll(async () => (await hostSnapshot(host))?.background, { timeout: 15000 }).not.toBeNull();
  await expect.poll(async () => (await hostSnapshot(host)).tokens[1].assetId, { timeout: 15000 }).toMatch(/^[0-9a-f]{64}$/);
  return hostSnapshot(host);
}

test.describe('Live Share: the Battle Map publishes to the session page (5A.4)', () => {
  test('Milestone 5A exit: the session page keeps the room; the Battle Map publishes saved maps, closes and reopens', async ({ browser }) => {
    test.setTimeout(180000);
    // 1-3: the session host with a room open, then the Battle Map.
    const { hostContext, host, hostErrors, session } = await openHost(browser);
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'active');
    await expect(session.getByTestId('surface')).toHaveText(/Battle Map: open, publishing/);

    // 4-7: a map is built and saved; a player joins and gets its structure, background and art.
    const A = await savedMapWithArt(host);
    const p1 = await joinPlayer(browser, await startRoom(session));
    await expect.poll(() => playerRevision(p1.player)).toBe(A.revision);
    await expect(p1.player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 15000 });
    expect(await playerBackground(p1.player)).toBe(A.background.assetId);
    await expect(p1.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 15000 });
    await expect(publication(host)).toHaveText('Players have your last saved map.');

    // 8-9: unsaved edits stay private.
    await drag(host, { x: 125, y: 125 }, 60, 0);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.waitForTimeout(1200);
    expect(await hostSnapshot(host)).toEqual(A);
    expect(await playerRevision(p1.player)).toBe(A.revision);

    // 10-11: Save publishes: one new revision, the same background.
    await save(host);
    await expect.poll(() => playerRevision(p1.player), { timeout: 15000 }).toBe(A.revision + 1);
    const B = await hostSnapshot(host);
    expect(B.tokens[0].x).not.toBe(A.tokens[0].x);
    expect(B.background).toEqual(A.background);

    // 12-13: closing the Battle Map leaves the room, the player and the publication alone.
    const assetsReceived = (await store(host)).assetsReceived;
    await host.close();
    await expect(session.getByTestId('surface')).toHaveAttribute('data-liveness', 'closed');
    await expect(session.getByTestId('host-status')).toHaveText('Room open — waiting for players');
    await p1.player.waitForTimeout(1000);
    await expect(p1.player.getByTestId('player-status')).toHaveText('Connected to host');
    expect(await playerRevision(p1.player)).toBe(B.revision);
    await expect(p1.player.getByTestId('map-assets')).toHaveText('Map image shown.');
    expect(await session.evaluate(() => window.LiveShareSessionHost.committedSnapshot())).toEqual(B);
    // The session page still serves the assets: a late player (one at a time until 5B) gets them all.
    await p1.player.getByTestId('leave-session').click();
    await expect(session.getByTestId('peer-list')).toHaveText('No players connected.', { timeout: 15000 });
    const p2 = await joinPlayer(browser, await startRoom(session));
    await expect.poll(() => playerRevision(p2.player)).toBe(B.revision);
    await expect(p2.player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 15000 });
    await expect(p2.player.locator('[data-token-id="t_hero"]')).toHaveAttribute('data-art', 'image', { timeout: 15000 });

    // 14-15: reopening the Battle Map re-registers and offers the same saved map: no new revision, no
    // asset copied to the session page again, nothing new sent to the player.
    const snapshotsBefore = (await diagnostics(p2.player)).snapshots.snapshotsReceived;
    const reopened = await openBattleMap(hostContext, session, hostErrors);
    await expect(liveShareState(reopened)).toHaveAttribute('data-state', 'active');
    await expect(publication(reopened)).toHaveText('Players have your last saved map.', { timeout: 15000 });
    expect(await hostSnapshot(reopened)).toEqual(B);
    expect((await store(reopened)).assetsReceived).toBe(assetsReceived);
    await p2.player.waitForTimeout(500);
    expect((await diagnostics(p2.player)).snapshots.snapshotsReceived).toBe(snapshotsBefore);

    // 16-17: a new save from the reopened page updates the player.
    await drag(reopened, { x: B.tokens[0].x + 25, y: B.tokens[0].y + 25 }, -60, 30);
    await save(reopened);
    await expect.poll(() => playerRevision(p2.player), { timeout: 15000 }).toBe(B.revision + 1);

    // 18-20: ending the room on the session page ends it for the player; the Battle Map keeps working.
    await session.getByTestId('end-session').click();
    await expect(p2.player.getByTestId('player-status')).toHaveText('The host ended the session.', { timeout: 10000 });
    await expect(liveShareState(reopened)).toHaveAttribute('data-state', 'not-running');
    expect(await session.evaluate(() => window.LiveShareSessionHost.committedSnapshot())).toBeNull();
    const local = await battleMapSnapshot(reopened);
    await drag(reopened, { x: local.tokens[0].x + 25, y: local.tokens[0].y + 25 }, 40, 0);
    await save(reopened);
    await expect.poll(async () => (await battleMapSnapshot(reopened)).revision).toBeGreaterThan(local.revision);
    await expect(reopened.getByTestId('save-map')).toHaveAttribute('data-state', 'clean');

    expect(hostErrors).toEqual([]);
    expect(p1.errors).toEqual([]);
    expect(p2.errors).toEqual([]);
    await hostContext.close();
    await p1.context.close();
    await p2.context.close();
  });

  test('a map saved before the session starts is shared when it starts, without saving again; the unsaved draft is not', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors, session } = await openHost(browser, undefined, { start: false });
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'not-running');
    const art = `data:image/png;base64,${(await makeTokenPng(host)).toString('base64')}`;
    await importMap(host, await makeMap(host), { tokens: [BARD, { id: 't_hero', name: 'Hero', imgSrc: art, x: 300, y: 100, w: 50, h: 50, rot: 0 }] });
    // No session: nothing composed, encoded or hashed for Live Share.
    expect((await battleMapSnapshot(host)).background).toBeNull();
    expect(await host.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics())).toMatchObject({ background: { rebuilds: 0 }, tokens: { prepared: 0 } });
    const saved = await battleMapSnapshot(host);
    // An unsaved edit before the session starts.
    await drag(host, { x: 125, y: 125 }, 90, 0);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');

    const joinUrl = await startRoom(session);
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'active');
    await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 20000 }).toMatch(/^[0-9a-f]{64}$/);
    const shared = await hostSnapshot(host);
    // The first and only publication of the session: never the earlier one without assets.
    expect(shared.revision).toBe(1);
    expect((await diagnostics(host)).boundary.store['battle-map'].commits).toBe(1);
    expect(shared.tokens.map((t) => [t.id, t.x, t.y])).toEqual(saved.tokens.map((t) => [t.id, t.x, t.y])); // the save, not the draft
    expect(shared.tokens[1].assetId).toMatch(/^[0-9a-f]{64}$/);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty'); // still the DM's draft
    const p = await joinPlayer(browser, joinUrl);
    await expect.poll(() => playerRevision(p.player)).toBe(shared.revision);
    await expect(p.player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 15000 });
    expect((await playerTokens(p.player)).find((t) => t.id === 't_bard').at).toBe(`translate(${saved.tokens[0].x + 25} ${saved.tokens[0].y + 25}) rotate(0)`);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('a saved map that turns out unreadable when the session starts is not shared, and the Battle Map says why', async ({ browser }) => {
    test.setTimeout(90000);
    // The Battle Map is open (its saved map already published locally, without assets) before Start.
    const { hostContext, host, hostErrors, session } = await openHost(browser, undefined, { start: false });
    await host.evaluate(async () => {
      const base = { mapTransform: { scale: 1, x: 0, y: 0 }, grid: { size: 50 }, view: { x: 0, y: 0, scale: 0.6 }, fogState: { enabled: false }, fogShapes: [] };
      const token = { id: 't_saved', name: 'Saved', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0 };
      await IndexedDBStorage.saveBattleMap({ ...base, saveId: 's_broken', map: { imgSrc: 'data:image/png;base64,bm90IGFuIGltYWdl', w: 800, h: 600 }, tokens: [token] }, 'current-session');
    });
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.hasPublishedState());
    const joinUrl = await startRoom(session);
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'active');
    await expect(publication(host)).toHaveText(/could not be loaded \(its image is unreadable\)/, { timeout: 15000 });
    const p = await joinPlayer(browser, joinUrl);
    await p.player.waitForTimeout(1500);
    expect(await hostSnapshot(host)).toBeNull(); // nothing committed: no tokens on a blank map
    await expect(p.player.getByTestId('map-section')).toBeHidden();
    expect(hostErrors.filter((e) => !/could not be loaded from storage|Failed to load resource/.test(e))).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('the save boundary holds across the new topology: drafts, hidden tokens and reloads never reach players', async ({ browser }) => {
    test.setTimeout(150000);
    const { hostContext, host, hostErrors, session } = await openHost(browser);
    const A = await savedMapWithArt(host);
    const p = await joinPlayer(browser, await startRoom(session));
    await expect.poll(() => playerRevision(p.player)).toBe(A.revision);
    const sentBefore = (await sentText(host)).length;

    // Unsaved: a token move, hiding the hero, a fog change.
    await drag(host, { x: 125, y: 125 }, 70, 0);
    expect(await tokenMenu(host, { x: 325, y: 125 }, 'toggleVisible')).toContain('Visible to Players');
    await host.locator('#fogCover').click();
    await host.locator('#addFogShape').click();
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await host.waitForTimeout(1500);
    expect(await hostSnapshot(host)).toEqual(A);
    expect(await playerRevision(p.player)).toBe(A.revision);
    expect((await sentText(host)).length).toBe(sentBefore);

    // Reload before saving: the DM gets the draft back; the session page and the player keep A.
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare);
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty');
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'active');
    await expect(publication(host)).toHaveText('Players have your last saved map.', { timeout: 15000 });
    expect(await hostSnapshot(host)).toEqual(A); // the reloaded tab offered the saved A again: no new revision
    expect(await playerRevision(p.player)).toBe(A.revision);

    // Save: now, and only now, players get B: the move, the hero gone (with its art), the new fog.
    await save(host);
    await expect.poll(() => playerRevision(p.player), { timeout: 15000 }).toBe(A.revision + 1);
    const B = await hostSnapshot(host);
    expect(B.tokens.map((t) => t.id)).toEqual(['t_bard']);
    expect(B.background.revision).toBe(A.background.revision + 1);
    await expect(p.player.locator('[data-token-id="t_hero"]')).toHaveCount(0);
    const after = (await sentText(host)).slice(sentBefore).join('\n');
    expect(after).not.toMatch(/t_hero|"Hero"|imgSrc|visibleToPlayers|data:image|"hp"/);

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('two Battle Map tabs: one publishes; the other saves locally only, until it claims the role', async ({ browser }) => {
    test.setTimeout(150000);
    const { hostContext, host: tab1, hostErrors, session } = await openHost(browser);
    // An empty second tab (nothing saved yet anywhere) does not keep the first from publishing.
    const tab2 = await openBattleMap(hostContext, session, hostErrors);
    await expect(liveShareState(tab2)).toHaveAttribute('data-state', 'active'); // the newest registration
    await expect(liveShareState(tab1)).toHaveAttribute('data-state', 'inactive');
    await importMap(tab1, await makeMap(tab1), { tokens: [BARD] });
    await expect(liveShareState(tab1)).toHaveAttribute('data-state', 'active'); // it has a map, tab 2 had none
    await expect.poll(async () => (await hostSnapshot(tab1))?.tokens.length, { timeout: 15000 }).toBe(1);
    const A = await hostSnapshot(tab1);
    const p = await joinPlayer(browser, await startRoom(session));
    await expect.poll(() => playerRevision(p.player)).toBe(A.revision);
    await expect(tab2.getByTestId('bm-claim-publisher')).toBeVisible();
    await expect(tab1.getByTestId('bm-claim-publisher')).toBeHidden();

    // The inactive tab saves a change: stored locally (it is the same IndexedDB map), players untouched.
    await tab2.reload(); // pick up the map tab 1 saved
    await tab2.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.hasPublishedState());
    await expect(liveShareState(tab2)).toHaveAttribute('data-state', 'active'); // newest registration again, same map
    await expect(publication(tab2)).toHaveText('Players have your last saved map.', { timeout: 15000 });
    expect(await hostSnapshot(tab2)).toEqual(A); // identical content: no new revision
    await tab1.getByTestId('bm-claim-publisher').click(); // the DM picks tab 1
    await expect(liveShareState(tab1)).toHaveAttribute('data-state', 'active');
    await expect(liveShareState(tab2)).toHaveAttribute('data-state', 'inactive');
    await drag(tab2, { x: 125, y: 125 }, 100, 0);
    await save(tab2);
    await expect(tab2.getByTestId('bm-live-share-status')).toHaveText('Live Share is using another Battle Map tab. Saving here does not update players.');
    await tab2.waitForTimeout(1500);
    expect(await hostSnapshot(tab1)).toEqual(A);
    expect(await playerRevision(p.player)).toBe(A.revision);

    // Claiming from tab 2 switches the publisher: its last SAVED map reaches the player.
    await drag(tab2, { x: 225, y: 125 }, 0, 80); // and an unsaved edit on top, which must not leak
    await tab2.getByTestId('bm-claim-publisher').click();
    await expect(liveShareState(tab2)).toHaveAttribute('data-state', 'active');
    await expect.poll(() => playerRevision(p.player), { timeout: 15000 }).toBe(A.revision + 1);
    const B = await hostSnapshot(tab2);
    const savedByTab2 = await battleMapSnapshot(tab2);
    expect(B.tokens[0].x).toBeGreaterThan(A.tokens[0].x); // the saved move...
    expect(B.tokens[0]).toMatchObject({ x: savedByTab2.tokens[0].x, y: A.tokens[0].y }); // ...not the unsaved one
    // The former publisher's later save cannot overwrite the claimed tab's map.
    await drag(tab1, { x: 125, y: 125 }, 0, -40);
    await save(tab1);
    await tab1.waitForTimeout(1500);
    expect(await hostSnapshot(tab2)).toEqual(B);
    expect(await playerRevision(p.player)).toBe(B.revision);
    // And tab 1's save didn't take the role back: the claimed tab with a saved map keeps it.
    await expect(liveShareState(tab2)).toHaveAttribute('data-state', 'active');

    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  test('when the session ends the Battle Map stops Live Share work; a new session publishes the current saved map', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors, session } = await openHost(browser);
    await importMap(host, await makeMap(host), { tokens: [BARD] });
    await expect.poll(async () => (await hostSnapshot(host))?.background, { timeout: 15000 }).not.toBeNull();
    await session.getByTestId('end-session').click();
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'not-running');
    const rebuilds = () => host.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics().background.rebuilds);
    const before = await rebuilds();
    // A fog change saved with no session: stored, but nothing composed for Live Share.
    await host.locator('#fogCover').click();
    await host.locator('#addFogShape').click();
    await save(host);
    await host.waitForTimeout(1500);
    expect(await rebuilds()).toBe(before);
    expect((await battleMapSnapshot(host)).background).toBeNull();
    // A new session: the current saved map (with that fog) is prepared and shared, without a save.
    const joinUrl = await startRoom(session);
    await expect(liveShareState(host)).toHaveAttribute('data-state', 'active');
    await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 20000 }).toMatch(/^[0-9a-f]{64}$/);
    expect(await rebuilds()).toBe(before + 1);
    const p = await joinPlayer(browser, joinUrl);
    await expect(p.player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 15000 });
    expect((await hostSnapshot(host)).revision).toBe(1); // a new session starts its revisions again
    expect(hostErrors).toEqual([]);
    expect(p.errors).toEqual([]);
    await hostContext.close();
    await p.context.close();
  });

  // The ADR §9 note ¹ re-check on the real path (5A.4): Battle Map Save -> surface publisher ->
  // BroadcastChannel -> session page -> production AssetSender -> player, with a near-limit background
  // (an incompressible map), and a structured save made during the transfer. Correctness is asserted;
  // the timings are recorded (annotation and console), not asserted: the known multi-second transport
  // stall of 5A.1 / 5A.3 may or may not show.
  test('a near-limit background through the real Battle Map path arrives intact; a save during the transfer is sent at once', async ({ browser }) => {
    test.setTimeout(240000);
    const { hostContext, host, hostErrors, session } = await openHost(browser);
    // The player timestamps every message it receives (binary chunks, and snapshots by revision).
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__arrivals = [];
      const PC = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...args) {
        const pc = new PC(...args);
        pc.addEventListener('datachannel', (e) =>
          e.channel.addEventListener('message', (m) => {
            if (typeof m.data !== 'string') window.__arrivals.push({ t: Date.now(), chunk: m.data.byteLength });
            else if (m.data.includes('"battlemap-snapshot"')) window.__arrivals.push({ t: Date.now(), revision: JSON.parse(m.data).payload.revision });
          })
        );
        return pc;
      };
    });
    const player = await context.newPage();
    const playerErrors = watchErrors(player);
    await player.goto(await startRoom(session));
    await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });

    const t0 = Date.now();
    await importMap(host, await makeMap(host, { width: 4096, height: 4096, noise: true }), { tokens: [BARD], fogShapes: [] });
    await expect.poll(async () => (await hostSnapshot(host))?.background?.assetId, { timeout: 120000 }).toMatch(/^[0-9a-f]{64}$/);
    const tCommitted = Date.now();
    const big = await hostSnapshot(host);
    const prepared = await host.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics().background);
    expect(prepared.bytes).toBeGreaterThan(8 * 1024 * 1024); // a large background, near the 16 MiB cap
    expect(prepared.bytes).toBeLessThanOrEqual(16 * 1024 * 1024);
    // As soon as the first chunk is in, a structured save.
    await expect.poll(() => player.evaluate(() => window.__arrivals.some((a) => a.chunk)), { timeout: 60000, intervals: [10] }).toBe(true);
    const bard = (await battleMapSnapshot(host)).tokens[0];
    await drag(host, { x: bard.x + 25, y: bard.y + 25 }, 60, 0);
    const tSave = Date.now();
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision, { timeout: 30000, intervals: [10] }).toBe(big.revision + 1);
    const tHostCommit = Date.now();
    const sender = (await diagnostics(host)).snapshots;
    expect(sender.lastSnapshotSentRevision).toBe(big.revision + 1); // sent in the commit event
    await expect(player.getByTestId('map-assets')).toHaveText('Map image shown.', { timeout: 120000 });
    await expect.poll(() => playerRevision(player), { timeout: 60000 }).toBe(big.revision + 1);
    const playerAssets = (await diagnostics(player)).assets;
    expect(playerAssets).toMatchObject({ failed: 0, rejected: 0, cached: 1 }); // every byte hashed to its id
    expect(await playerBackground(player)).toBe(big.background.assetId);

    const arrivals = await player.evaluate(() => window.__arrivals);
    const chunks = arrivals.filter((a) => a.chunk);
    let longestGap = 0;
    for (let i = 1; i < chunks.length; i++) longestGap = Math.max(longestGap, chunks[i].t - chunks[i - 1].t);
    const savedSnapshot = arrivals.find((a) => a.revision === big.revision + 1);
    const timings = {
      backgroundBytes: prepared.bytes,
      chunks: chunks.length,
      importSaveToCommittedMs: tCommitted - t0,
      committedToFirstChunkMs: chunks[0].t - tCommitted,
      firstToLastChunkMs: chunks[chunks.length - 1].t - chunks[0].t,
      longestChunkGapMs: longestGap,
      structuredSaveToHostCommitMs: tHostCommit - tSave,
      structuredSaveToPlayerMs: savedSnapshot.t - tSave,
      structuredSnapshotArrivedDuringTransfer: savedSnapshot.t < chunks[chunks.length - 1].t,
    };
    test.info().annotations.push({ type: '5A.4 real-path large-background re-check', description: JSON.stringify(timings) });
    console.log('5A.4 real-path large-background re-check', JSON.stringify(timings));
    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await context.close();
  });
});
