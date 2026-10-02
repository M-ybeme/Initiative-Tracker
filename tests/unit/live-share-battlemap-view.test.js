// Live Share Milestone 2: the player's read-only Battle Map view
// (js/modules/live-share/battlemap-view.js), rendered into a happy-dom SVG.
import { describe, it, expect, beforeEach } from 'vitest';
import { renderBattleMapSnapshot, setPlayerView, computeViewBox, tokenHue, MAX_GRID_LINES } from '../../js/modules/live-share/battlemap-view.js';

function snapshot(overrides = {}) {
  return {
    schema: 'dmtoolbox.battlemap.player-safe',
    version: 1,
    revision: 12,
    map: { width: 0, height: 0 },
    mapTransform: { scale: 1, x: 0, y: 0 },
    grid: { size: 50, unitsPerCell: 5, color: '#6aa5ff', alpha: 0.35, show: true, offsetX: 10, offsetY: 20 },
    tokens: [
      { id: 't_goblin', x: 100, y: 200, w: 50, h: 50, rot: Math.PI / 2, name: 'Goblin Boss', conditions: ['Prone', 'Poisoned'] },
      { id: 't_hidden_name', x: 300, y: 250, w: 100, h: 100, rot: 0, name: null, conditions: [] },
    ],
    measurements: [
      { id: 'pm-line', type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, color: '#8bd3ff' },
      { id: 'pm-cone', type: 'cone', x1: 400, y1: 100, x2: 500, y2: 100, color: '#ff8800' },
      { id: 'pm-circle', type: 'circle', x1: 200, y1: 400, x2: 200, y2: 450, color: '#00ff00' },
    ],
    ...overrides,
  };
}

function deepFreeze(o) {
  Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(o);
}

let svg;
beforeEach(() => {
  document.body.innerHTML = '';
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.append(svg);
});

const nums = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);

describe('Battle Map player view', () => {
  it('draws each token at its world position, size and rotation, with a stable identity', () => {
    renderBattleMapSnapshot(svg, snapshot());
    const tokens = [...svg.querySelectorAll('.ls-token')];
    expect(tokens.map((g) => g.getAttribute('data-token-id'))).toEqual(['t_goblin', 't_hidden_name']);
    // Centre = top-left + half the size; rotation in degrees about the centre.
    expect(nums(tokens[0].querySelector('.ls-token-body').getAttribute('transform'))).toEqual([125, 225, 90]);
    expect(nums(tokens[1].querySelector('.ls-token-body').getAttribute('transform'))).toEqual([350, 300, 0]);
    const ellipse = tokens[1].querySelector('ellipse');
    expect([ellipse.getAttribute('rx'), ellipse.getAttribute('ry')]).toEqual(['50', '50']);
    // The same id always gets the same marker color.
    expect(tokenHue('t_goblin')).toBe(tokenHue('t_goblin'));
    expect(tokens[0].querySelector('ellipse').getAttribute('fill')).toBe(`hsl(${tokenHue('t_goblin')} 45% 38%)`);
  });

  it('shows names and conditions only where the snapshot has them, above the token and unrotated', () => {
    renderBattleMapSnapshot(svg, snapshot());
    const [goblin, other] = svg.querySelectorAll('.ls-token');
    expect(goblin.querySelector('.ls-token-name').textContent).toBe('Goblin Boss');
    expect(goblin.querySelector('.ls-token-conditions').textContent).toBe('Prone, Poisoned');
    expect(goblin.querySelector('.ls-token-labels').getAttribute('transform')).toBe('translate(125 225)');
    expect(other.querySelector('.ls-token-name')).toBeNull();
    expect(other.querySelector('.ls-token-conditions')).toBeNull();
  });

  it('renders names and conditions as text, never as markup', () => {
    const hostile = snapshot({
      tokens: [{ id: '"><script>alert(1)</script>', x: 0, y: 0, w: 50, h: 50, rot: 0, name: '<img src=x onerror=alert(1)>', conditions: ['<b>Prone</b>'] }],
    });
    renderBattleMapSnapshot(svg, hostile);
    expect(svg.querySelector('img, script, b')).toBeNull();
    expect(svg.querySelector('.ls-token-name').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(svg.querySelector('.ls-token-conditions').textContent).toBe('<b>Prone</b>');
    expect(svg.querySelector('.ls-token').getAttribute('data-token-id')).toBe('"><script>alert(1)</script>');
  });

  it('draws grid lines on the grid: every cell from the offset, and a major line every 5 cells', () => {
    renderBattleMapSnapshot(svg, snapshot());
    const grid = svg.querySelector('.ls-grid');
    expect(grid.getAttribute('stroke')).toBe('#6aa5ff');
    expect(grid.getAttribute('stroke-opacity')).toBe('0.35');
    const vertical = (cls) => [...grid.querySelectorAll(cls)].filter((l) => l.getAttribute('x1') === l.getAttribute('x2')).map((l) => Number(l.getAttribute('x1')));
    const horizontal = (cls) => [...grid.querySelectorAll(cls)].filter((l) => l.getAttribute('y1') === l.getAttribute('y2')).map((l) => Number(l.getAttribute('y1')));
    expect(vertical('.ls-grid-minor').length).toBeGreaterThan(5);
    for (const x of vertical('.ls-grid-minor')) expect((((x - 10) % 50) + 50) % 50).toBe(0);
    for (const y of horizontal('.ls-grid-minor')) expect((((y - 20) % 50) + 50) % 50).toBe(0);
    for (const x of vertical('.ls-grid-major')) expect((((x - 10) % 250) + 250) % 250).toBe(0);
  });

  it('draws no grid when it is hidden, and caps the number of lines for a tiny cell size', () => {
    renderBattleMapSnapshot(svg, snapshot({ grid: { ...snapshot().grid, show: false } }));
    expect(svg.querySelectorAll('.ls-grid line')).toHaveLength(0);

    const huge = snapshot({ map: { width: 100000, height: 100000 }, grid: { ...snapshot().grid, size: 4 } });
    renderBattleMapSnapshot(svg, huge);
    const lines = svg.querySelectorAll('.ls-grid line').length;
    expect(lines).toBeLessThanOrEqual(MAX_GRID_LINES * 4);

    renderBattleMapSnapshot(svg, snapshot({ grid: { ...snapshot().grid, size: 0 } }));
    expect(svg.querySelectorAll('.ls-grid line')).toHaveLength(0);
  });

  it('draws measurements with the DM map geometry and a distance label from the grid', () => {
    renderBattleMapSnapshot(svg, snapshot());
    const byId = (id) => svg.querySelector(`[data-measurement-id="${id}"]`);
    const line = byId('pm-line');
    expect(line.getAttribute('data-type')).toBe('line');
    expect(line.getAttribute('stroke')).toBe('#8bd3ff');
    expect(['x1', 'y1', 'x2', 'y2'].map((a) => line.querySelector('line').getAttribute(a))).toEqual(['0', '0', '150', '0']);
    expect(line.querySelector('.ls-measurement-label').textContent).toBe('15 ft'); // 3 cells × 5 ft

    // Cone: 90°, apex at (x1, y1), pointing at (x2, y2).
    const cone = byId('pm-cone');
    expect(cone.querySelector('path').getAttribute('d')).toBe('M 400 100 L 470.71 29.29 A 100 100 0 0 1 470.71 170.71 Z');
    expect(cone.querySelector('.ls-measurement-label').textContent).toBe('10 ft cone');

    // Circle: radius is the length plus half a cell, as on the DM's map.
    const circle = byId('pm-circle');
    expect(circle.querySelector('circle').getAttribute('r')).toBe('75');
    expect(circle.querySelector('.ls-measurement-label').textContent).toBe('8 ft radius'); // (1 + 0.5) cells × 5 ft = 7.5
  });

  it('marks the map surface where the map image will go, without any image', () => {
    renderBattleMapSnapshot(svg, snapshot({ map: { width: 1000, height: 600 }, mapTransform: { scale: 1.5, x: -20, y: 10 } }));
    const surface = svg.querySelector('.ls-map-surface');
    expect(['x', 'y', 'width', 'height'].map((a) => surface.getAttribute(a))).toEqual(['-20', '10', '1500', '900']);
    expect(svg.querySelector('image, foreignObject')).toBeNull();
  });

  it('fits the view to the map surface and all content', () => {
    const s = snapshot({ map: { width: 1000, height: 600 }, mapTransform: { scale: 1.5, x: -20, y: 10 } });
    const box = computeViewBox(s);
    expect(box.x).toBeLessThanOrEqual(-20);
    expect(box.y).toBeLessThanOrEqual(0);
    expect(box.x + box.w).toBeGreaterThanOrEqual(1480);
    expect(box.y + box.h).toBeGreaterThanOrEqual(910);
    renderBattleMapSnapshot(svg, s);
    expect(svg.getAttribute('viewBox')).toBe(`${box.x} ${box.y} ${box.w} ${box.h}`);
    // With nothing on the map, a default area.
    expect(computeViewBox(snapshot({ tokens: [], measurements: [] }))).toEqual({ x: 0, y: 0, w: 800, h: 500 });
  });

  it('does not mutate the snapshot it draws', () => {
    const s = deepFreeze(snapshot());
    const copy = JSON.parse(JSON.stringify(s));
    expect(() => renderBattleMapSnapshot(svg, s)).not.toThrow();
    expect(s).toEqual(copy);
  });

  it('replaces the previous drawing entirely on each snapshot', () => {
    renderBattleMapSnapshot(svg, snapshot());
    renderBattleMapSnapshot(svg, snapshot({ revision: 13, tokens: [], measurements: [] }));
    expect(svg.querySelectorAll('.ls-token')).toHaveLength(0);
    expect(svg.querySelectorAll('.ls-measurement')).toHaveLength(0);
    expect(svg.getAttribute('data-revision')).toBe('13');
  });

  it('has no interactive or editing elements', () => {
    renderBattleMapSnapshot(svg, snapshot());
    expect(svg.querySelector('a, button, input, foreignObject, [onclick], [tabindex]')).toBeNull();
  });
});

describe('Battle Map player view: assets (Milestone 3)', () => {
  const ART = 'd'.repeat(64);
  const withMap = (over = {}) =>
    snapshot({ map: { width: 1000, height: 600 }, mapTransform: { scale: 1.5, x: -20, y: 10 }, background: { assetId: 'b'.repeat(64), revision: 3 }, ...over });

  it('draws the background as the bottom layer, placed and scaled by the map transform', () => {
    renderBattleMapSnapshot(svg, withMap(), { background: { url: 'blob:http://localhost/bg', assetId: 'b'.repeat(64) } });
    const img = svg.querySelector('.ls-background-image');
    expect(['href', 'x', 'y', 'width', 'height', 'preserveAspectRatio'].map((a) => img.getAttribute(a))).toEqual(['blob:http://localhost/bg', '-20', '10', '1500', '900', 'none']);
    const order = [...svg.children].map((n) => n.getAttribute('class'));
    expect(order).toEqual(['ls-background', 'ls-map-surface', 'ls-background-image', 'ls-grid', 'ls-overlays', 'ls-tokens', 'ls-measurements']);
  });

  it('keeps the neutral placeholder surface while the background is missing', () => {
    renderBattleMapSnapshot(svg, withMap(), { background: null });
    expect(svg.querySelector('.ls-background-image')).toBeNull();
    expect(svg.querySelector('.ls-map-surface')).not.toBeNull();
  });

  it('only ever uses blob: URLs it made itself', () => {
    for (const url of ['https://evil.example/map.png', 'data:image/png;base64,AAAA', 'javascript:alert(1)', '']) {
      renderBattleMapSnapshot(svg, withMap({ tokens: [{ id: 't', x: 0, y: 0, w: 50, h: 50, rot: 0, name: null, conditions: [], assetId: ART }] }), {
        background: { url, assetId: 'x' },
        tokenUrl: () => url,
      });
      expect(svg.querySelector('image')).toBeNull();
    }
  });

  it('draws custom token art when it has arrived, and the marker otherwise', () => {
    const tokens = [
      { id: 'art', x: 100, y: 100, w: 50, h: 80, rot: Math.PI, name: 'Hero', conditions: [], assetId: ART },
      { id: 'waiting', x: 200, y: 100, w: 50, h: 50, rot: 0, name: null, conditions: [], assetId: 'e'.repeat(64) },
      { id: 'plain', x: 300, y: 100, w: 50, h: 50, rot: 0, name: null, conditions: [], assetId: null },
    ];
    const urls = { [ART]: 'blob:http://localhost/art' };
    renderBattleMapSnapshot(svg, withMap({ tokens }), { tokenUrl: (id) => urls[id] || null });
    const [art, waiting, plain] = svg.querySelectorAll('.ls-token');
    expect(art.getAttribute('data-art')).toBe('image');
    const img = art.querySelector('.ls-token-art');
    expect(['href', 'x', 'y', 'width', 'height'].map((a) => img.getAttribute(a))).toEqual(['blob:http://localhost/art', '-25', '-40', '50', '80']);
    expect(art.querySelector('.ls-token-body').getAttribute('transform')).toBe('translate(125 140) rotate(180)');
    expect(art.querySelector('.ls-token-name').textContent).toBe('Hero');
    expect(waiting.getAttribute('data-art')).toBe('marker');
    expect(plain.getAttribute('data-art')).toBe('marker');
    expect(plain.querySelector('ellipse')).not.toBeNull();
  });
});

describe('Battle Map player view: aura and vision cone (Milestone 4)', () => {
  // Centre (125, 225); grid 50 per cell.
  const token = (over = {}) => ({ id: 't_seer', x: 100, y: 200, w: 50, h: 50, rot: 0, name: null, conditions: [], assetId: null, aura: null, visionCone: null, ...over });
  const withOverlays = (over = {}, snap = {}) => snapshot({ tokens: [token(over)], measurements: [], ...snap });
  const near = (actual, expected) => actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 1));
  // Path "M cx cy L start A r r 0 0 1 mid A r r 0 0 1 end Z" -> its points and radius.
  const cone = () => {
    const n = nums(svg.querySelector('.ls-vision-cone').getAttribute('d'));
    return { apex: n.slice(0, 2), start: n.slice(2, 4), r: n[4], mid: n.slice(9, 11), end: n.slice(16, 18), flags: [n[6], n[7], n[8], n[13], n[14], n[15]] };
  };

  it('draws the aura centred on the token, (radius + 0.5) cells, as the DM map does', () => {
    renderBattleMapSnapshot(svg, withOverlays({ aura: { radius: 2, color: '#ff0000' } }));
    const c = svg.querySelector('.ls-aura');
    expect(['cx', 'cy', 'r'].map((a) => Number(c.getAttribute(a)))).toEqual([125, 225, 125]);
    expect([c.getAttribute('fill'), c.getAttribute('stroke'), c.getAttribute('fill-opacity'), c.getAttribute('stroke-opacity')]).toEqual(['#ff0000', '#ff0000', '0.2', '0.6']);
    expect(c.closest('.ls-token-overlays').getAttribute('data-token-id')).toBe('t_seer');
  });

  it('scales the aura and cone with the grid size, in world units', () => {
    renderBattleMapSnapshot(svg, withOverlays({ aura: { radius: 2, color: '#ff0000' }, visionCone: { range: 3, angle: 90, color: '#ffff88' } }, { grid: { ...snapshot().grid, size: 100 } }));
    expect(Number(svg.querySelector('.ls-aura').getAttribute('r'))).toBe(250);
    expect(cone().r).toBe(300);
    near(cone().mid, [125 + 300, 225]);
  });

  it('follows the token position (non-origin, negative coordinates)', () => {
    renderBattleMapSnapshot(svg, withOverlays({ x: -475, y: 1230, aura: { radius: 1, color: '#ff0000' }, visionCone: { range: 2, angle: 60, color: '#ffff88' } }));
    const c = svg.querySelector('.ls-aura');
    expect([Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]).toEqual([-450, 1255]);
    near(cone().apex, [-450, 1255]);
    near(cone().mid, [-450 + 100, 1255]);
  });

  it('draws the vision cone from the token centre, range cells long, angle degrees wide, about the rotation', () => {
    renderBattleMapSnapshot(svg, withOverlays({ rot: Math.PI / 2, visionCone: { range: 6, angle: 90, color: '#ffff88' } }));
    const { apex, start, mid, end, r, flags } = cone();
    near(apex, [125, 225]);
    expect(r).toBe(300);
    const d = 300 * Math.SQRT1_2;
    near(start, [125 + d, 225 + d]); // rot - 45°
    near(mid, [125, 525]); // straight along the rotation (+y on screen)
    near(end, [125 - d, 225 + d]); // rot + 45°
    expect(flags).toEqual([0, 0, 1, 0, 0, 1]); // two clockwise arcs, each at most 180°
    const p = svg.querySelector('.ls-vision-cone');
    expect([p.getAttribute('fill'), p.getAttribute('stroke'), p.getAttribute('fill-opacity'), p.getAttribute('stroke-opacity')]).toEqual(['#ffff88', '#ffff88', '0.15', '0.4']);
  });

  it('rotation 0 points along +x, as on the DM canvas', () => {
    renderBattleMapSnapshot(svg, withOverlays({ visionCone: { range: 2, angle: 30, color: '#ffff88' } }));
    near(cone().mid, [225, 225]);
  });

  it.each([
    ['0 and 2π', 0, 2 * Math.PI],
    ['0 and -2π', 0, -2 * Math.PI],
    ['0 and 6π (legacy unnormalized)', 0, 6 * Math.PI],
    ['3π/2 and -π/2', (3 * Math.PI) / 2, -Math.PI / 2],
    ['π and -π', Math.PI, -Math.PI],
    ['π/2 and 5π/2', Math.PI / 2, (5 * Math.PI) / 2],
  ])('equivalent rotations (%s) draw the same cone', (_label, a, b) => {
    renderBattleMapSnapshot(svg, withOverlays({ rot: a, visionCone: { range: 4, angle: 75, color: '#ffff88' } }));
    const first = cone();
    renderBattleMapSnapshot(svg, withOverlays({ rot: b, visionCone: { range: 4, angle: 75, color: '#ffff88' } }));
    const second = cone();
    for (const k of ['apex', 'start', 'mid', 'end']) near(second[k], first[k]);
  });

  it.each([
    [0, [225, 225]],
    [90, [125, 325]],
    [180, [25, 225]],
    [270, [125, 125]],
    [360, [225, 225]],
  ])('the cone points along a %s° rotation, and turns with the token', (deg, mid) => {
    const rot = (deg * Math.PI) / 180;
    renderBattleMapSnapshot(svg, withOverlays({ rot, visionCone: { range: 2, angle: 90, color: '#ffff88' } }));
    near(cone().mid, mid);
    // The token body turns by the same rotation.
    expect(nums(svg.querySelector('.ls-token-body').getAttribute('transform'))[2]).toBeCloseTo(deg, 1);
  });

  it('a 360° cone is a whole circle (start and end meet opposite the midpoint)', () => {
    renderBattleMapSnapshot(svg, withOverlays({ visionCone: { range: 2, angle: 360, color: '#ffff88' } }));
    const { start, mid, end } = cone();
    near(start, [25, 225]);
    near(end, [25, 225]);
    near(mid, [225, 225]);
  });

  it('draws overlays beneath every token (as on the DM map), and never as interactive content', () => {
    renderBattleMapSnapshot(svg, withOverlays({ aura: { radius: 1, color: '#ff0000' }, visionCone: { range: 2, angle: 90, color: '#ffff88' } }));
    const order = [...svg.children].map((n) => n.getAttribute('class'));
    expect(order.slice(-3)).toEqual(['ls-overlays', 'ls-tokens', 'ls-measurements']);
    expect(svg.querySelector('.ls-overlays').getAttribute('pointer-events')).toBe('none');
    // Aura below the cone within a token's overlays, as the DM draws them.
    expect([...svg.querySelector('.ls-token-overlays').children].map((n) => n.getAttribute('class'))).toEqual(['ls-aura', 'ls-vision-cone']);
    expect(svg.querySelector('.ls-overlays [style], .ls-overlays a, .ls-overlays foreignObject, .ls-overlays [onclick]')).toBeNull();
  });

  it('draws nothing for a token without overlays, or when the grid has no size', () => {
    renderBattleMapSnapshot(svg, withOverlays());
    expect(svg.querySelector('.ls-overlays').childNodes).toHaveLength(0);
    renderBattleMapSnapshot(svg, withOverlays({ aura: { radius: 2, color: '#ff0000' } }, { grid: { ...snapshot().grid, size: 0 } }));
    expect(svg.querySelector('.ls-aura')).toBeNull();
  });

  it('removes the overlays of a token the next snapshot no longer has', () => {
    renderBattleMapSnapshot(svg, withOverlays({ aura: { radius: 2, color: '#ff0000' }, visionCone: { range: 2, angle: 90, color: '#ffff88' } }));
    expect(svg.querySelectorAll('.ls-token-overlays')).toHaveLength(1);
    renderBattleMapSnapshot(svg, snapshot({ revision: 13, tokens: [], measurements: [] }));
    expect(svg.querySelectorAll('.ls-token-overlays, .ls-aura, .ls-vision-cone')).toHaveLength(0);
  });

  it('overlays do not change how the view is framed', () => {
    const plain = withOverlays();
    const big = withOverlays({ aura: { radius: 1000, color: '#ff0000' }, visionCone: { range: 1000, angle: 360, color: '#ffff88' } });
    expect(computeViewBox(big)).toEqual(computeViewBox(plain));
  });

  it('does not mutate a snapshot with overlays', () => {
    const s = deepFreeze(withOverlays({ aura: { radius: 2, color: '#ff0000' }, visionCone: { range: 2, angle: 90, color: '#ffff88' } }));
    expect(() => renderBattleMapSnapshot(svg, s)).not.toThrow();
  });
});

describe('Battle Map player view: built-in token images and the player view (2.3.30)', () => {
  const PRESET = '/images/playerTokens/PlayerBardToken.png';
  const presetUrl = (id) => ({ 'player-bard': PRESET, 'bad-one': 'https://evil.example/x.png', 'sneaky': '/images/playerTokens/../../secret.png' })[id] || null;
  const tok = (over) => ({ id: 't', x: 100, y: 100, w: 50, h: 50, rot: 0, name: null, conditions: [], assetId: null, presetId: null, ...over });

  it('draws a known preset id with its built-in image', () => {
    renderBattleMapSnapshot(svg, snapshot({ tokens: [tok({ presetId: 'player-bard' })] }), { presetUrl });
    const g = svg.querySelector('.ls-token');
    expect(g.getAttribute('data-art')).toBe('preset');
    const img = g.querySelector('.ls-token-art');
    expect(['href', 'x', 'y', 'width', 'height'].map((a) => img.getAttribute(a))).toEqual([PRESET, '-25', '-25', '50', '50']);
  });

  it('every built-in preset in the registry passes the renderer path check (they stay in step)', async () => {
    await import('../../js/modules/battle-map-token-presets.js');
    const { PRESETS, presetSrc } = globalThis.BattleMapTokenPresets;
    renderBattleMapSnapshot(svg, snapshot({ tokens: PRESETS.map((p, i) => tok({ id: `t${i}`, presetId: p.id })) }), { presetUrl: presetSrc });
    const drawn = [...svg.querySelectorAll('.ls-token')];
    expect(drawn).toHaveLength(PRESETS.length);
    for (const [i, g] of drawn.entries()) {
      expect(g.getAttribute('data-art'), PRESETS[i].id).toBe('preset');
      expect(g.querySelector('.ls-token-art').getAttribute('href')).toBe(PRESETS[i].src);
    }
  });

  it('custom art wins over a preset; an unknown preset id is a marker', () => {
    renderBattleMapSnapshot(svg, snapshot({ tokens: [tok({ id: 'a', assetId: 'd'.repeat(64), presetId: 'player-bard' }), tok({ id: 'b', presetId: 'player-unknown' })] }), {
      presetUrl,
      tokenUrl: () => 'blob:http://localhost/art',
    });
    const [a, b] = svg.querySelectorAll('.ls-token');
    expect(a.getAttribute('data-art')).toBe('image');
    expect(a.querySelector('.ls-token-art').getAttribute('href')).toBe('blob:http://localhost/art');
    expect(b.getAttribute('data-art')).toBe('marker');
    expect(b.querySelector('image')).toBeNull();
  });

  it('never draws a preset resolver result that is not a built-in token path', () => {
    for (const presetId of ['bad-one', 'sneaky']) {
      renderBattleMapSnapshot(svg, snapshot({ tokens: [tok({ presetId })] }), { presetUrl });
      expect(svg.querySelector('image')).toBeNull();
      expect(svg.querySelector('.ls-token').getAttribute('data-art')).toBe('marker');
    }
    // Without a resolver at all: markers.
    renderBattleMapSnapshot(svg, snapshot({ tokens: [tok({ presetId: 'player-bard' })] }));
    expect(svg.querySelector('image')).toBeNull();
  });

  it('a token marker keeps its color across snapshots (derived from its id)', () => {
    renderBattleMapSnapshot(svg, snapshot({ tokens: [tok({ id: 't_orc' })] }));
    const first = svg.querySelector('ellipse').getAttribute('fill');
    renderBattleMapSnapshot(svg, snapshot({ revision: 99, tokens: [tok({ id: 't_orc', x: 900 }), tok({ id: 't_x' })] }));
    expect(svg.querySelector('[data-token-id="t_orc"] ellipse').getAttribute('fill')).toBe(first);
  });

  it('shows a player view instead of the fitted one when given, and marks which', () => {
    const s = snapshot();
    const fit = computeViewBox(s);
    renderBattleMapSnapshot(svg, s);
    expect(svg.getAttribute('data-view')).toBe('fit');
    expect(svg.getAttribute('viewBox')).toBe(`${fit.x} ${fit.y} ${fit.w} ${fit.h}`);
    renderBattleMapSnapshot(svg, s, {}, { x: 10, y: 20, w: 200, h: 100 });
    expect(svg.getAttribute('data-view')).toBe('player');
    expect(svg.getAttribute('viewBox')).toBe('10 20 200 100');
  });

  it('setPlayerView changes only the viewBox, backdrop and grid; tokens and images are kept as they are', () => {
    const s = snapshot({ map: { width: 1000, height: 600 }, background: { assetId: 'b'.repeat(64), revision: 1 } });
    renderBattleMapSnapshot(svg, s, { background: { url: 'blob:http://localhost/bg', assetId: 'b'.repeat(64) } });
    const tokens = svg.querySelector('.ls-tokens');
    const image = svg.querySelector('.ls-background-image');
    const fitBox = svg.getAttribute('viewBox');
    setPlayerView(svg, s, { x: -3000, y: -2000, w: 400, h: 300 });
    expect(svg.getAttribute('viewBox')).toBe('-3000 -2000 400 300');
    expect(svg.querySelector('.ls-tokens')).toBe(tokens);
    expect(svg.querySelector('.ls-background-image')).toBe(image);
    // The backdrop and grid now also cover the new view (and one view-size around it).
    const bg = svg.querySelector('.ls-background');
    expect(Number(bg.getAttribute('x'))).toBeLessThanOrEqual(-3400);
    expect(Number(bg.getAttribute('y'))).toBeLessThanOrEqual(-2300);
    const xs = [...svg.querySelectorAll('.ls-grid-minor')].map((l) => Number(l.getAttribute('x1')));
    expect(Math.min(...xs)).toBeLessThanOrEqual(-3400);
    expect(svg.querySelectorAll('.ls-background, .ls-grid')).toHaveLength(2);
    setPlayerView(svg, s, null);
    expect(svg.getAttribute('viewBox')).toBe(fitBox);
    expect(svg.getAttribute('data-view')).toBe('fit');
  });
});
