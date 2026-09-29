// Live Share Milestone 0 with the browser's default candidate gathering. Real Chrome hides local
// addresses behind mDNS names (<uuid>.local); this spec runs the "hello" flow that way, without the
// mDNS switch live-share-networking.spec.js launches Chromium with, and checks every ICE candidate
// is generated, relayed and applied on both sides.
import { test, expect } from '@playwright/test';
import { startHost, diagnostics, expectCandidatePathComplete } from '../helpers/live-share.js';

test.describe('Live Share networking with default browser candidate gathering', () => {
  test('mDNS host candidates are generated, relayed and applied on both sides, and "hello" arrives', async ({ browser }) => {
    const host = await startHost(browser);
    const playerContext = await browser.newContext();
    const player = await playerContext.newPage();
    await player.goto(host.joinUrl);
    await expect(player.getByTestId('received-message')).toHaveText('hello', { timeout: 20000 });
    const counts = await expectCandidatePathComplete(host.page, player);
    // Each side received exactly the candidate types the other generated. (Which types exist depends
    // on the machine: Chrome drops an mDNS host candidate whose .local name it could not register,
    // which happens under load, and then only srflx remains.)
    expect(counts.player.remoteTypes, JSON.stringify(counts)).toEqual(counts.host.localTypes);
    expect(counts.host.remoteTypes, JSON.stringify(counts)).toEqual(counts.player.localTypes);
    // No peer addresses in diagnostics: neither mDNS names nor IPv4 addresses appear in the peer
    // connection details. (The relay's own host is shown separately, and may be 127.0.0.1 here.)
    const peerDiagnostics = async (page) => JSON.stringify((await diagnostics(page)).peers);
    const text = (await peerDiagnostics(host.page)) + (await peerDiagnostics(player));
    expect(text).not.toMatch(/\.local\b|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    await host.context.close();
    await playerContext.close();
  });
});
