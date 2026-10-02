// Live Share Milestone 3: the player-visible background and custom token art, end to end, on the
// real Battle Map (battlemap.html?liveshare=1) with a player in a separate context
// (liveshare-dev.html), over a real RTCDataChannel through the local relay.
//
// The map is imported through the Battle Map's own "Import JSON" input: a generated map image with
// a distinctive secret (a magenta/white checkerboard) under a fog cover shape, plus tokens. Every
// other change is made through the Battle Map UI. What the player received is checked by decoding
// the background it displays; what left the host is checked from a log of every data-channel send.
import { test, expect } from '@playwright/test';
import {
  HOST_PAGE,
  SECRET,
  hostSnapshot,
  diagnostics,
  sentText,
  sentMetas,
  makeMap,
  makeTokenPng,
  save,
  importMap,
  screenOf,
  startAndJoin,
  openHost,
  openPanel,
  playerBackgroundPixels,
  near,
} from '../helpers/battlemap-live-share.js';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

test.describe('Live Share player-visible background and assets (Milestone 3)', () => {
  test('the player gets the fogged map, custom token art once, and markers otherwise; nothing hidden is sent', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);

    // 1-2: a real map image with a secret under a fog cover shape, a preset token (generic art) and
    // a token whose image is on another origin without CORS (the host cannot read it).
    const mapUrl = await makeMap(host);
    const external = 'http://127.0.0.1:3100/images/playerTokens/PlayerBardToken.png';
    await importMap(host, mapUrl, {
      tokens: [
        { id: 't_generic', name: 'Bard', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, showLabel: true },
        { id: 't_external', name: 'Guest', imgSrc: external, x: 200, y: 400, w: 50, h: 50, rot: 0 },
      ],
    });
    await expect.poll(async () => (await hostSnapshot(host)).background, { timeout: 10000 }).not.toBeNull();
    const first = await hostSnapshot(host);
    expect(first.background).toEqual({ assetId: expect.stringMatching(/^[0-9a-f]{64}$/), revision: 1 });
    expect(first.tokens.map((t) => t.assetId)).toEqual([null, null]); // generic art; unreadable external art
    // 2.3.30: the preset is named by its id; the external image is not, although its path is a preset's.
    expect(first.tokens.map((t) => t.presetId)).toEqual(['player-bard', null]);

    // 3-6: the player joins: structured state first (markers, placeholder), then the background.
    const { playerContext, player, playerErrors } = await startAndJoin(browser, host);
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 10000 });
    expect(await player.evaluate(() => window.__lsFirstRender)).toEqual({ tokens: 2, background: false });
    await expect(player.getByTestId('map-assets')).toHaveText('Map image shown.');
    expect(await player.locator('.ls-background-image').getAttribute('data-asset-id')).toBe(first.background.assetId);
    // 2.3.30: the built-in image, from the player's own site; the external image stays a marker.
    await expect(player.locator('[data-token-id="t_generic"]')).toHaveAttribute('data-art', 'preset');
    expect(await player.locator('[data-token-id="t_generic"] .ls-token-art').getAttribute('href')).toBe('/images/playerTokens/PlayerBardToken.png');
    await expect(player.locator('[data-token-id="t_external"]')).toHaveAttribute('data-art', 'marker'); // 17-18: fallback

    // Placement: the background covers the map's world rectangle, under the grid and tokens.
    const bgBox = await player.locator('.ls-background-image').evaluate((el) => ['x', 'y', 'width', 'height'].map((a) => el.getAttribute(a)));
    expect(bgBox).toEqual(['0', '0', '800', '600']);
    const layerOrder = await player.evaluate(() => [...document.querySelector('[data-testid="player-map"]').children].map((n) => n.getAttribute('class')));
    expect(layerOrder.indexOf('ls-background-image')).toBeLessThan(layerOrder.indexOf('ls-grid'));
    expect(layerOrder.indexOf('ls-grid')).toBeLessThan(layerOrder.indexOf('ls-tokens'));

    // 7-8: visible areas match the source; the covered secret is solid fog, with nothing of the
    // magenta/white checkerboard recoverable from the decoded pixels.
    const seen = await playerBackgroundPixels(player, [
      { x: 100, y: 300 },
      { x: 700, y: 500 },
      { x: SECRET.x, y: SECRET.y, w: SECRET.w, h: SECRET.h },
    ]);
    expect([seen.width, seen.height]).toEqual([800, 600]);
    expect(near(seen.pixels[0][0], [0x20, 0x80, 0x40])).toBe(true);
    expect(near(seen.pixels[1][0], [0x20, 0x40, 0x80])).toBe(true);
    const hidden = seen.pixels[2];
    expect(hidden).toHaveLength(SECRET.w * SECRET.h);
    for (const px of hidden) expect(px[0] + px[1] + px[2]).toBeLessThan(24); // opaque black fog
    const spread = Math.max(...hidden.map((p) => p[0] + p[1] + p[2])) - Math.min(...hidden.map((p) => p[0] + p[1] + p[2]));
    expect(spread).toBeLessThan(12); // no trace of the checkerboard

    // 9-10: moving a token sends structured state only: no new background, no asset transfer.
    const rebuilds = () => host.evaluate(() => window.BattleMapLiveShare.getAssetDiagnostics().background.rebuilds);
    const backgroundMetas = async () => (await sentMetas(host)).filter((m) => m.asset.kind === 'background').length;
    const rebuildsBefore = await rebuilds();
    const metasBefore = await backgroundMetas();
    const from = await screenOf(host, 125, 125);
    await host.mouse.move(from.x, from.y);
    await host.mouse.down();
    await host.mouse.move(from.x + 90, from.y + 60, { steps: 10 });
    await host.mouse.up();
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[0].x).not.toBe(100);
    const moved = await hostSnapshot(host);
    await expect(player.locator('.ls-token-body').first()).toHaveAttribute('transform', new RegExp(`^translate\\(${moved.tokens[0].x + 25} `));
    // A rebuild would start up to 250 ms after a change (1 s at most during continuous changes) and
    // then take time to encode: wait well past that window before checking nothing happened.
    await host.waitForTimeout(1500);
    expect((await hostSnapshot(host)).background).toEqual(first.background);
    expect(await rebuilds()).toBe(rebuildsBefore);
    expect(await backgroundMetas()).toBe(metasBefore);

    // 11-12: a fog change (a new cover shape at the view centre) makes a new background revision.
    await host.locator('#fogCover').click();
    await host.locator('#addFogShape').click();
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).background.revision, { timeout: 10000 }).toBe(2);
    const refogged = await hostSnapshot(host);
    expect(refogged.background.assetId).not.toBe(first.background.assetId);
    await expect(player.locator('.ls-background-image')).toHaveAttribute('data-asset-id', refogged.background.assetId, { timeout: 10000 });

    // 13-14: custom token art, uploaded through the Battle Map, appears on the player.
    const art = await makeTokenPng(host);
    await openPanel(host, 'accTokens');
    await host.locator('#tokenFile').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: art });
    await host.locator('#tokenName').fill('Hero');
    await host.locator('#addToken').click();
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty'); // placed
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[2]?.assetId ?? '', { timeout: 10000 }).toMatch(/^[0-9a-f]{64}$/);
    const withArt = await hostSnapshot(host);
    const heroId = withArt.tokens[2].id;
    const artId = withArt.tokens[2].assetId;
    await expect(player.locator(`[data-token-id="${heroId}"]`)).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    const artPixel = await player.evaluate(async (heroId) => {
      const href = document.querySelector(`[data-token-id="${heroId}"] .ls-token-art`).getAttribute('href');
      const bitmap = await createImageBitmap(await (await fetch(href)).blob());
      const c = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
      const g = c.getContext('2d');
      g.drawImage(bitmap, 0, 0);
      return [Array.from(g.getImageData(8, 8, 1, 1).data.slice(0, 3)), Array.from(g.getImageData(8, 32, 1, 1).data.slice(0, 3))];
    }, heroId);
    expect(near(artPixel[0], [0xff, 0x80, 0x00])).toBe(true);
    expect(near(artPixel[1], [0xff, 0xff, 0xff])).toBe(true);

    // 15-16: a second token with the same art reuses the asset: it is not sent again.
    const tokenMetas = async () => (await sentMetas(host)).filter((m) => m.asset.kind === 'token');
    await expect.poll(async () => (await tokenMetas()).length).toBe(1);
    await host.locator('#tokenFile').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: art });
    await host.locator('#addToken').click();
    await expect(host.getByTestId('save-map')).toHaveAttribute('data-state', 'dirty'); // placed
    await save(host);
    await expect.poll(async () => (await hostSnapshot(host)).tokens.length).toBe(4);
    await expect.poll(async () => (await hostSnapshot(host)).tokens[3].assetId).toBe(artId);
    const secondId = (await hostSnapshot(host)).tokens[3].id;
    await expect(player.locator(`[data-token-id="${secondId}"]`)).toHaveAttribute('data-art', 'image', { timeout: 10000 });
    expect((await tokenMetas()).length).toBe(1);
    expect(await player.locator(`[data-token-id="${secondId}"] .ls-token-art`).getAttribute('href')).toBe(
      await player.locator(`[data-token-id="${heroId}"] .ls-token-art`).getAttribute('href')
    );

    // Privacy: nothing that left the host is the source map, fog state, a token source or HP.
    const texts = await sentText(host);
    for (const text of texts) {
      expect(text).not.toMatch(/data:image|imgSrc|127\.0\.0\.1|playerTokens|fogShapes|fogState|"fog"|"cover"|"reveal"|"hp"|maxHp/);
    }
    const binaries = await host.evaluate(() => window.__lsSent.filter((m) => typeof m !== 'string'));
    const PNG = [0x89, 0x50, 0x4e, 0x47];
    for (const b of binaries) {
      // Chunk payloads start at byte 37: none is a PNG (the source map and uploaded art are PNGs;
      // what is sent is the re-encoded WebP composite and WebP token art).
      expect(b.head.slice(37, 41)).not.toEqual(PNG);
    }
    const metas = await sentMetas(host);
    expect(metas.map((m) => m.asset.mime)).toEqual(metas.map(() => 'image/webp'));
    // Only content-derived ids in the structured snapshots.
    const snapshots = texts.map((t) => JSON.parse(t)).filter((m) => m.type === 'battlemap-snapshot');
    for (const s of snapshots) {
      if (s.payload.background) expect(Object.keys(s.payload.background).sort()).toEqual(['assetId', 'revision']);
      for (const t of s.payload.tokens) expect(t.assetId === null || /^[0-9a-f]{64}$/.test(t.assetId)).toBe(true);
    }

    // Diagnostics: counts and ids, no bytes or sources.
    const hostDiag = await diagnostics(host);
    expect(hostDiag.preparedAssets.background).toMatchObject({ status: 'ready', revision: 2, mime: 'image/webp' });
    expect(hostDiag.preparedAssets.tokens).toMatchObject({ unreadable: 1 });
    await expect.poll(async () => (await diagnostics(host)).assets.sent).toBeGreaterThanOrEqual(3);
    const playerDiag = await diagnostics(player);
    expect(playerDiag.assets).toMatchObject({ failed: 0, rejected: 0 });
    expect(playerDiag.assets.deduplicated).toBeGreaterThan(0);
    expect(JSON.stringify(hostDiag) + JSON.stringify(playerDiag)).not.toMatch(/data:|blob:|127\.0\.0\.1|playerTokens/);

    // 19-20: the DM ends the session: every object URL is revoked; the structured map stays.
    const liveBefore = await player.evaluate(() => [...window.__lsUrls.created].filter((u) => !window.__lsUrls.revoked.has(u)).length);
    expect(liveBefore).toBeGreaterThanOrEqual(2); // background + token art
    await host.getByTestId('end-session').click();
    await expect(player.getByTestId('map-status')).toContainText('Disconnected', { timeout: 10000 });
    await expect.poll(() => player.evaluate(() => [...window.__lsUrls.created].filter((u) => !window.__lsUrls.revoked.has(u)).length)).toBe(0);
    await expect(player.locator('.ls-background-image, [data-art="image"]')).toHaveCount(0);
    await expect(player.locator('.ls-token')).toHaveCount(4);

    // The only expected errors: the browser refusing the host's CORS read of the external token
    // image (reported twice, both naming that URL).
    expect(hostErrors.filter((e) => !e.includes(external))).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('a large background is chunked, paced by backpressure, and does not hold up structured updates', async ({ browser }) => {
    test.setTimeout(120000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const mapUrl = await makeMap(host, { width: 3000, height: 3000, noise: true });
    await importMap(host, mapUrl, {
      tokens: [{ id: 't_a', name: 'A', imgSrc: '/images/playerTokens/PlayerBardToken.png', x: 100, y: 100, w: 50, h: 50, rot: 0, selected: true }],
      fogShapes: [],
    });
    await expect.poll(async () => (await hostSnapshot(host)).background, { timeout: 20000 }).not.toBeNull();

    // As soon as the background's metadata goes out, rotate the token: a structured change made
    // while the transfer runs.
    await host.evaluate(() => {
      window.__lsOnSend = (data) => {
        if (typeof data === 'string' && data.includes('"asset-meta"') && data.includes('"background"')) {
          window.__lsOnSend = null;
          setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true })); // and save it
          }, 0);
        }
      };
    });
    const { playerContext, player, playerErrors } = await startAndJoin(browser, host);
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 30000 });

    const log = await player.evaluate(() => window.__lsLog);
    const meta = log.findIndex((m) => m.type === 'asset-meta' && m.kind === 'background');
    const chunks = log.map((m, i) => (m.type === 'chunk' ? i : -1)).filter((i) => i > meta);
    expect(chunks.length).toBeGreaterThan(100); // many 16 KiB chunks
    const lastChunk = chunks[chunks.length - 1];
    // A snapshot for the rotation arrived between the first and the last chunk.
    const during = log.slice(meta, lastChunk).filter((m) => m.type === 'battlemap-snapshot');
    expect(during.length).toBeGreaterThan(0);
    await expect.poll(async () => Number(await player.getByTestId('player-map').getAttribute('data-revision'))).toBe((await hostSnapshot(host)).revision);
    const playerDiag = await diagnostics(player);
    expect(playerDiag.assets).toMatchObject({ received: 1, failed: 0, rejected: 0 });

    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('a saved fog bitmap that cannot be decoded covers the whole map: the source never reaches the player', async ({ browser }) => {
    test.setTimeout(90000);
    const { hostContext, host, hostErrors } = await openHost(browser);
    const warnings = [];
    host.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    const mapUrl = await makeMap(host);
    // A corrupt fog bitmap in the saved map (and no fog shapes): previously the fog stayed cleared.
    await importMap(host, mapUrl, { tokens: [], fogShapes: [], fog: 'data:image/png;base64,bm90IGFuIGltYWdl' });
    await expect.poll(async () => (await hostSnapshot(host)).background, { timeout: 10000 }).not.toBeNull();
    expect(warnings.some((w) => w.includes('Saved fog could not be loaded'))).toBe(true);

    const { playerContext, player, playerErrors } = await startAndJoin(browser, host);
    await expect(player.locator('.ls-background-image')).toHaveCount(1, { timeout: 10000 });
    // The raster the player received: fully covered, nothing of the map anywhere.
    const seen = await playerBackgroundPixels(player, [
      { x: 0, y: 0, w: 800, h: 600 },
    ]);
    const pixels = seen.pixels[0];
    expect(pixels).toHaveLength(800 * 600);
    const maxBrightness = pixels.reduce((m, p) => Math.max(m, p[0] + p[1] + p[2]), 0);
    expect(maxBrightness).toBeLessThan(24); // no green, blue, magenta or white survives

    expect(hostErrors).toEqual([]);
    expect(playerErrors).toEqual([]);
    await hostContext.close();
    await playerContext.close();
  });

  test('without ?liveshare=1 the Battle Map composes, encodes and hashes nothing', async ({ browser }) => {
    test.setTimeout(90000);
    // Count every way the page could encode an image or hash one.
    const instrument = () => {
      window.__encodes = 0;
      window.__digests = 0;
      window.__peerConnections = 0;
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (...a) {
        window.__encodes += 1;
        return toBlob.apply(this, a);
      };
      if (window.OffscreenCanvas) {
        const convert = OffscreenCanvas.prototype.convertToBlob;
        OffscreenCanvas.prototype.convertToBlob = function (...a) {
          window.__encodes += 1;
          return convert.apply(this, a);
        };
      }
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest = (...a) => {
        window.__digests += 1;
        return digest(...a);
      };
      const PC = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...a) {
        window.__peerConnections += 1;
        return new PC(...a);
      };
    };
    const run = async (url) => {
      const context = await browser.newContext();
      await context.addInitScript(instrument);
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForFunction(() => window.BattleMapLiveShare);
      // A map with fog and a custom (uploaded) token: everything that would be prepared for sharing.
      await importMap(page, await makeMap(page), { tokens: [{ id: 't_art', name: 'Art', imgSrc: `data:image/png;base64,${(await makeTokenPng(page)).toString('base64')}`, x: 100, y: 100, w: 50, h: 50, rot: 0 }] });
      await page.locator('#fogCover').click();
      await page.locator('#addFogShape').click(); // a fog change after load, too
      await save(page);
      await page.waitForTimeout(2000); // past any rebuild window
      const result = await page.evaluate(() => ({
        encodes: window.__encodes,
        digests: window.__digests,
        peerConnections: window.__peerConnections,
        diagnostics: window.BattleMapLiveShare.getAssetDiagnostics(),
        snapshot: window.BattleMapLiveShare.getPlayerSafeState(),
        panel: !!document.getElementById('bm-live-share'),
      }));
      await context.close();
      return result;
    };

    const plain = await run('/battlemap');
    expect(plain).toMatchObject({ encodes: 0, digests: 0, peerConnections: 0, diagnostics: null, panel: false });
    expect(plain.snapshot.background).toBeNull();
    expect(plain.snapshot.tokens.map((t) => t.assetId)).toEqual([null]);

    // Control: the same steps in Live Share mode do encode and hash, so the counters see the work.
    const sharing = await run(HOST_PAGE);
    expect(sharing.encodes).toBeGreaterThan(0);
    expect(sharing.digests).toBeGreaterThan(0);
    expect(sharing.snapshot.background).not.toBeNull();
    expect(sharing.snapshot.tokens[0].assetId).toMatch(/^[0-9a-f]{64}$/);
  });
});
