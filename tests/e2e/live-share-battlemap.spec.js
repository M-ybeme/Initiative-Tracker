// Live Share Milestone 2: the DM edits the real Battle Map (battlemap.html?liveshare=1) and a player
// in a separate browser context (liveshare-dev.html) renders the structured state it receives over
// a real RTCDataChannel, through the local relay (port 8788, started by playwright.config.js).
//
// The player's drawing is compared with the host's own player-safe snapshot
// (window.BattleMapLiveShare.getPlayerSafeState(), the Milestone 1 seam), so "converged" means the
// same revision and the same geometry, names and conditions. No images are asserted: map and token
// assets arrive in Milestone 3.
import { test, expect } from '@playwright/test';
import { RELAY } from '../helpers/live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

const HOST_PAGE = `/battlemap?liveshare=1&relay=${RELAY}`;

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

// Record every data-channel message the host sends (and the channel), so the test can check what
// left the page and replay an old snapshot later, exactly as a delayed network message would arrive.
function recordChannelSends() {
  const send = RTCDataChannel.prototype.send;
  window.__lsSent = [];
  window.__lsChannels = [];
  RTCDataChannel.prototype.send = function (data) {
    if (!window.__lsChannels.includes(this)) window.__lsChannels.push(this);
    window.__lsSent.push(data);
    return send.call(this, data);
  };
}

const hostSnapshot = (page) => page.evaluate(() => window.BattleMapLiveShare.getPlayerSafeState());
const diagnostics = async (page) => JSON.parse(await page.getByTestId('diagnostics').textContent());

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
        const ellipse = g.querySelector('ellipse');
        return {
          id: g.getAttribute('data-token-id'),
          cx,
          cy,
          deg,
          w: Number(ellipse.getAttribute('rx')) * 2,
          h: Number(ellipse.getAttribute('ry')) * 2,
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
        return JSON.stringify(got) === JSON.stringify(expected);
      },
      { timeout: 10000, message: 'player converges on the host snapshot' }
    )
    .toBe(true)
    .catch((err) => {
      throw new Error(`${err.message}\nhost:   ${JSON.stringify(expected)}\nplayer: ${JSON.stringify(got)}`);
    });
  return expected;
}

async function startSharing(browser) {
  const hostContext = await browser.newContext();
  await hostContext.addInitScript(recordChannelSends);
  const host = await hostContext.newPage();
  const hostErrors = watchErrors(host);
  await host.goto(HOST_PAGE);
  await host.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
  await expect(host.getByTestId('host-status')).toHaveText('Not started');
  return { hostContext, host, hostErrors };
}

async function joinAsPlayer(browser, host) {
  await host.getByTestId('start-room').click();
  await expect(host.getByTestId('host-status')).toHaveText('Room open — waiting for players');
  const joinUrl = await host.getByTestId('join-link').textContent();
  expect(joinUrl).toMatch(/\/liveshare-dev\?.*#room=[A-Za-z0-9_-]{22}$/);
  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  const playerErrors = watchErrors(player);
  await player.goto(joinUrl);
  await expect(player.getByTestId('player-status')).toHaveText('Connected to host', { timeout: 20000 });
  return { playerContext, player, playerErrors };
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
    // No images, no HP, no editor controls on the player.
    await expect(player.locator('[data-testid="player-map"] image, [data-testid="player-map"] foreignObject')).toHaveCount(0);
    await expect(player.getByTestId('player-map')).not.toContainText('17');

    // 7-8: the DM drags the token (up and left, clear of the Live Share panel); the player follows.
    const moved = { x: at.x - 160, y: at.y - 60 };
    await drag(host, at, moved);
    await expect.poll(async () => (await hostSnapshot(host)).revision).toBeGreaterThan(before.revision);
    expected = await expectConverged(host, player);
    expect(expected.tokens[0].cx).not.toBe(before.tokens[0].x + before.tokens[0].w / 2);

    // A condition, through the real status dialog.
    await tokenMenu(host, moved, 'addStatus');
    await host.locator('#statusCheckboxes input[value="Prone"]').check();
    await host.locator('#statusSaveBtn').click();
    await expect(player.locator('.ls-token-conditions')).toHaveText('Prone');

    // A persistent measurement.
    await host.locator('#tabMeasure').click();
    await host.locator('#persistentMeasureToggle').click();
    await host.locator('#measureToggle').click();
    const measureFrom = { x: at.x + 40, y: at.y - 200 };
    await drag(host, measureFrom, { x: measureFrom.x + 250, y: measureFrom.y }, 5);
    await host.locator('#measureToggle').click();
    await host.locator('#persistentMeasureToggle').click();
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

    // 9-10: a burst of rapid edits: rotate, resize, drag, grid size. The player converges on the last one.
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
    const final = await hostSnapshot(host);
    expect(final.grid.size).toBe(64);
    expect(final.tokens[0].rot).toBeCloseTo((5 * Math.PI) / 12, 5);
    expected = await expectConverged(host, player);
    expect(expected.revision).toBe(final.revision);
    expect((await playerModel(player)).grid.size).toBe(64);
    // Throttled: far fewer snapshots than revisions during the burst, and change signals were folded.
    // (The host panel refreshes its diagnostics twice a second.)
    await expect.poll(async () => (await diagnostics(host)).snapshots.lastSnapshotSentRevision).toBe(final.revision);
    const afterBurst = (await diagnostics(host)).snapshots;
    const burstRevisions = final.revision - revisionBeforeBurst;
    expect(burstRevisions).toBeGreaterThan(10);
    expect(afterBurst.snapshotsSent - sentBeforeBurst).toBeLessThan(burstRevisions);
    expect(afterBurst.lastSnapshotSentRevision).toBe(final.revision);
    expect(afterBurst.pendingSnapshot).toBe(false);

    // Nothing private ever left the host page: no HP, images, editor state or fog.
    const sent = await host.evaluate(() => window.__lsSent);
    expect(sent.length).toBe(afterBurst.snapshotsSent);
    for (const text of sent) {
      const msg = JSON.parse(text);
      expect(Object.keys(msg).sort()).toEqual(['payload', 'type', 'v']);
      expect(msg).toMatchObject({ v: 0, type: 'battlemap-snapshot' });
      expect(Object.keys(msg.payload).sort()).toEqual(['grid', 'map', 'mapTransform', 'measurements', 'revision', 'schema', 'tokens', 'version']);
      for (const t of msg.payload.tokens) expect(Object.keys(t).sort()).toEqual(['conditions', 'h', 'id', 'name', 'rot', 'w', 'x', 'y']);
      expect(text).not.toMatch(/"hp"|maxHp|imgSrc|data:image|\/images\/|"selected"|"view"|fog|aura|visionCone/i);
    }

    // 11-12: an old snapshot arrives late (replayed on the real channel): the player ignores it.
    const playerBefore = await playerModel(player);
    await host.evaluate(() => {
      window.__lsOld = window.__lsSent[1];
      window.__lsLatest = window.__lsSent[window.__lsSent.length - 1];
    });
    const stale = await host.evaluate(() => {
      window.__lsChannels[0].send(window.__lsOld);
      return JSON.parse(window.__lsOld).payload.revision;
    });
    expect(stale).toBeLessThan(final.revision);
    await expect.poll(async () => (await diagnostics(player)).snapshots.snapshotsIgnoredStale).toBe(1);
    expect(await playerModel(player)).toEqual(playerBefore);
    // The latest revision again (a duplicate) is ignored too.
    expect(await host.evaluate(() => JSON.parse(window.__lsLatest).payload.revision)).toBe(final.revision);
    await host.evaluate(() => window.__lsChannels[0].send(window.__lsLatest));
    await expect.poll(async () => (await diagnostics(player)).snapshots.snapshotsIgnoredStale).toBe(2);
    expect(await playerModel(player)).toEqual(playerBefore);
    await expect(player.getByTestId('map-status')).toHaveText(`Live — revision ${final.revision}`);
    const playerDiag = (await diagnostics(player)).snapshots;
    expect(playerDiag).toMatchObject({ lastSnapshotAppliedRevision: final.revision, lastSnapshotReceivedRevision: final.revision, snapshotsRejectedInvalid: 0 });
    expect(JSON.stringify(await diagnostics(player))).not.toContain('Fighter');

    // The DM ends the session: the player keeps the last map, marked disconnected.
    await host.getByTestId('end-session').click();
    await expect(player.getByTestId('map-status')).toHaveText(`Disconnected — showing the last map received (revision ${final.revision})`);
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

    // Malformed: rejected and counted; the map stays as it was.
    await host.evaluate(() => {
      const base = JSON.parse(window.__lsSent[0]);
      const send = (msg) => window.__lsChannels[0].send(JSON.stringify(msg));
      send({ ...base, payload: { ...base.payload, revision: 1e9, schema: 'something.else' } });
      send({ ...base, payload: { ...base.payload, revision: 1e9, version: 2 } });
      send({ ...base, payload: { ...base.payload, revision: '1000' } });
      send({ ...base, payload: { ...base.payload, revision: 1e9, tokens: [{ ...base.payload.tokens[0], x: 'NaN' }] } });
      send({ ...base, payload: { ...base.payload, revision: 1e9, tokens: Array(501).fill(base.payload.tokens[0]) } });
    });
    await expect.poll(async () => (await diagnostics(player)).snapshots.snapshotsRejectedInvalid).toBe(5);
    expect(await playerModel(player)).toEqual(good);

    // A newer snapshot whose name is markup: drawn as text, no element is created from it.
    await host.evaluate(() => {
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

  test('without ?liveshare=1 the Battle Map has no Live Share panel and opens no connections', async ({ page }) => {
    await page.addInitScript(() => {
      window.__peerConnections = 0;
      const PC = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...args) {
        window.__peerConnections += 1;
        return new PC(...args);
      };
    });
    await page.goto('/battlemap');
    await page.waitForFunction(() => window.BattleMapLiveShare && window.BattleMapLiveShare.getPlayerSafeState());
    await expect(page.locator('#bm-live-share')).toHaveCount(0);
    expect(await page.evaluate(() => window.__peerConnections)).toBe(0);
  });
});
