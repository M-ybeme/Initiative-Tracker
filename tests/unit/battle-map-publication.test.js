// 2.3.27: Battle Map staged publishing (js/modules/battle-map-publication.js) and "Visible to
// Players" at the projection boundary. Players see the last SAVED Battle Map: edits to the working
// state never reach the published state; a publish commits structured state, background and token
// art together; a hidden token is absent from everything. The generic Live Share modules stay
// save-agnostic: the seam simply reports whatever the publisher says is published.
import { describe, it, expect, vi } from 'vitest';
import '../../js/modules/battle-map-share-state.js';
import '../../js/modules/battle-map-publication.js';
import { createAssetCache } from '../../js/modules/live-share/asset-cache.js';

const { captureStructured, createPublisher } = globalThis.BattleMapPublication;
const { projectPlayerSafeState, createShareStateSeam } = globalThis.BattleMapShareState;

const HEX = (c) => c.repeat(64);

// A Battle Map-shaped working state.
function working() {
  return {
    state: {
      map: { imgSrc: 'data:image/png;base64,MAP', img: {}, w: 800, h: 600 },
      mapTransform: { scale: 1, x: 0, y: 0 },
      grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
      view: { x: 1, y: 2, scale: 3 },
      tokens: [
        { id: 't_bard', name: 'Bard', showLabel: true, imgSrc: '/images/playerTokens/Bard.png', x: 100, y: 100, w: 50, h: 50, rot: 0, hp: 9, statusConditions: ['Prone'] },
        { id: 't_hero', name: 'Hero', showLabel: true, imgSrc: 'data:image/png;base64,HERO', x: 300, y: 100, w: 50, h: 50, rot: 0, visibleToPlayers: true },
        { id: 't_spy', name: 'SecretSpy', showLabel: true, imgSrc: 'data:image/png;base64,SPY', x: 400, y: 100, w: 50, h: 50, rot: 0, visibleToPlayers: false, statusConditions: ['Invisible'] },
      ],
    },
    persistentMeasurements: [{ id: 'pm1', type: 'line', x1: 0, y1: 0, x2: 10, y2: 0, color: '#ffffff', selected: true }],
  };
}

// A stand-in for BattleMapShareAssets: flush() resolves when the test says; background and token
// art come from settable values.
function fakeAssets() {
  const f = {
    bg: null,
    art: new Map(),
    flushes: [],
    flush: vi.fn(() => new Promise((resolve) => f.flushes.push(resolve))),
    background: () => f.bg,
    tokenAssetId: (t) => f.art.get(t.imgSrc) || null,
    retained: [],
    retain: vi.fn((ids) => {
      f.retained = ids.filter(Boolean);
    }),
    finish() {
      f.flushes.splice(0).forEach((r) => r());
      return new Promise((r) => setTimeout(r, 0));
    },
  };
  return f;
}

// The Battle Map wiring (battlemap.html): the seam reads only what the publisher published.
function wire(assets = null) {
  let seam = null;
  const publisher = createPublisher({ assets, onPublished: () => seam && seam.check() });
  seam = createShareStateSeam({ getSource: () => publisher.source() || { state: {}, persistentMeasurements: [] } });
  const signals = [];
  seam.onChange((e) => signals.push(e.revision));
  const snapshot = () => (publisher.hasPublished() ? seam.getPlayerSafeState() : null);
  return { publisher, seam, signals, snapshot };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('captureStructured', () => {
  it('copies exactly what the projection reads, detached from the working state', () => {
    const w = working();
    const captured = captureStructured(w.state, w.persistentMeasurements);
    w.state.tokens[0].x = 999;
    w.state.tokens[0].statusConditions.push('Grappled');
    w.state.tokens.push({ id: 't_new', x: 1, y: 1, w: 1, h: 1 });
    w.state.grid.size = 70;
    w.state.mapTransform.scale = 2;
    w.persistentMeasurements[0].x2 = 500;
    expect(captured.state.tokens.map((t) => t.id)).toEqual(['t_bard', 't_hero', 't_spy']);
    expect(captured.state.tokens[0]).toMatchObject({ x: 100, statusConditions: ['Prone'] });
    expect(captured.state.grid.size).toBe(50);
    expect(captured.state.mapTransform.scale).toBe(1);
    expect(captured.persistentMeasurements[0].x2).toBe(10);
    // Editor-only and private fields are not even captured.
    expect(JSON.stringify(captured)).not.toMatch(/"hp"|"view"|"selected"|"img"\b/);
  });
});

describe('Visible to Players at the projection boundary', () => {
  const tokens = (visibleValues) =>
    visibleValues.map((v, i) => {
      const t = { id: `t${i}`, name: `Name${i}`, showLabel: true, imgSrc: `data:image/png;base64,ART${i}`, x: i, y: i, w: 50, h: 50, rot: 0.5, statusConditions: ['Prone'] };
      if (v !== 'missing') t.visibleToPlayers = v;
      return t;
    });

  it('missing -> visible, true -> included, false -> completely absent', () => {
    const p = projectPlayerSafeState({ state: { tokens: tokens(['missing', true, false]) }, persistentMeasurements: [] });
    expect(p.tokens.map((t) => t.id)).toEqual(['t0', 't1']);
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/t2|Name2|ART2|visible/);
  });

  it('never asks for the art of a hidden token, and adds no asset id for it', () => {
    const tokenAssetId = vi.fn((t) => HEX(t.id.slice(1)));
    const p = projectPlayerSafeState({ state: { tokens: tokens([true, false]) }, persistentMeasurements: [], assets: { tokenAssetId, background: () => null } });
    expect(tokenAssetId.mock.calls.map(([t]) => t.id)).toEqual(['t0']);
    expect(p.tokens).toHaveLength(1);
  });

  it('a hidden custom-art token causes no asset request on the player', () => {
    const w = working();
    const assets = fakeAssets();
    assets.art.set('data:image/png;base64,HERO', HEX('a'));
    assets.art.set('data:image/png;base64,SPY', HEX('b')); // even if the host had prepared it
    const { publisher, snapshot } = wire(assets);
    publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: {} });
    return assets.finish().then(() => {
      const snap = snapshot();
      expect(snap.tokens.map((t) => t.id)).toEqual(['t_bard', 't_hero']);
      const requested = [];
      const cache = createAssetCache({ requestAssets: (ids) => requested.push(...ids) });
      cache.sync(snap);
      expect(requested).toEqual([HEX('a')]);
    });
  });
});

describe('save-gated publication', () => {
  it('nothing is published until the first save', () => {
    const { publisher, snapshot } = wire();
    expect(publisher.hasPublished()).toBe(false);
    expect(publisher.source()).toBeNull();
    expect(snapshot()).toBeNull();
  });

  it('edits to the working state never change the published state or its revision; a save does, once', async () => {
    const w = working();
    const { publisher, seam, signals, snapshot } = wire();
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    const saved = snapshot();
    expect(saved.tokens.map((t) => t.id)).toEqual(['t_bard', 't_hero']);

    // Many unsaved edits: moves, a new token, hide the hero, rename, grid, measurement.
    for (let i = 0; i < 5; i++) w.state.tokens[0].x += 10;
    w.state.tokens.push({ id: 't_orc', name: 'Orc', x: 1, y: 1, w: 50, h: 50, rot: 0 });
    w.state.tokens[1].visibleToPlayers = false;
    w.state.tokens[0].name = 'Renamed';
    w.state.grid.size = 64;
    w.persistentMeasurements.length = 0;
    for (let i = 0; i < 10; i++) seam.check();
    expect(snapshot()).toEqual(saved);
    expect(signals).toEqual([saved.revision]);

    // One save publishes the final state as one new revision, never the intermediate drafts.
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    const next = snapshot();
    expect(next.revision).toBe(saved.revision + 1);
    expect(signals).toEqual([saved.revision, next.revision]);
    expect(next.tokens.map((t) => t.id)).toEqual(['t_bard', 't_orc']);
    expect(next.tokens[0]).toMatchObject({ x: 150, name: 'Renamed' });
    expect(next.grid.size).toBe(64);
    expect(next.measurements).toEqual([]);
  });

  it('a save with nothing new publishes no new revision', async () => {
    const w = working();
    const { publisher, signals, snapshot } = wire();
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    const first = snapshot().revision;
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    expect(snapshot().revision).toBe(first);
    expect(signals).toEqual([first]);
  });

  it('commits structured state and background together: nothing changes until the background is ready', async () => {
    const w = working();
    const assets = fakeAssets();
    assets.bg = { assetId: HEX('1'), revision: 1 };
    const { publisher, snapshot } = wire(assets);
    publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: { fog: 'A' } });
    await assets.finish();
    const A = snapshot();
    expect(A.background).toEqual({ assetId: HEX('1'), revision: 1 });

    // Save B: tokens moved and fog changed. While B's background builds, players keep A, whole.
    w.state.tokens[0].x = 700;
    const pending = publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: { fog: 'B' } });
    expect(publisher.backgroundInputs()).toEqual({ fog: 'B' }); // the asset preparer builds B's
    assets.bg = { assetId: HEX('2'), revision: 2 }; // (the preparer finished B's background)
    expect(snapshot()).toEqual(A);
    await assets.finish();
    await pending;
    const B = snapshot();
    expect(B.revision).toBe(A.revision + 1);
    expect(B.tokens[0].x).toBe(700);
    expect(B.background).toEqual({ assetId: HEX('2'), revision: 2 });
  });

  it('a newer save supersedes an unfinished older one (latest saved state wins)', async () => {
    const w = working();
    const assets = fakeAssets();
    const { publisher, snapshot } = wire(assets);
    w.state.tokens[0].x = 1;
    const older = publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: { n: 1 } });
    w.state.tokens[0].x = 2;
    const newer = publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: { n: 2 } });
    await assets.finish();
    expect(await older).toBe(false);
    expect(await newer).toBe(true);
    expect(snapshot().tokens[0].x).toBe(2);
  });

  it('records token art at commit; art that finishes later is picked up only when no newer save is pending', async () => {
    const w = working();
    const assets = fakeAssets();
    const { publisher, snapshot } = wire(assets);
    publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: {} });
    await assets.finish();
    expect(snapshot().tokens[1].assetId).toBeNull(); // hero art not ready yet
    assets.art.set('data:image/png;base64,HERO', HEX('a'));
    expect(snapshot().tokens[1].assetId).toBeNull(); // not looked up live
    publisher.refresh();
    const withArt = snapshot();
    expect(withArt.tokens[1].assetId).toBe(HEX('a'));

    // A newer save starts (hero now hidden): the preparer drops the hero's art at once, but the
    // published state must not change until the new one commits.
    w.state.tokens[1].visibleToPlayers = false;
    const pending = publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: {} });
    assets.art.delete('data:image/png;base64,HERO');
    publisher.refresh(); // ignored while the newer save is pending
    expect(snapshot()).toEqual(withArt);
    await assets.finish();
    await pending;
    expect(snapshot().tokens.map((t) => t.id)).toEqual(['t_bard']);
    expect(snapshot().revision).toBe(withArt.revision + 1);
  });

  it('a failed background build still commits the save, with no background (never a stale one)', async () => {
    const w = working();
    const assets = fakeAssets();
    assets.flush = vi.fn(() => Promise.reject(new Error('encode failed')));
    assets.bg = null;
    const { publisher, snapshot } = wire(assets);
    expect(await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: {} })).toBe(true);
    expect(snapshot().background).toBeNull();
  });
});

describe('aura and vision cone publication (Milestone 4)', () => {
  const withOverlays = () => {
    const w = working();
    w.state.tokens[0].aura = { radius: 2, color: '#ff0000' };
    w.state.tokens[0].visionCone = { range: 6, angle: 90, color: '#ffff88' };
    w.state.tokens[2].aura = { radius: 9, color: '#abcdef' }; // the hidden spy
    w.state.tokens[2].visionCone = { range: 11, angle: 45, color: '#fedcba' };
    return w;
  };

  it('captureStructured takes detached copies of the overlays', () => {
    const w = withOverlays();
    const captured = captureStructured(w.state, w.persistentMeasurements);
    expect(captured.state.tokens[0].aura).not.toBe(w.state.tokens[0].aura);
    expect(captured.state.tokens[0].visionCone).not.toBe(w.state.tokens[0].visionCone);
    w.state.tokens[0].aura.radius = 5;
    w.state.tokens[0].aura.color = '#00ff00';
    w.state.tokens[0].visionCone.angle = 30;
    delete w.state.tokens[0].visionCone;
    expect(captured.state.tokens[0].aura).toEqual({ radius: 2, color: '#ff0000' });
    expect(captured.state.tokens[0].visionCone).toEqual({ range: 6, angle: 90, color: '#ffff88' });
    // Tokens without overlays capture none.
    expect(captured.state.tokens[1].aura).toBeUndefined();
    expect(captured.state.tokens[1].visionCone).toBeUndefined();
  });

  it('overlay and rotation edits stay private until saved; the save publishes them with the same background', async () => {
    const w = withOverlays();
    const assets = fakeAssets();
    assets.bg = { assetId: HEX('1'), revision: 4 };
    const { publisher, seam, signals, snapshot } = wire(assets);
    publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: { fog: 'A' } });
    await assets.finish();
    const A = snapshot();
    expect(A.tokens[0]).toMatchObject({ rot: 0, aura: { radius: 2, color: '#ff0000' }, visionCone: { range: 6, angle: 90, color: '#ffff88' } });

    // Unsaved: radius, color, range, angle, cone color, rotation, an aura added to the hero.
    w.state.tokens[0].aura.radius = 4;
    w.state.tokens[0].aura.color = '#00ff00';
    w.state.tokens[0].visionCone.range = 12;
    w.state.tokens[0].visionCone.angle = 60;
    w.state.tokens[0].visionCone.color = '#ff00ff';
    w.state.tokens[0].rot = Math.PI / 2;
    w.state.tokens[1].aura = { radius: 1, color: '#123456' };
    for (let i = 0; i < 5; i++) seam.check();
    expect(snapshot()).toEqual(A);
    expect(signals).toEqual([A.revision]);

    // Save: one new revision with all of them; the background reference is unchanged.
    publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements), backgroundInputs: { fog: 'A' } });
    await assets.finish();
    const B = snapshot();
    expect(B.revision).toBe(A.revision + 1);
    expect(signals).toEqual([A.revision, B.revision]);
    expect(B.tokens[0]).toMatchObject({ rot: Math.PI / 2, aura: { radius: 4, color: '#00ff00' }, visionCone: { range: 12, angle: 60, color: '#ff00ff' } });
    expect(B.tokens[1].aura).toEqual({ radius: 1, color: '#123456' });
    expect(B.background).toEqual(A.background);
    expect(B.background).toEqual({ assetId: HEX('1'), revision: 4 });
  });

  it('a hidden token publishes no overlay information; showing it and saving brings the overlays back', async () => {
    const w = withOverlays();
    const { publisher, snapshot } = wire();
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    const hidden = snapshot();
    expect(hidden.tokens.map((t) => t.id)).toEqual(['t_bard', 't_hero']);
    expect(JSON.stringify(hidden)).not.toMatch(/t_spy|abcdef|fedcba|"radius":9|"range":11|"angle":45/);

    w.state.tokens[2].visibleToPlayers = true; // not saved yet
    expect(snapshot()).toEqual(hidden);
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    const shown = snapshot().tokens.find((t) => t.id === 't_spy');
    expect(shown).toMatchObject({ aura: { radius: 9, color: '#abcdef' }, visionCone: { range: 11, angle: 45, color: '#fedcba' } });

    w.state.tokens[2].visibleToPlayers = false;
    await publisher.publish({ structured: captureStructured(w.state, w.persistentMeasurements) });
    expect(JSON.stringify(snapshot())).not.toMatch(/t_spy|abcdef|fedcba/);
  });
});
