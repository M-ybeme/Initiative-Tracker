// Live Share Milestone 2: the DM edits the real Battle Map and a player in a separate browser context
// (liveshare-dev.html) renders the structured state it receives over a real RTCDataChannel, through
// the local relay (port 8788, started by playwright.config.js). Since 5A.4 the topology is the
// product's: the Live Share session page (live-share.html) owns the room and the connections, and the
// Battle Map publishes its saved map to it (tests/helpers/battlemap-live-share.js).
//
// The player's drawing is compared with what the session page sends players (its committed snapshot,
// with the revisions it assigns), so "converged" means the same revision and the same geometry, names
// and conditions. No images are asserted: map and token assets arrive in Milestone 3.
import { test, expect } from '@playwright/test';
import { openHost, startAndJoin, sessionOf, hostSnapshot, diagnostics, save } from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

async function openAccordion(page, target, probe) {
  if (!(await page.locator(probe).isVisible())) {
    await page.locator(`[data-bs-target="${target}"]`).click();
    await expect(page.locator(probe)).toBeVisible();
  }
}

async function addPresetToken(page, label) {
  await openAccordion(page, '#accTokens', '#tokenPreset');
  const before = (await hostSnapshot(page)).tokens.length;
  await page.locator('#tokenPreset').selectOption({ label });
  await page.locator('#addPreset').click();
  await expect(page.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty'); // placed (after its image loads)
  await save(page);
  await expect.poll(async () => (await hostSnapshot(page)).tokens.length).toBe(before + 1);
}

// New tokens are placed, selected, at the centre of the DM's view.
async function center(page) {
  const box = await page.locator('#uiLayer').boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function tokenMenu(page, at, cmd) {
  await page.mouse.click(at.x, at.y, { button: 'right' });
  await page.locator(`#ctxMenu [data-cmd="${cmd}"]`).click();
}

async function drag(page, from, to, steps = 20) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

// What the player drew, read back from its SVG.
function playerModel(player) {
  return player.evaluate(() => {
    const nums = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const svg = document.querySelector('[data-testid="player-map"]');
    return {
      revision: Number(svg.getAttribute('data-revision')),
      tokens: [...svg.querySelectorAll('.ls-token')].map((g) => {
        const [cx, cy, deg] = nums(g.querySelector('.ls-token-body').getAttribute('transform'));
        // A marker's ellipse, or (2.3.30) a built-in image drawn in the same w x h box.
        const ellipse = g.querySelector('ellipse');
        const art = g.querySelector('.ls-token-art');
        return {
          id: g.getAttribute('data-token-id'),
          cx,
          cy,
          deg,
          w: ellipse ? Number(ellipse.getAttribute('rx')) * 2 : Number(art.getAttribute('width')),
          h: ellipse ? Number(ellipse.getAttribute('ry')) * 2 : Number(art.getAttribute('height')),
          name: g.querySelector('.ls-token-name')?.textContent ?? null,
          conditions: g.querySelector('.ls-token-conditions')?.textContent ?? '',
        };
      }),
      measurements: [...svg.querySelectorAll('.ls-measurement')].map((g) => ({
        id: g.getAttribute('data-measurement-id'),
        type: g.getAttribute('data-type'),
        label: g.querySelector('.ls-measurement-label')?.textContent ?? null,
      })),
      grid: {
        size: Number(svg.querySelector('.ls-grid').getAttribute('data-size')),
        offsetX: Number(svg.querySelector('.ls-grid').getAttribute('data-offset-x')),
        // x of each vertical minor line
        minorX: [...svg.querySelectorAll('.ls-grid-minor')].filter((l) => l.getAttribute('x1') === l.getAttribute('x2')).map((l) => Number(l.getAttribute('x1'))),
      },
    };
  });
}

// The player's drawing of the host's current snapshot, as the player should have it.
function expectedModel(s) {
  const round = (n) => Math.round(n * 100) / 100;
  return {
    revision: s.revision,
    tokens: s.tokens.map((t) => ({
      id: t.id,
      cx: round(t.x + t.w / 2),
      cy: round(t.y + t.h / 2),
      deg: round((t.rot * 180) / Math.PI),
      w: round(t.w / 2) * 2,
      h: round(t.h / 2) * 2,
      name: t.name,
      conditions: t.conditions.join(', '),
    })),
    measurementIds: s.measurements.map((m) => m.id),
  };
}

// Wait until the player shows exactly the host's current snapshot.
async function expectConverged(host, player) {
  let expected;
  let got;
  await expect
    .poll(
      async () => {
        expected = expectedModel(await hostSnapshot(host));
        const model = await playerModel(player);
        got = { revision: model.revision, tokens: model.tokens, measurementIds: model.measurements.map((m) => m.id) };
        // Sizes within 0.02: a marker draws w/2 rounded (x2), a built-in image w rounded (2.3.30).
        const sizes = (m) => m.tokens.map((t) => [t.w, t.h]);
        const rest = (m) => JSON.stringify({ ...m, tokens: m.tokens.map(({ w: _w, h: _h, ...t }) => t) });
        return rest(got) === rest(expected) && sizes(got).length === sizes(expected).length && sizes(got).every((wh, i) => wh.every((v, j) => Math.abs(v - sizes(expected)[i][j]) <= 0.02));
      },
      { timeout: 10000, message: 'player converges on the host snapshot' }
    )
    .toBe(true)
    .catch((err) => {
      throw new Error(`${err.message}\nhost:   ${JSON.stringify(expected)}\nplayer: ${JSON.stringify(got)}`);
    });
  return expected;
}

// The session page (room open) and the Battle Map, saved once: players only ever see a saved map.
async function startSharing(browser) {
  const { hostContext, host, hostErrors } = await openHost(browser);
  await save(host);
  await expect.poll(() => hostSnapshot(host), { timeout: 15000 }).not.toBeNull();
  return { hostContext, host, hostErrors };
}

async function joinAsPlayer(browser, host) {
  const joined = await startAndJoin(browser, host);
  expect(await sessionOf(host).getByTestId('join-link').textContent()).toMatch(/\/liveshare-dev\?.*#room=[A-Za-z0-9_-]{22}$/);
  return joined;
}

test.describe('Live Share remote structured rendering (Milestone 2)', () => {
  test('the player renders the Battle Map, follows the DM\'s edits and never rolls back', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await startSharing(browser);

    // The DM prepares the map before anyone joins: a labelled token with HP (HP is never shared).
    await addPresetToken(host, 'Fighter');
    const at = await center(host);
    await tokenMenu(host, at, 'toggleLabel');
    await tokenMenu(host, at, 'setHp');
    await host.locator('#hpCurrent').fill('17');
    await host.locator('#hpMax').fill('23');
    await host.locator('#hpSaveBtn').click();
    await expect(host.locator('#hpModal')).toBeHidden();
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[0].name).toBe('Fighter');
    const before = await hostSnapshot(host);

    // 1-6: the player joins and gets the current map at once, although nothing changed since.
    const { playerContext, player, playerErrors } = await joinAsPlayer(browser, host);
    await expect(player.getByTestId('map-section')).toBeVisible();
    await expect(player.getByTestId('map-status')).toHaveText(`Live — revision ${before.revision}`);
    let expected = await expectConverged(host, player);
    expect(expected.revision).toBe(before.revision);
    await expect(player.locator('.ls-token-name')).toHaveText('Fighter');
    // Grid: same cell size and origin as the DM's; every minor line sits on a grid line.
    const model = await playerModel(player);
    expect(model.grid).toMatchObject({ size: before.grid.size, offsetX: before.grid.offsetX });
    expect(model.grid.minorX.length).toBeGreaterThan(2);
    for (const x of model.grid.minorX) expect(Math.abs((x - before.grid.offsetX) % before.grid.size)).toBeLessThan(0.01);
    // No HP or editor controls on the player, and no images but the Fighter's built-in one (2.3.30),
    // loaded from the player's own site by its preset id.
    await expect(player.locator('[data-testid="player-map"] foreignObject')).toHaveCount(0);
    expect(await player.locator('[data-testid="player-map"] image').evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(['/images/playerTokens/PlayerFighterToken.png']);
    await expect(player.getByTestId('player-map')).not.toContainText('17');

    // 7-8: the DM drags the token (up and left, clear of the Live Share panel); the player follows.
    const moved = { x: at.x - 160, y: at.y - 60 };
    await drag(host, at, moved);
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).revision).toBeGreaterThan(before.revision);
    expected = await expectConverged(host, player);
    expect(expected.tokens[0].cx).not.toBe(before.tokens[0].x + before.tokens[0].w / 2);

    // A condition, through the real status dialog.
    await tokenMenu(host, moved, 'addStatus');
    await host.locator('#statusCheckboxes input[value="Prone"]').check();
    await host.locator('#statusSaveBtn').click();
    await save(host);
    await expect(player.locator('.ls-token-conditions')).toHaveText('Prone');

    // A persistent measurement.
    await host.locator('#tabMeasure').click();
    await host.locator('#persistentMeasureToggle').click();
    await host.locator('#measureToggle').click();
    const measureFrom = { x: at.x + 40, y: at.y - 200 };
    await drag(host, measureFrom, { x: measureFrom.x + 250, y: measureFrom.y }, 5);
    await host.locator('#measureToggle').click();
    await host.locator('#persistentMeasureToggle').click();
    await save(host);
    // (Turning the toggle off can add a second measurement from the same start: existing Battle Map
    // behavior. The player only has to match whatever the host has.)
    await expect.poll(async () => (await hostSnapshot(host)).measurements.length).toBeGreaterThan(0);
    expected = await expectConverged(host, player);
    const [measure] = (await playerModel(player)).measurements;
    expect(measure.type).toBe('line');
    expect(measure.label).toMatch(/^\d+ ft$/);

    // Measurements are not snapped, so the first one gives the DM's world -> screen mapping, used to
    // find the token on screen from its snapshot position.
    const m0 = (await hostSnapshot(host)).measurements[0];
    const worldPerPx = (m0.x2 - m0.x1) / 250;
    const onScreen = (t) => ({
      x: measureFrom.x + (t.x + t.w / 2 - m0.x1) / worldPerPx,
      y: measureFrom.y + (t.y + t.h / 2 - m0.y1) / worldPerPx,
    });

    // 9-10: a burst of edits (rotate, resize, drag, grid size), then ONE save: players get the final
    // state as one new revision, never the intermediate drafts.
    await expect.poll(async () => (await diagnostics(host)).snapshots.lastSnapshotSentRevision).toBe((await hostSnapshot(host)).revision);
    const sentBeforeBurst = (await diagnostics(host)).snapshots.snapshotsSent;
    const revisionBeforeBurst = (await hostSnapshot(host)).revision;
    const token = onScreen((await hostSnapshot(host)).tokens[0]);
    await host.mouse.click(token.x, token.y); // select the token
    for (let i = 0; i < 5; i++) await host.keyboard.press('r');
    for (let i = 0; i < 3; i++) await host.keyboard.press('+');
    const grown = onScreen((await hostSnapshot(host)).tokens[0]);
    await drag(host, grown, { x: grown.x - 150, y: grown.y + 40 }, 40);
    await openAccordion(host, '#accMap', '#gridSize');
    await host.locator('#gridSize').fill('64');
    expect((await hostSnapshot(host)).revision).toBe(revisionBeforeBurst); // nothing published yet
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).grid.size).toBe(64);
    const final = await hostSnapshot(host);
    expect(final.grid.size).toBe(64);
    expect(final.tokens[0].rot).toBeCloseTo((5 * Math.PI) / 12, 5);
    expected = await expectConverged(host, player);
    expect(expected.revision).toBe(final.revision);
    expect((await playerModel(player)).grid.size).toBe(64);
    // One save, one revision, one snapshot. (The host panel refreshes its diagnostics twice a second.)
    await expect.poll(async () => (await diagnostics(host)).snapshots.lastSnapshotSentRevision).toBe(final.revision);
    let afterBurst = (await diagnostics(host)).snapshots;
    expect(final.revision).toBe(revisionBeforeBurst + 1);
    expect(afterBurst.snapshotsSent - sentBeforeBurst).toBe(1);

    // Rapid saves, each after an edit: the player converges on the last one. (Out of the grid-size
    // field first: the Battle Map ignores its hotkeys while you type in a field.)
    await host.evaluate(() => document.activeElement && document.activeElement.blur());
    for (let i = 0; i < 5; i++) {
      await host.keyboard.press('r');
      await host.keyboard.press('Control+s');
    }
    await expect(host.getByTestId('save-map')).not.toHaveAttribute('data-state', /dirty|saving/);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[0].rot).toBeCloseTo((10 * Math.PI) / 12, 5);
    const latest = await hostSnapshot(host);
    expected = await expectConverged(host, player);
    expect(expected.revision).toBe(latest.revision);
    await expect.poll(async () => (await diagnostics(host)).snapshots.lastSnapshotSentRevision).toBe(latest.revision);
    afterBurst = (await diagnostics(host)).snapshots;
    expect(afterBurst.pendingSnapshot).toBe(false);

    // Nothing private ever left the session page: no HP, images, editor state or fog.
    const sent = await sessionOf(host).evaluate(() => window.__lsSent);
    expect(sent.length).toBe(afterBurst.snapshotsSent);
    for (const text of sent) {
      const msg = JSON.parse(text);
      expect(Object.keys(msg).sort()).toEqual(['payload', 'type', 'v']);
      expect(msg).toMatchObject({ v: 0, type: 'battlemap-snapshot' });
      expect(Object.keys(msg.payload).sort()).toEqual(['background', 'grid', 'map', 'mapTransform', 'measurements', 'revision', 'schema', 'tokens', 'version']);
      for (const t of msg.payload.tokens) {
        expect(Object.keys(t).sort()).toEqual(['assetId', 'aura', 'conditions', 'h', 'id', 'name', 'presetId', 'rot', 'visionCone', 'w', 'x', 'y']);
        expect([t.aura, t.visionCone]).toEqual([null, null]); // none set on this map (Milestone 4)
      }
      expect(text).not.toMatch(/"hp"|maxHp|imgSrc|data:image|\/images\/|"selected"|"view"|fog/i);
    }

    // 11-12: an old snapshot arrives late (replayed on the real channel): the player ignores it.
    const playerBefore = await playerModel(player);
    const session = sessionOf(host); // it owns the channel the old message is replayed on
    await session.evaluate(() => {
      window.__lsOld = window.__lsSent[1];
      window.__lsLatest = window.__lsSent[window.__lsSent.length - 1];
    });
    const stale = await session.evaluate(() => {
      window.__lsChannels[0].send(window.__lsOld);
      return JSON.parse(window.__lsOld).payload.revision;
    });
    expect(stale).toBeLessThan(latest.revision);
    await expect.poll(async () => (await diagnostics(player)).snapshots.snapshotsIgnoredStale).toBe(1);
    expect(await playerModel(player)).toEqual(playerBefore);
    // The latest revision again (a duplicate) is ignored too.
    expect(await session.evaluate(() => JSON.parse(window.__lsLatest).payload.revision)).toBe(latest.revision);
    await session.evaluate(() => window.__lsChannels[0].send(window.__lsLatest));
    await expect.poll(async () => (await diagnostics(player)).snapshots.snapshotsIgnoredStale).toBe(2);
    expect(await playerModel(player)).toEqual(playerBefore);
    await expect(player.getByTestId('map-status')).toHaveText(`Live — revision ${latest.revision}`);
    const playerDiag = (await diagnostics(player)).snapshots;
    expect(playerDiag).toMatchObject({ lastSnapshotAppliedRevision: latest.revision, lastSnapshotReceivedRevision: latest.revision, snapshotsRejectedInvalid: 0 });
    expect(JSON.stringify(await diagnostics(player))).not.toContain('Fighter');

    // The DM ends the session (on the session page): the player keeps the last map, marked disconnected.
    await session.getByTestId('end-session').click();
    await expect(player.getByTestId('map-status')).toHaveText(`Disconnected — showing the last map received (revision ${latest.revision})`);
    expect(await playerModel(player)).toEqual(playerBefore);

    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('malformed or hostile snapshots are rejected or rendered as plain text, never as markup', async ({ browser }) => {
    const { hostContext, host, hostErrors } = await startSharing(browser);
    await addPresetToken(host, 'Rogue');
    const { playerContext, player, playerErrors } = await joinAsPlayer(browser, host);
    await expectConverged(host, player);
    const good = await playerModel(player);

    // Malformed: rejected and counted; the map stays as it was. (Sent from the session page's channel.)
    await sessionOf(host).evaluate(() => {
      const base = JSON.parse(window.__lsSent[0]);
      const send = (msg) => window.__lsChannels[0].send(JSON.stringify(msg));
      send({ ...base, payload: { ...base.payload, revision: 1e9, schema: 'something.else' } });
      send({ ...base, payload: { ...base.payload, revision: 1e9, version: 5 } }); // newer than this player
      send({ ...base, payload: { ...base.payload, revision: 1e9, version: 3 } }); // a 2.3.29 host's
      send({ ...base, payload: { ...base.payload, revision: 1e9, tokens: [{ ...base.payload.tokens[0], aura: { radius: 2, color: 'red;fill:url(https://evil.example/x)' } }] } });
      send({ ...base, payload: { ...base.payload, revision: '1000' } });
      send({ ...base, payload: { ...base.payload, revision: 1e9, tokens: [{ ...base.payload.tokens[0], x: 'NaN' }] } });
      send({ ...base, payload: { ...base.payload, revision: 1e9, tokens: Array(501).fill(base.payload.tokens[0]) } });
    });
    await expect.poll(async () => (await diagnostics(player)).snapshots.snapshotsRejectedInvalid).toBe(7);
    expect(await playerModel(player)).toEqual(good);

    // A newer snapshot whose name is markup: drawn as text, no element is created from it.
    await sessionOf(host).evaluate(() => {
      const base = JSON.parse(window.__lsSent[0]);
      const tokens = [{ ...base.payload.tokens[0], name: '<img src=x onerror="window.__pwned=1">', conditions: ['<b>bold</b>'] }];
      window.__lsChannels[0].send(JSON.stringify({ ...base, payload: { ...base.payload, revision: 1e6, tokens, extra: { hp: 5 } } }));
    });
    await expect(player.locator('.ls-token-name')).toHaveText('<img src=x onerror="window.__pwned=1">');
    await expect(player.locator('.ls-token-conditions')).toHaveText('<b>bold</b>');
    await expect(player.locator('[data-testid="player-map"] img, [data-testid="player-map"] b')).toHaveCount(0);
    expect(await player.evaluate(() => window.__pwned)).toBeUndefined();

    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('the Battle Map opens no connection of its own, and shows no Live Share panel without a session page', async ({ browser }) => {
    const countConnections = () => {
      window.__peerConnections = 0;
      const PC = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...args) {
        window.__peerConnections += 1;
        return new PC(...args);
      };
    };
    // Alone: no panel, no connection.
    const alone = await browser.newContext();
    await alone.addInitScript(countConnections);
    const page = await alone.newPage();
    await page.goto('/battlemap');
    await page.waitForFunction(() => window.BattleMapLiveShare);
    await page.waitForTimeout(500);
    await expect(page.locator('#bm-live-share')).toHaveCount(0);
    expect(await page.evaluate(() => window.__peerConnections)).toBe(0);
    await alone.close();

    // With a running session and a player: the panel appears, but every connection is the session
    // page's; the Battle Map itself still creates none.
    const { hostContext, host } = await startSharing(browser);
    await hostContext.addInitScript(countConnections); // counting from the start of the page load
    await host.reload();
    await host.waitForFunction(() => window.BattleMapLiveShare);
    const { playerContext, player } = await joinAsPlayer(browser, host);
    await expect(player.getByTestId('map-section')).toBeVisible();
    await expect(host.getByTestId('bm-live-share-status')).toHaveAttribute('data-state', 'active');
    await save(host);
    await host.waitForTimeout(500);
    expect(await host.evaluate(() => window.__peerConnections)).toBe(0);
    expect(await host.evaluate(() => typeof window.__lsChannels === 'undefined' || window.__lsChannels.length === 0)).toBe(true);
    expect(await sessionOf(host).evaluate(() => window.__lsChannels.length)).toBe(1);
    await hostContext.close();
    await playerContext.close();
  });
});
