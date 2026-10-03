// Live Share Milestone 5A.3: the Battle Map's boundary publication format (battlemap-publication.js)
// and the session host's publication store (publication-store.js): validation, offer / need / asset /
// commit, host-assigned revisions, asset retention, atomicity and races.
import { describe, it, expect, beforeEach } from 'vitest';
import { makeAsset, battleMapContent } from '../helpers/live-share-boundary.js';
import { validateBattleMapPublication, toBattleMapSnapshot, fromProjection, battleMapSurface } from '../../js/modules/live-share/battlemap-publication.js';
import { createPublicationStore, MAX_TOKEN_ART_BYTES } from '../../js/modules/live-share/publication-store.js';
import { validateBattleMapSnapshot, MAX_TOKENS } from '../../js/modules/live-share/battlemap-snapshot.js';
import { encodeBattleMapSnapshot, parseChannelMessage } from '../../js/modules/live-share/protocol.js';

const BM = 'battle-map';
const A = 'a1b2c3d4e5f6a7b8'; // instance ids (format checked by the boundary, not the store)
const B = 'b1b2c3d4e5f6a7b8';

describe('Battle Map boundary content (battlemap-publication.js)', () => {
  it('a projection becomes revisionless content that validates, and the host snapshot passes the players’ own checks', async () => {
    const bg = await makeAsset('background');
    const content = battleMapContent({ background: bg.meta.assetId });
    expect(content.revision).toBeUndefined();
    expect(content.background).toEqual({ assetId: bg.meta.assetId }); // the surface's revision 41 is gone
    const checked = validateBattleMapPublication(content);
    expect(checked.ok).toBe(true);
    expect([...checked.refs]).toEqual([[bg.meta.assetId, 'background']]);
    const wire = toBattleMapSnapshot(checked.content, { revision: 5, backgroundRevision: 2 });
    expect(wire.background).toEqual({ assetId: bg.meta.assetId, revision: 2 });
    expect(validateBattleMapSnapshot(wire).ok).toBe(true);
    const parsed = parseChannelMessage(encodeBattleMapSnapshot(wire).text);
    expect(parsed.ok && parsed.message.snapshot.revision).toBe(5);
  });

  it('refuses a revision from the surface, top level or background, instead of trusting it', () => {
    const content = battleMapContent({ background: 'c'.repeat(64) });
    expect(validateBattleMapPublication({ ...content, revision: 99 })).toMatchObject({ ok: false, error: expect.stringMatching(/revision/) });
    expect(validateBattleMapPublication({ ...content, background: { assetId: 'c'.repeat(64), revision: 99 } })).toMatchObject({ ok: false, error: expect.stringMatching(/revision/) });
  });

  it('refuses private or unknown Battle Map fields rather than dropping them', () => {
    const content = battleMapContent();
    const withToken = (extra) => ({ ...content, tokens: [{ ...content.tokens[0], ...extra }] });
    for (const bad of [
      withToken({ hp: 7 }),
      withToken({ maxHp: 12 }),
      withToken({ imgSrc: 'data:image/png;base64,AAAA' }),
      withToken({ visibleToPlayers: false }),
      { ...content, fogShapes: [] },
      { ...content, fog: { dataUrl: 'data:' } },
      { ...content, draft: {} },
      { ...content, map: { ...content.map, image: 'map.png' } },
      { ...content, grid: { ...content.grid, dmNotes: 'trap' } },
      { ...content, background: { assetId: 'c'.repeat(64), url: 'https://example.com/map.png' } },
    ]) {
      expect(validateBattleMapPublication(bad).ok).toBe(false);
    }
  });

  it('refuses everything the players’ validator refuses, and content too large to send', () => {
    const content = battleMapContent();
    expect(validateBattleMapPublication({ ...content, version: 3 }).ok).toBe(false);
    expect(validateBattleMapPublication({ ...content, tokens: [{ ...content.tokens[0], x: 'NaN' }] }).ok).toBe(false);
    expect(validateBattleMapPublication({ ...content, background: { assetId: 'not-an-id' } }).ok).toBe(false);
    expect(validateBattleMapPublication(null).ok).toBe(false);
    expect(validateBattleMapPublication([]).ok).toBe(false);
    const name = 'n'.repeat(200);
    const many = Array.from({ length: MAX_TOKENS }, (_, i) => ({ ...content.tokens[0], id: `t${i}`, name, conditions: Array(32).fill(name) }));
    expect(validateBattleMapPublication({ ...content, tokens: many })).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) });
  });

  it('an asset id cannot be both the background and token art', () => {
    const id = 'd'.repeat(64);
    const content = battleMapContent({ background: id, tokens: [{ id: 't1', x: 0, y: 0, w: 1, h: 1, imgSrc: 'x' }], art: { x: id } });
    expect(validateBattleMapPublication(content).ok).toBe(false);
  });

  it('fromProjection never mutates the projection', () => {
    const projected = { schema: 's', version: 4, revision: 3, background: { assetId: 'e'.repeat(64), revision: 2 } };
    const copy = structuredClone(projected);
    fromProjection(projected);
    expect(projected).toEqual(copy);
  });
});

describe('host publication store', () => {
  let store;
  let bg1;
  let bg2;
  let art1;
  beforeEach(async () => {
    store = createPublicationStore({ surfaces: [battleMapSurface] });
    bg1 = await makeAsset('background', { seed: 1 });
    bg2 = await makeAsset('background', { seed: 2 });
    art1 = await makeAsset('token', { seed: 3 });
  });
  const offer = (instanceId, publicationSeq, structured, assets = []) => store.offer(BM, { instanceId, publicationSeq, structured, assets: assets.map((a) => a.meta) });
  const send = (instanceId, publicationSeq, asset, overrides = {}) => {
    const { assetId, ...meta } = asset.meta;
    return store.receiveAsset(BM, { instanceId, publicationSeq, assetId, meta, bytes: asset.bytes.slice().buffer, ...overrides });
  };
  const withBg = (asset, tokens) => battleMapContent({ background: asset.meta.assetId, ...(tokens ? { tokens } : {}) });

  it('a publication without assets commits at once with revision 1', () => {
    expect(store.snapshot(BM)).toBeNull();
    expect(offer(A, 1, battleMapContent())).toEqual({ status: 'committed', publicationSeq: 1, revision: 1, changed: true });
    expect(store.snapshot(BM)).toMatchObject({ revision: 1, background: null, tokens: [{ id: 't1' }] });
  });

  it('asks only for missing assets, and commits structured state and assets together once all verified', async () => {
    const content = battleMapContent({ background: bg1.meta.assetId, tokens: [{ id: 't1', x: 0, y: 0, w: 70, h: 70, imgSrc: 'art' }], art: { art: art1.meta.assetId } });
    const result = offer(A, 1, content, [bg1, art1]);
    expect(result.status).toBe('need');
    expect(result.assetIds.sort()).toEqual([bg1.meta.assetId, art1.meta.assetId].sort());
    expect(await send(A, 1, bg1)).toEqual({ status: 'waiting' });
    // Not visible to players yet: no snapshot, no assets, while token art is still missing.
    expect(store.snapshot(BM)).toBeNull();
    expect(store.getAsset(BM, bg1.meta.assetId)).toBeNull();
    expect(await send(A, 1, art1)).toMatchObject({ status: 'committed', publicationSeq: 1, revision: 1 });
    expect(store.snapshot(BM).background).toEqual({ assetId: bg1.meta.assetId, revision: 1 });
    expect(store.getAsset(BM, bg1.meta.assetId)).toMatchObject({ kind: 'background', mime: 'image/png', width: 1400, height: 900 });
    expect(store.getAsset(BM, art1.meta.assetId).bytes).toEqual(art1.bytes);

    // A token-only change: the background is held already, nothing is asked for.
    const moved = battleMapContent({ background: bg1.meta.assetId, tokens: [{ id: 't1', x: 70, y: 0, w: 70, h: 70, imgSrc: 'art' }], art: { art: art1.meta.assetId } });
    expect(offer(A, 2, moved, [bg1, art1])).toMatchObject({ status: 'committed', revision: 2 });
  });

  it('rejects asset bytes that do not hash to their id, with the committed publication untouched', async () => {
    offer(A, 1, withBg(bg1), [bg1]);
    await send(A, 1, bg1);
    const before = store.snapshot(BM);
    offer(A, 2, withBg(bg2), [bg2]);
    const forged = bg1.bytes.slice(); // a valid PNG of the right size, but other bytes
    expect(await send(A, 2, bg2, { bytes: forged.buffer })).toEqual({ status: 'rejected', reason: 'asset-invalid', publicationSeq: 2 });
    expect(store.snapshot(BM)).toBe(before);
    expect(store.hasAsset(BM, bg1.meta.assetId)).toBe(true);
    expect(store.pendingOf(BM)).toBeNull();
  });

  it('rejects wrong byte length, wrong metadata and a wrong image signature', async () => {
    offer(A, 1, withBg(bg1), [bg1]);
    // Refused on its length, before any hashing (an oversized buffer is never hashed).
    expect(await send(A, 1, bg1, { bytes: new Uint8Array(64 * 1024 * 1024).buffer })).toMatchObject({ status: 'rejected', reason: 'asset-invalid' });
    expect(store.diagnostics()[BM].lastError).toMatch(/byte length/);
    offer(A, 11, withBg(bg1), [bg1]);
    expect(await send(A, 11, bg1, { bytes: bg1.bytes.slice(0, 100).buffer })).toMatchObject({ status: 'rejected', reason: 'asset-invalid' });
    offer(A, 2, withBg(bg1), [bg1]);
    const { assetId: _id, ...meta } = bg1.meta;
    expect(await send(A, 2, bg1, { meta: { ...meta, width: 1401 } })).toMatchObject({ status: 'rejected', reason: 'asset-invalid' });
    offer(A, 3, withBg(bg1), [bg1]);
    const notPng = bg1.bytes.slice();
    notPng[0] = 0;
    expect(await send(A, 3, bg1, { bytes: notPng.buffer })).toMatchObject({ status: 'rejected', reason: 'asset-invalid' });
    expect(store.snapshot(BM)).toBeNull();
  });

  it('rejects an asset list that does not match the content', () => {
    const content = withBg(bg1);
    expect(offer(A, 1, content, [])).toMatchObject({ status: 'rejected', reason: 'invalid' }); // missing
    expect(offer(A, 2, content, [bg1, art1])).toMatchObject({ status: 'rejected', reason: 'invalid' }); // extra
    expect(offer(A, 3, content, [{ meta: { ...bg1.meta, kind: 'token', width: 256, height: 256 } }])).toMatchObject({ status: 'rejected', reason: 'invalid' }); // wrong kind
    expect(offer(A, 4, { ...content, revision: 1 }, [bg1])).toMatchObject({ status: 'rejected', reason: 'invalid' });
    expect(store.snapshot(BM)).toBeNull();
  });

  it('refuses token art beyond the per-publication memory bound', async () => {
    const tokens = [];
    const art = {};
    const metas = [];
    const per = 1024 * 1024;
    for (let i = 0; i <= MAX_TOKEN_ART_BYTES / per; i++) {
      const id = (i + 1).toString(16).padStart(64, '0');
      tokens.push({ id: `t${i}`, x: 0, y: 0, w: 1, h: 1, imgSrc: `s${i}` });
      art[`s${i}`] = id;
      metas.push({ meta: { assetId: id, kind: 'token', mime: 'image/png', width: 512, height: 512, byteLength: per } });
    }
    expect(offer(A, 1, battleMapContent({ tokens, art }), metas)).toMatchObject({ status: 'rejected', reason: 'limit' });
  });

  it('keeps the committed assets until the replacement commits, then releases what nothing references', async () => {
    offer(A, 1, withBg(bg1), [bg1]);
    await send(A, 1, bg1);
    offer(A, 2, withBg(bg2), [bg2]);
    // Pending replacement: players still get the old background and its bytes.
    expect(store.snapshot(BM).background.assetId).toBe(bg1.meta.assetId);
    expect(store.hasAsset(BM, bg1.meta.assetId)).toBe(true);
    expect(store.hasAsset(BM, bg2.meta.assetId)).toBe(false); // nothing pending is ever served
    expect(await send(A, 2, bg2)).toMatchObject({ status: 'committed', revision: 2 });
    expect(store.hasAsset(BM, bg2.meta.assetId)).toBe(true);
    expect(store.hasAsset(BM, bg1.meta.assetId)).toBe(false);
    expect(store.diagnostics()[BM]).toMatchObject({ heldAssets: 1, assetsReleased: 1 });
  });

  it('a newer offer supersedes an unfinished one; the older one’s late assets are ignored', async () => {
    offer(A, 1, battleMapContent(), []);
    const r10 = offer(A, 10, withBg(bg1), [bg1]);
    expect(r10.status).toBe('need');
    const r11 = offer(A, 11, withBg(bg2), [bg2]);
    expect(r11).toMatchObject({ status: 'need', assetIds: [bg2.meta.assetId], superseded: { instanceId: A, publicationSeq: 10 } });
    expect(await send(A, 10, bg1)).toMatchObject({ status: 'ignored' });
    expect(store.snapshot(BM).revision).toBe(1); // still the committed one
    expect(await send(A, 11, bg2)).toMatchObject({ status: 'committed', publicationSeq: 11, revision: 2 });
    expect(store.snapshot(BM).background.assetId).toBe(bg2.meta.assetId);
    expect(store.hasAsset(BM, bg1.meta.assetId)).toBe(false);
  });

  it('assets an unfinished offer already received are kept for the offer that supersedes it', async () => {
    const both = battleMapContent({ background: bg1.meta.assetId, tokens: [{ id: 't1', x: 0, y: 0, w: 1, h: 1, imgSrc: 's' }], art: { s: art1.meta.assetId } });
    offer(A, 1, both, [bg1, art1]);
    await send(A, 1, bg1);
    const moved = battleMapContent({ background: bg1.meta.assetId, tokens: [{ id: 't1', x: 9, y: 0, w: 1, h: 1, imgSrc: 's' }], art: { s: art1.meta.assetId } });
    expect(offer(A, 2, moved, [bg1, art1])).toMatchObject({ status: 'need', assetIds: [art1.meta.assetId] });
  });

  it('a hash finishing after the offer was superseded cannot enter the store', async () => {
    offer(A, 1, withBg(bg1), [bg1]);
    const late = send(A, 1, bg1); // hashing…
    offer(A, 2, withBg(bg2), [bg2]); // …while a newer offer arrives
    expect(await late).toMatchObject({ status: 'ignored' });
    expect(store.snapshot(BM)).toBeNull();
    expect(store.diagnostics()[BM].heldAssets).toBe(0);
  });

  it('duplicate and reordered asset messages cannot corrupt a publication', async () => {
    const content = battleMapContent({ background: bg1.meta.assetId, tokens: [{ id: 't1', x: 0, y: 0, w: 1, h: 1, imgSrc: 's' }], art: { s: art1.meta.assetId } });
    offer(A, 1, content, [bg1, art1]);
    const results = await Promise.all([send(A, 1, art1), send(A, 1, art1), send(A, 1, bg1), send(A, 1, bg1)]);
    expect(results.filter((r) => r.status === 'ignored')).toHaveLength(2);
    expect(results.filter((r) => r.status === 'committed')).toHaveLength(1);
    expect(store.snapshot(BM).revision).toBe(1);
    expect(await send(A, 1, bg1)).toMatchObject({ status: 'ignored' }); // after the commit
  });

  it('an asset for another instance, an unrequested id, or a non-pending seq is ignored', async () => {
    offer(A, 1, withBg(bg1), [bg1]);
    expect(await send(B, 1, bg1)).toMatchObject({ status: 'ignored' });
    expect(await send(A, 2, bg1)).toMatchObject({ status: 'ignored' });
    expect(await send(A, 1, bg2)).toMatchObject({ status: 'ignored' });
    expect(store.pendingOf(BM)).toMatchObject({ publicationSeq: 1, missing: 1 });
  });

  it('dropping a pending offer (its tab left) leaves the committed publication and its assets', async () => {
    offer(A, 1, withBg(bg1), [bg1]);
    await send(A, 1, bg1);
    offer(A, 2, withBg(bg2), [bg2]);
    expect(store.dropPending(BM, B)).toBeNull(); // not B's
    expect(store.dropPending(BM, A)).toEqual({ instanceId: A, publicationSeq: 2 });
    expect(store.snapshot(BM).background.assetId).toBe(bg1.meta.assetId);
    expect(store.hasAsset(BM, bg1.meta.assetId)).toBe(true);
    expect(await send(A, 2, bg2)).toMatchObject({ status: 'ignored' });
  });

  describe('host-assigned revisions', () => {
    it('an identical re-offer, also from a reloaded tab (a new instance), is not a new revision', async () => {
      offer(A, 1, withBg(bg1), [bg1]);
      await send(A, 1, bg1);
      expect(offer(A, 2, withBg(bg1), [bg1])).toEqual({ status: 'committed', publicationSeq: 2, revision: 1, changed: false });
      expect(offer(B, 1, withBg(bg1), [bg1])).toEqual({ status: 'committed', publicationSeq: 1, revision: 1, changed: false });
      expect(store.snapshot(BM)).toMatchObject({ revision: 1, background: { revision: 1 } });
    });

    it('a structured-only change bumps the snapshot revision, never the background revision', async () => {
      offer(A, 1, withBg(bg1), [bg1]);
      await send(A, 1, bg1);
      offer(A, 2, withBg(bg1, [{ id: 't1', x: 140, y: 70, w: 70, h: 70 }]), [bg1]);
      expect(store.snapshot(BM)).toMatchObject({ revision: 2, background: { assetId: bg1.meta.assetId, revision: 1 } });
    });

    it('a changed background bumps both; A → B → A is three revisions of each, always rising', async () => {
      offer(A, 1, withBg(bg1), [bg1]);
      await send(A, 1, bg1);
      offer(A, 2, withBg(bg2), [bg2]);
      await send(A, 2, bg2);
      expect(store.snapshot(BM)).toMatchObject({ revision: 2, background: { revision: 2 } });
      offer(A, 3, withBg(bg1), [bg1]);
      await send(A, 3, bg1); // bg1 was released, so it is fetched again
      expect(store.snapshot(BM)).toMatchObject({ revision: 3, background: { assetId: bg1.meta.assetId, revision: 3 } });
    });

    it('a background removed and added back still rises; no background keeps the background revision', async () => {
      offer(A, 1, withBg(bg1), [bg1]);
      await send(A, 1, bg1);
      offer(A, 2, battleMapContent(), []);
      expect(store.snapshot(BM)).toMatchObject({ revision: 2, background: null });
      offer(A, 3, withBg(bg1), [bg1]);
      await send(A, 3, bg1);
      expect(store.snapshot(BM)).toMatchObject({ revision: 3, background: { revision: 2 } });
    });

    it('a hash still running when the session ends cannot commit or report a commit', async () => {
      offer(A, 1, withBg(bg1), [bg1]);
      const late = send(A, 1, bg1);
      store.clear();
      expect(await late).toMatchObject({ status: 'ignored' });
      expect(store.snapshot(BM)).toBeNull();
      expect(store.diagnostics()[BM]).toMatchObject({ commits: 0, heldAssets: 0 });
    });

    it('session end clears everything; a new session starts again at revision 1', async () => {
      offer(A, 1, withBg(bg1), [bg1]);
      await send(A, 1, bg1);
      offer(A, 2, battleMapContent(), []);
      store.clear();
      expect(store.snapshot(BM)).toBeNull();
      expect(store.hasAsset(BM, bg1.meta.assetId)).toBe(false);
      expect(store.diagnostics()[BM]).toMatchObject({ heldAssets: 0, committed: null, pending: null });
      expect(offer(A, 3, battleMapContent(), [])).toMatchObject({ revision: 1 });
    });
  });

  it('diagnostics carry counts and revisions, never content or asset ids', async () => {
    offer(A, 1, withBg(bg1, [{ id: 't1', name: 'Secret Goblin Name', showLabel: true, x: 0, y: 0, w: 1, h: 1 }]), [bg1]);
    await send(A, 1, bg1);
    const text = JSON.stringify(store.diagnostics());
    expect(text).not.toContain(bg1.meta.assetId);
    expect(text).not.toContain('Secret Goblin Name');
  });
});
