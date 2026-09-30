// Live Share Milestone 1: the Battle Map's player-safe projection and its change signal
// (js/modules/battle-map-share-state.js). Expected snapshots are written out by hand; they are
// not computed with the code under test.
import { describe, it, expect, vi } from 'vitest';
import '../../js/modules/battle-map-share-state.js';

const { projectPlayerSafeState, createShareStateSeam, SCHEMA, VERSION } = globalThis.BattleMapShareState;

const DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Shaped like the in-memory Battle Map state in battlemap.html after load(): tokens carry HP, image
// sources and loaded images, selection, aura and vision cone; `ui`, `view` and fog are editor state.
// Every level also carries a field Live Share has never heard of.
function fixture() {
  return {
    state: {
      map: { imgSrc: DATA_URL, img: { naturalWidth: 1400, fakeImage: true }, w: 1400, h: 900, futureMapSecret: 'm' },
      mapTransform: { scale: 1.5, x: -20, y: 10, futureTransformSecret: 't' },
      grid: { size: 70, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 3, offsetY: 4, futureGridSecret: 'g' },
      view: { x: 120, y: -40, scale: 0.8 },
      tokens: [
        {
          id: 't_goblin1',
          name: 'Goblin Boss',
          imgSrc: DATA_URL,
          img: { fakeImage: true },
          x: 210,
          y: 140,
          w: 70,
          h: 70,
          rot: 0.5,
          selected: true,
          hp: 7,
          maxHp: 21,
          showLabel: true,
          statusConditions: ['Poisoned', 'Prone'],
          aura: { radius: 2, color: '#ff0000' },
          visionCone: { angle: 90, range: 6, color: '#ffff88' },
          dmNotes: 'secret: carries the key',
          futureTokenSecret: { nested: 'x' },
        },
        {
          id: 't_ranger',
          name: 'Aria (hidden label)',
          imgSrc: 'https://example.com/private/aria.png',
          img: null,
          x: 350,
          y: 280,
          w: 70,
          h: 70,
          rot: 0,
          selected: false,
          hp: 30,
          maxHp: 30,
          showLabel: false,
        },
      ],
      ui: { dragMode: 'token', dragId: 't_goblin1', dragOffset: { x: 3, y: 4 }, tool: 'measure', measuring: true, calib: { p1: null, p2: null } },
    },
    persistentMeasurements: [
      { id: 'm_1', type: 'cone', x1: 10, y1: 20, x2: 110, y2: 60, color: '#ff8800', selected: true, futureMeasureSecret: 1 },
    ],
    // Not part of the source contract; present to prove that neighbouring data is never read.
    fogShapes: [{ id: 'f_1', type: 'rect', x: 0, y: 0, w: 10, h: 10, mode: 'cover' }],
    storageKey: 'dmtoolbox.battlemap.mvp.v3',
  };
}

// Version 2 since Milestone 3: `background` and token `assetId` are references to player-safe
// assets. Without any prepared assets (as here) both are null.
const EXPECTED = {
  schema: 'dmtoolbox.battlemap.player-safe',
  version: 2,
  map: { width: 1400, height: 900 },
  background: null,
  mapTransform: { scale: 1.5, x: -20, y: 10 },
  grid: { size: 70, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 3, offsetY: 4 },
  tokens: [
    { id: 't_goblin1', x: 210, y: 140, w: 70, h: 70, rot: 0.5, name: 'Goblin Boss', conditions: ['Poisoned', 'Prone'], assetId: null },
    { id: 't_ranger', x: 350, y: 280, w: 70, h: 70, rot: 0, name: null, conditions: [], assetId: null },
  ],
  measurements: [{ id: 'm_1', type: 'cone', x1: 10, y1: 20, x2: 110, y2: 60, color: '#ff8800' }],
};

function seamOver(source) {
  const errors = [];
  const seam = createShareStateSeam({ getSource: () => source, onError: (e) => errors.push(e) });
  const events = [];
  seam.onChange((e) => events.push(e.revision));
  return { seam, events, errors };
}

// Every key at every depth of a value, for "is this key anywhere?" assertions.
function allKeys(value, keys = new Set()) {
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      allKeys(v, keys);
    }
  }
  return keys;
}

describe('player-safe projection: what is included', () => {
  it('is exactly the approved fields (hand-written expected snapshot)', () => {
    expect(projectPlayerSafeState(fixture())).toEqual(EXPECTED);
    expect(SCHEMA).toBe(EXPECTED.schema);
    expect(VERSION).toBe(2);
  });

  it('gives each token exactly the approved keys, in the same shape', () => {
    for (const token of projectPlayerSafeState(fixture()).tokens) {
      expect(Object.keys(token).sort()).toEqual(['assetId', 'conditions', 'h', 'id', 'name', 'rot', 'w', 'x', 'y']);
    }
  });

  it('has exactly the approved top-level and nested keys', () => {
    const p = projectPlayerSafeState(fixture());
    expect(Object.keys(p).sort()).toEqual(['background', 'grid', 'map', 'mapTransform', 'measurements', 'schema', 'tokens', 'version']);
    expect(Object.keys(p.map).sort()).toEqual(['height', 'width']);
    expect(Object.keys(p.mapTransform).sort()).toEqual(['scale', 'x', 'y']);
    expect(Object.keys(p.grid).sort()).toEqual(['alpha', 'color', 'offsetX', 'offsetY', 'show', 'size', 'unitsPerCell']);
    expect(Object.keys(p.measurements[0]).sort()).toEqual(['color', 'id', 'type', 'x1', 'x2', 'y1', 'y2']);
  });

  it('includes a token name only where its label is shown', () => {
    const src = fixture();
    const [shown, hidden] = projectPlayerSafeState(src).tokens;
    expect(shown.name).toBe('Goblin Boss');
    expect(hidden.name).toBeNull();
    expect(JSON.stringify(projectPlayerSafeState(src))).not.toContain('Aria');
  });

  it('treats every placed token as visible (no hidden-token feature yet)', () => {
    expect(projectPlayerSafeState(fixture()).tokens.map((t) => t.id)).toEqual(['t_goblin1', 't_ranger']);
  });

  it('handles an empty Battle Map', () => {
    expect(projectPlayerSafeState({ state: { map: { imgSrc: '', img: null, w: 0, h: 0 }, mapTransform: { scale: 1, x: 0, y: 0 }, grid: {}, tokens: [] }, persistentMeasurements: [] })).toEqual({
      schema: 'dmtoolbox.battlemap.player-safe',
      version: 2,
      map: { width: 0, height: 0 },
      background: null,
      mapTransform: { scale: 1, x: 0, y: 0 },
      grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 0, offsetY: 0 },
      tokens: [],
      measurements: [],
    });
    expect(() => projectPlayerSafeState(undefined)).not.toThrow();
  });
});

describe('player-safe projection: what is excluded', () => {
  const projected = () => projectPlayerSafeState(fixture());
  const json = () => JSON.stringify(projected());

  it('has no HP or max HP anywhere', () => {
    const keys = allKeys(projected());
    expect(keys.has('hp')).toBe(false);
    expect(keys.has('maxHp')).toBe(false);
    expect(json()).not.toMatch(/"hp"|maxHp|\b21\b/);
  });

  it('has no private or editor metadata: DM notes, selection, drag, tool, view (the DM camera)', () => {
    const keys = allKeys(projected());
    for (const k of ['dmNotes', 'selected', 'ui', 'dragMode', 'dragId', 'dragOffset', 'tool', 'measuring', 'calib', 'view']) {
      expect(keys.has(k), k).toBe(false);
    }
    expect(json()).not.toContain('secret: carries the key');
  });

  it('has no dialog, dirty/save bookkeeping, or Live Share room/connection data, wherever it sits', () => {
    const src = fixture();
    src.state.ui.activeModal = 'hpModal';
    src.state.ui.activeModalToken = 't_goblin1';
    src.isDirty = true;
    src.lastSavedAt = '2026-09-28T12:00:00Z';
    src.state.liveShare = { roomId: 'AbCdEfGhIjKlMnOpQrStUv', peerId: 'p1', admitted: true, seat: 'Caleb' };
    src.state.tokens[0].peerConnectionState = 'connected';
    const text = JSON.stringify(projectPlayerSafeState(src));
    expect(text).not.toMatch(/Modal|isDirty|lastSavedAt|liveShare|roomId|AbCdEfGhIjKlMnOpQrStUv|peerId|admitted|seat|Caleb|peerConnection/);
    expect(projectPlayerSafeState(src)).toEqual(EXPECTED);
  });

  it('has no fog data', () => {
    const keys = allKeys(projected());
    for (const k of ['fog', 'fogState', 'fogShapes', 'mode']) expect(keys.has(k), k).toBe(false);
  });

  it('has no map or token image sources, data URLs, external URLs or loaded images', () => {
    const keys = allKeys(projected());
    for (const k of ['imgSrc', 'img', 'src', 'image']) expect(keys.has(k), k).toBe(false);
    expect(json()).not.toMatch(/data:|https?:\/\/|base64/);
  });

  it('has no aura or vision cone (not in the Milestone 1 allowlist)', () => {
    const keys = allKeys(projected());
    expect(keys.has('aura')).toBe(false);
    expect(keys.has('visionCone')).toBe(false);
  });

  it('has no browser-storage metadata', () => {
    expect(json()).not.toMatch(/dmtoolbox\.battlemap\.mvp|localStorage|indexedDB/i);
  });

  it('never lets a field it does not know about through, at any level', () => {
    expect(json()).not.toMatch(/future\w*Secret/);
    // A field added to the Battle Map later is not shared just because it exists.
    const src = fixture();
    src.state.tokens[0].initiativeLink = { playerId: 'abc', notes: 'x' };
    src.state.grid.dmOnlyOverlay = true;
    src.state.map.localPath = 'C:/maps/secret.png';
    src.state.ownerEmail = 'dm@example.com';
    expect(projectPlayerSafeState(src)).toEqual(EXPECTED);
  });

  it('coerces field values to primitives, so an object smuggled into an allowed field cannot leak', () => {
    const src = fixture();
    const t = src.state.tokens[0];
    t.x = { hp: 7 };
    t.rot = NaN;
    t.name = { secret: true };
    t.statusConditions = ['Prone', { hp: 7 }, '', 42];
    src.state.grid.color = 'url(javascript:alert(1))';
    src.persistentMeasurements[0].color = { evil: true };
    const p = projectPlayerSafeState(src);
    expect(p.tokens[0]).toEqual({ id: 't_goblin1', x: 0, y: 140, w: 70, h: 70, rot: 0, name: null, conditions: ['Prone'], assetId: null });
    expect(p.grid.color).toBe('#6aa5ff');
    expect(p.measurements[0].color).toBe('#8bd3ff');
  });

  it('skips tokens and measurements without a usable id or type', () => {
    const src = fixture();
    src.state.tokens.push(null, { name: 'no id', x: 1 }, { id: 42, x: 1 });
    src.persistentMeasurements.push({ id: 'm_2', type: 'freehand' }, { type: 'line' });
    const p = projectPlayerSafeState(src);
    expect(p.tokens.map((t) => t.id)).toEqual(['t_goblin1', 't_ranger']);
    expect(p.measurements.map((m) => m.id)).toEqual(['m_1']);
  });
});

describe('player-safe projection: read-only', () => {
  it('does not change the Battle Map state it reads', () => {
    const src = fixture();
    const before = JSON.stringify(src);
    projectPlayerSafeState(src);
    createShareStateSeam({ getSource: () => src }).getPlayerSafeState();
    expect(JSON.stringify(src)).toBe(before);
    expect(src.state.tokens[0].img).toEqual({ fakeImage: true });
  });

  it('returns detached copies: editing a snapshot does not reach the Battle Map, and later edits do not reach old snapshots', () => {
    const src = fixture();
    const p = projectPlayerSafeState(src);
    p.tokens[0].conditions.push('Stunned');
    p.tokens[0].x = 9999;
    expect(src.state.tokens[0].statusConditions).toEqual(['Poisoned', 'Prone']);
    expect(src.state.tokens[0].x).toBe(210);

    const snap = createShareStateSeam({ getSource: () => src }).getPlayerSafeState();
    src.state.tokens[0].statusConditions.push('Blinded');
    src.state.tokens[0].x = 1;
    expect(snap.tokens[0].conditions).toEqual(['Poisoned', 'Prone']);
    expect(snap.tokens[0].x).toBe(210);
  });
});

describe('share-state seam: revision and change signal', () => {
  it('starts at revision 0; the first check establishes revision 1 and signals once', () => {
    const { seam, events } = seamOver(fixture());
    expect(seam.revision).toBe(0);
    expect(seam.check()).toBe(true);
    expect(seam.revision).toBe(1);
    expect(events).toEqual([1]);
    expect(seam.check()).toBe(false);
    expect(events).toEqual([1]);
  });

  it('includes the revision in the snapshot, which is always current', () => {
    const src = fixture();
    const { seam } = seamOver(src);
    expect(seam.getPlayerSafeState()).toEqual({ ...EXPECTED, revision: 1 });
    src.state.tokens[0].x = 215;
    const snap = seam.getPlayerSafeState(); // no explicit check() needed
    expect(snap.revision).toBe(2);
    expect(snap.tokens[0].x).toBe(215);
  });

  it.each([
    ['moving a token', (s) => { s.state.tokens[0].x += 70; }],
    ['rotating a token', (s) => { s.state.tokens[1].rot = Math.PI / 2; }],
    ['resizing a token', (s) => { s.state.tokens[0].w = 140; s.state.tokens[0].h = 140; }],
    ['adding a token', (s) => { s.state.tokens.push({ id: 't_new', x: 0, y: 0, w: 70, h: 70, rot: 0 }); }],
    ['deleting a token', (s) => { s.state.tokens.splice(1, 1); }],
    ['reordering tokens (drawing order)', (s) => { s.state.tokens.reverse(); }],
    ['showing a label', (s) => { s.state.tokens[1].showLabel = true; }],
    ['renaming a labelled token', (s) => { s.state.tokens[0].name = 'Goblin Chief'; }],
    ['adding a condition', (s) => { s.state.tokens[1].statusConditions = ['Blinded']; }],
    ['changing the grid', (s) => { s.state.grid.size = 60; }],
    ['hiding the grid', (s) => { s.state.grid.show = false; }],
    ['calibrating the map (map transform)', (s) => { s.state.mapTransform.scale = 2; }],
    ['loading a different map size', (s) => { s.state.map.w = 2000; }],
    ['adding a persistent measurement', (s) => { s.persistentMeasurements.push({ id: 'm_2', type: 'line', x1: 0, y1: 0, x2: 5, y2: 5, color: '#ffffff' }); }],
    ['moving a persistent measurement', (s) => { s.persistentMeasurements[0].x2 = 300; }],
  ])('player-visible change: %s -> revision +1 and one signal', (_label, change) => {
    const src = fixture();
    const { seam, events } = seamOver(src);
    seam.check();
    change(src);
    expect(seam.check()).toBe(true);
    expect(seam.revision).toBe(2);
    expect(events).toEqual([1, 2]);
  });

  it.each([
    ['selecting a token', (s) => { s.state.tokens[1].selected = true; s.state.tokens[0].selected = false; }],
    ['changing HP', (s) => { s.state.tokens[0].hp = 0; }],
    ['changing max HP', (s) => { s.state.tokens[0].maxHp = 99; }],
    ['panning and zooming (the DM view)', (s) => { s.state.view.x = -500; s.state.view.scale = 3; }],
    ['starting a drag / switching tools', (s) => { s.state.ui.dragMode = 'pan'; s.state.ui.tool = 'fog'; }],
    ['renaming a token whose label is hidden', (s) => { s.state.tokens[1].name = 'Aria the Bold'; }],
    ['changing a token image', (s) => { s.state.tokens[0].imgSrc = 'data:image/png;base64,AAAA'; s.state.tokens[0].img = null; }],
    ['a token image finishing loading', (s) => { s.state.tokens[1].img = { fakeImage: true }; }],
    ['changing an aura or vision cone', (s) => { s.state.tokens[0].aura.radius = 5; s.state.tokens[0].visionCone.range = 12; }],
    ['editing fog', (s) => { s.fogShapes.push({ id: 'f_2' }); }],
    ['selecting a measurement', (s) => { s.persistentMeasurements[0].selected = false; }],
    ['editing an unknown field', (s) => { s.state.tokens[0].dmNotes = 'changed'; }],
  ])('editor-only change: %s -> no revision change, no signal', (_label, change) => {
    const src = fixture();
    const { seam, events } = seamOver(src);
    seam.check();
    change(src);
    expect(seam.check()).toBe(false);
    expect(seam.revision).toBe(1);
    expect(events).toEqual([1]);
  });

  it('a change and its undo still count as two changes (monotonic, never reused)', () => {
    const src = fixture();
    const { seam, events } = seamOver(src);
    seam.check();
    src.state.tokens[0].x = 999;
    seam.check();
    src.state.tokens[0].x = 210;
    seam.check();
    expect(events).toEqual([1, 2, 3]);
  });

  it('schedule() coalesces many calls in one task into a single check', async () => {
    const src = fixture();
    const { seam, events } = seamOver(src);
    seam.check();
    src.state.tokens[0].x = 1;
    seam.schedule();
    src.state.tokens[0].x = 2;
    seam.schedule();
    seam.schedule();
    expect(events).toEqual([1]); // not yet
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual([1, 2]);
    expect(seam.getPlayerSafeState().tokens[0].x).toBe(2);
  });

  it('a failing listener does not stop the others or the revision', () => {
    const src = fixture();
    const errors = [];
    const seam = createShareStateSeam({ getSource: () => src, onError: (e) => errors.push(e) });
    const good = vi.fn();
    seam.onChange(() => {
      throw new Error('listener bug');
    });
    seam.onChange(good);
    expect(seam.check()).toBe(true);
    expect(good).toHaveBeenCalledWith({ revision: 1 });
    expect(errors).toHaveLength(1);
  });

  it('unsubscribing stops signals', () => {
    const src = fixture();
    const seam = createShareStateSeam({ getSource: () => src });
    const fn = vi.fn();
    const off = seam.onChange(fn);
    seam.check();
    off();
    src.state.tokens[0].x = 5;
    seam.check();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(seam.revision).toBe(2);
  });

  it('never throws, even when reading the source fails', () => {
    const errors = [];
    const seam = createShareStateSeam({
      getSource: () => {
        throw new Error('boom');
      },
      onError: (e) => errors.push(e),
    });
    expect(seam.check()).toBe(false);
    expect(seam.revision).toBe(0);
    expect(errors).toHaveLength(1);
  });

  it('knows nothing about networking', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('js/modules/battle-map-share-state.js', 'utf8');
    expect(source).not.toMatch(/RTCPeerConnection|WebSocket|PeerLink|live-share\/|fetch\(|localStorage|indexedDB|document\./);
  });
});
