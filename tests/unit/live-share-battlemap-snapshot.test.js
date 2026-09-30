// Live Share Milestone 2: the `battlemap-snapshot` message on the wire and on the player
// (js/modules/live-share/protocol.js, battlemap-snapshot.js): validation of untrusted payloads, the
// latest-state-wins revision gate, and the contract with the Milestone 1 projection.
import { describe, it, expect, vi } from 'vitest';
import '../../js/modules/battle-map-share-state.js';
import {
  validateBattleMapSnapshot,
  createSnapshotReceiver,
  SNAPSHOT_SCHEMA,
  SNAPSHOT_VERSION,
  MAX_TOKENS,
  MAX_MEASUREMENTS,
  MAX_CONDITIONS,
  MAX_TEXT,
} from '../../js/modules/live-share/battlemap-snapshot.js';
import { encodeBattleMapSnapshot, parseChannelMessage, MAX_CHANNEL_MESSAGE_BYTES } from '../../js/modules/live-share/protocol.js';

const { projectPlayerSafeState, createShareStateSeam, SCHEMA, VERSION } = globalThis.BattleMapShareState;

// Written out by hand, in the shape the Milestone 1 projection produces.
function snapshot(overrides = {}) {
  return {
    schema: 'dmtoolbox.battlemap.player-safe',
    version: 2,
    map: { width: 1400, height: 900 },
    background: { assetId: 'a'.repeat(64), revision: 3 },
    mapTransform: { scale: 1.5, x: -20, y: 10 },
    grid: { size: 70, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 3, offsetY: 4 },
    tokens: [
      { id: 't_goblin1', x: 210, y: 140, w: 70, h: 70, rot: 0.5, name: 'Goblin Boss', conditions: ['Prone', 'Poisoned'], assetId: 'b'.repeat(64) },
      { id: 't_hero', x: 0, y: -35, w: 140, h: 140, rot: 0, name: null, conditions: [], assetId: null },
    ],
    measurements: [{ id: 'pm-1', type: 'cone', x1: 10, y1: 20, x2: 150, y2: 20, color: '#ff8800' }],
    revision: 7,
    ...overrides,
  };
}

const message = (payload) => JSON.stringify({ v: 0, type: 'battlemap-snapshot', payload });

describe('battlemap-snapshot validation', () => {
  it('accepts a well-formed snapshot and returns an equal, separate copy', () => {
    const input = snapshot();
    const result = validateBattleMapSnapshot(input);
    expect(result).toEqual({ ok: true, snapshot: snapshot() });
    expect(result.snapshot).not.toBe(input);
    expect(result.snapshot.tokens[0]).not.toBe(input.tokens[0]);
    expect(result.snapshot.tokens[0].conditions).not.toBe(input.tokens[0].conditions);
  });

  it('matches the Milestone 1 seam schema and version', () => {
    expect(SNAPSHOT_SCHEMA).toBe(SCHEMA);
    expect(SNAPSHOT_VERSION).toBe(VERSION);
  });

  it('never copies unknown fields, at any level', () => {
    const input = snapshot({ hp: 10, extra: { secret: 1 } });
    input.map.imgSrc = 'data:image/png;base64,xyz';
    input.grid.dmNote = 'trap here';
    input.mapTransform.view = { scale: 2 };
    input.tokens[0].hp = 12;
    input.tokens[0].maxHp = 20;
    input.tokens[0].imgSrc = '/images/goblin.png';
    input.tokens[0].selected = true;
    input.measurements[0].selected = true;
    const result = validateBattleMapSnapshot(input);
    expect(result.ok).toBe(true);
    expect(result.snapshot).toEqual(snapshot());
    expect(JSON.stringify(result.snapshot)).not.toMatch(/hp|secret|imgSrc|data:|dmNote|view|selected|images/i);
  });

  it('does not carry a __proto__ key from the wire into the copy or pollute prototypes', () => {
    const raw = message(snapshot()).replace('"t_goblin1",', '"t_goblin1","__proto__":{"polluted":true},');
    const parsed = parseChannelMessage(raw);
    expect(parsed.ok).toBe(true);
    expect(Object.getPrototypeOf(parsed.message.snapshot.tokens[0])).toBe(Object.prototype);
    expect(Object.keys(parsed.message.snapshot.tokens[0])).not.toContain('__proto__');
    expect({}.polluted).toBeUndefined();
  });

  it('clamps a negative size or an out-of-range grid opacity instead of dropping the snapshot', () => {
    const input = snapshot({ grid: { ...snapshot().grid, alpha: 3 } });
    input.tokens[0].w = -5;
    const result = validateBattleMapSnapshot(input);
    expect(result.ok).toBe(true);
    expect(result.snapshot.grid.alpha).toBe(1);
    expect(result.snapshot.tokens[0].w).toBe(0);
  });

  const mutate = (fn) => {
    const s = snapshot();
    fn(s);
    return s;
  };
  it.each([
    ['a non-object', () => 'snapshot'],
    ['an array', () => []],
    ['null', () => null],
    ['a wrong schema', () => snapshot({ schema: 'dmtoolbox.initiative' })],
    ['a missing schema', () => mutate((s) => delete s.schema)],
    ['a newer version', () => snapshot({ version: 3 })],
    ['the Milestone 2 version', () => snapshot({ version: 1 })],
    ['a string version', () => snapshot({ version: '2' })],
    ['a missing background', () => mutate((s) => delete s.background)],
    ['a background without a revision', () => snapshot({ background: { assetId: 'a'.repeat(64) } })],
    ['a background with a null asset id', () => snapshot({ background: { assetId: null, revision: 1 } })],
    ['a background asset id that is not a hash', () => snapshot({ background: { assetId: 'data:image/png;base64,AAAA', revision: 1 } })],
    ['an uppercase asset id', () => snapshot({ background: { assetId: 'A'.repeat(64), revision: 1 } })],
    ['a token asset id that is a URL', () => mutate((s) => (s.tokens[0].assetId = 'https://evil.example/x.png'))],
    ['a missing token asset id', () => mutate((s) => delete s.tokens[0].assetId)],
    ['a missing revision', () => mutate((s) => delete s.revision)],
    ['a string revision', () => snapshot({ revision: '8' })],
    ['a zero revision', () => snapshot({ revision: 0 })],
    ['a negative revision', () => snapshot({ revision: -3 })],
    ['a fractional revision', () => snapshot({ revision: 1.5 })],
    ['an unsafe integer revision', () => snapshot({ revision: 2 ** 60 })],
    ['a missing map', () => mutate((s) => delete s.map)],
    ['an array grid', () => snapshot({ grid: [] })],
    ['a string grid size', () => mutate((s) => (s.grid.size = '70'))],
    ['a non-boolean grid.show', () => mutate((s) => (s.grid.show = 'yes'))],
    ['a grid color that is not hex', () => mutate((s) => (s.grid.color = 'url(javascript:alert(1))'))],
    ['NaN coordinates', () => mutate((s) => (s.tokens[0].x = NaN))],
    ['Infinity coordinates', () => mutate((s) => (s.tokens[0].y = Infinity))],
    ['a coordinate far outside any map', () => mutate((s) => (s.tokens[0].x = 1e12))],
    ['a numeric string coordinate', () => mutate((s) => (s.mapTransform.x = '5'))],
    ['tokens that are not an array', () => snapshot({ tokens: { 0: {} } })],
    ['too many tokens', () => snapshot({ tokens: Array.from({ length: MAX_TOKENS + 1 }, (_, i) => ({ ...snapshot().tokens[1], id: `t${i}` })) })],
    ['a token that is not an object', () => snapshot({ tokens: ['t_goblin1'] })],
    ['a token without an id', () => mutate((s) => delete s.tokens[0].id)],
    ['an empty token id', () => mutate((s) => (s.tokens[0].id = ''))],
    ['an overlong token id', () => mutate((s) => (s.tokens[0].id = 'x'.repeat(101)))],
    ['a numeric name', () => mutate((s) => (s.tokens[0].name = 42))],
    ['an empty name', () => mutate((s) => (s.tokens[0].name = ''))],
    ['an overlong name', () => mutate((s) => (s.tokens[0].name = 'x'.repeat(MAX_TEXT + 1)))],
    ['a missing name', () => mutate((s) => delete s.tokens[0].name)],
    ['conditions that are not an array', () => mutate((s) => (s.tokens[0].conditions = 'Prone'))],
    ['too many conditions', () => mutate((s) => (s.tokens[0].conditions = Array(MAX_CONDITIONS + 1).fill('Prone')))],
    ['a non-string condition', () => mutate((s) => (s.tokens[0].conditions = [{ html: '<b>' }]))],
    ['an overlong condition', () => mutate((s) => (s.tokens[0].conditions = ['x'.repeat(MAX_TEXT + 1)]))],
    ['too many measurements', () => snapshot({ measurements: Array(MAX_MEASUREMENTS + 1).fill(snapshot().measurements[0]) })],
    ['an unknown measurement type', () => mutate((s) => (s.measurements[0].type = 'polygon'))],
    ['a measurement color that is not hex', () => mutate((s) => (s.measurements[0].color = 'red;background:url(x)'))],
  ])('rejects %s', (_label, make) => {
    const result = validateBattleMapSnapshot(make());
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('never throws, even on getters that throw', () => {
    const hostile = snapshot();
    Object.defineProperty(hostile, 'tokens', {
      get() {
        throw new Error('boom');
      },
      enumerable: true,
    });
    expect(validateBattleMapSnapshot(hostile)).toEqual({ ok: false, error: 'malformed snapshot' });
  });
});

describe('battlemap-snapshot messages', () => {
  it('round-trips a snapshot through encode and parse', () => {
    const encoded = encodeBattleMapSnapshot(snapshot());
    expect(encoded.ok).toBe(true);
    expect(JSON.parse(encoded.text)).toEqual({ v: 0, type: 'battlemap-snapshot', payload: snapshot() });
    expect(parseChannelMessage(encoded.text)).toEqual({ ok: true, message: { type: 'battlemap-snapshot', snapshot: snapshot() } });
  });

  it('reports an invalid snapshot with its message type, so the player can count it', () => {
    const result = parseChannelMessage(message(snapshot({ schema: 'other' })));
    expect(result).toMatchObject({ ok: false, type: 'battlemap-snapshot' });
    expect(result.error).toMatch(/^bad battlemap-snapshot: unknown schema/);
  });

  it('rejects a snapshot message under a different protocol version', () => {
    expect(parseChannelMessage(JSON.stringify({ v: 1, type: 'battlemap-snapshot', payload: snapshot() })).ok).toBe(false);
  });

  it('rejects an oversized message before parsing it', () => {
    const big = message({ ...snapshot(), padding: 'x'.repeat(MAX_CHANNEL_MESSAGE_BYTES) });
    const parse = vi.spyOn(JSON, 'parse');
    expect(parseChannelMessage(big)).toEqual({ ok: false, error: 'message too large' });
    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
  });

  it('refuses to encode a snapshot too large to send', () => {
    expect(encodeBattleMapSnapshot({ ...snapshot(), padding: 'x'.repeat(MAX_CHANNEL_MESSAGE_BYTES) })).toEqual({ ok: false, error: 'snapshot too large to send' });
  });
});

describe('contract with the Milestone 1 projection', () => {
  // A Battle Map state at the projection's limits: 600 tokens (500 kept) with long names and 32
  // long conditions each would be far too big, so the size budget is checked separately below.
  function source(tokenCount, measurementCount, { longText = false } = {}) {
    const text = (s) => (longText ? s.padEnd(250, 'x') : s);
    return {
      state: {
        map: { imgSrc: 'data:image/png;base64,xyz', img: {}, w: 3000, h: 2000 },
        mapTransform: { scale: 0.5, x: -100, y: 40.5 },
        grid: { size: 64, unitsPerCell: 5, color: '#aabbcc', alpha: 0.4, show: false, offsetX: 7.25, offsetY: -3 },
        view: { x: 1, y: 2, scale: 3 },
        tokens: Array.from({ length: tokenCount }, (_, i) => ({
          id: `t_${i}`,
          name: text(`Token ${i}`),
          showLabel: i % 2 === 0,
          x: i * 13.5,
          y: -i * 7,
          w: 64,
          h: 64,
          rot: i * 0.1,
          hp: 5,
          maxHp: 9,
          imgSrc: '/images/x.png',
          statusConditions: i % 3 === 0 ? ['Prone', text('Frightened')] : [],
        })),
      },
      persistentMeasurements: Array.from({ length: measurementCount }, (_, i) => ({
        id: `pm-${i}`,
        type: ['line', 'cone', 'circle'][i % 3],
        x1: i,
        y1: i * 2,
        x2: i * 3,
        y2: -i,
        color: '#8bd3ff',
        selected: i === 0,
      })),
    };
  }

  it.each([
    ['an empty map', source(0, 0)],
    ['a typical table', source(12, 4)],
    ['more tokens and measurements than the projection keeps', source(600, 600)],
    ['text at the projection length limit', source(20, 0, { longText: true })],
  ])('every seam snapshot of %s is accepted unchanged', (_label, src) => {
    const seam = createShareStateSeam({ getSource: () => src });
    const snap = seam.getPlayerSafeState();
    const result = validateBattleMapSnapshot(snap);
    expect(result.ok).toBe(true);
    expect(result.snapshot).toEqual(snap);
  });

  it('the projection with the default (empty) Battle Map state is accepted', () => {
    const snap = { ...projectPlayerSafeState({ state: {}, persistentMeasurements: [] }), revision: 1 };
    expect(validateBattleMapSnapshot(snap).ok).toBe(true);
  });

  it('a full 500-token, 500-measurement table fits in one message', () => {
    const snap = createShareStateSeam({ getSource: () => source(600, 600) }).getPlayerSafeState();
    expect(snap.tokens).toHaveLength(MAX_TOKENS);
    expect(snap.measurements).toHaveLength(MAX_MEASUREMENTS);
    const encoded = encodeBattleMapSnapshot(snap);
    expect(encoded.ok).toBe(true);
    expect(new TextEncoder().encode(encoded.text).length).toBeLessThan(MAX_CHANNEL_MESSAGE_BYTES);
  });
});

describe('snapshot receiver: latest state wins', () => {
  const at = (revision) => ({ ...snapshot(), revision });

  it('applies newer revisions and ignores same or older ones', () => {
    const applied = [];
    const receiver = createSnapshotReceiver({ onApply: (s) => applied.push(s.revision) });
    expect(receiver.lastAppliedRevision).toBe(0);
    expect(receiver.receive(at(3))).toBe('applied');
    expect(receiver.receive(at(3))).toBe('stale'); // duplicate
    expect(receiver.receive(at(2))).toBe('stale'); // older, arrived late
    expect(receiver.receive(at(9))).toBe('applied'); // gaps are fine: whole snapshots
    expect(receiver.receive(at(4))).toBe('stale');
    expect(applied).toEqual([3, 9]);
    expect(receiver.lastAppliedRevision).toBe(9);
    expect(receiver.stats()).toEqual({
      snapshotsReceived: 5,
      snapshotsApplied: 2,
      snapshotsIgnoredStale: 3,
      snapshotsRejectedInvalid: 0,
      lastSnapshotReceivedRevision: 4,
      lastSnapshotAppliedRevision: 9,
      lastSnapshotError: null,
    });
  });

  it('counts rejected messages without changing what is applied', () => {
    const onApply = vi.fn();
    const receiver = createSnapshotReceiver({ onApply });
    receiver.receive(at(5));
    receiver.reject('bad battlemap-snapshot: unknown schema');
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(receiver.lastAppliedRevision).toBe(5);
    expect(receiver.stats()).toMatchObject({ snapshotsRejectedInvalid: 1, lastSnapshotError: 'bad battlemap-snapshot: unknown schema' });
  });

  it('diagnostics never contain snapshot content', () => {
    const receiver = createSnapshotReceiver({ onApply: () => {} });
    receiver.receive(at(1));
    expect(JSON.stringify(receiver.stats())).not.toMatch(/Goblin|Prone|t_goblin1|#ff8800/);
  });
});
