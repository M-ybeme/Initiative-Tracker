/**
 * Live Share Milestone 2: the player's read-only view of a Battle Map snapshot.
 *
 * renderBattleMapSnapshot(svg, snapshot, assets) replaces the SVG's contents with a drawing of one
 * validated snapshot (battlemap-snapshot.js). It is a pure function of the snapshot: it never mutates it, keeps
 * no state between calls, and has no editing, selection or handles. Text (token names, conditions)
 * is only ever set through textContent; colors are the snapshot's already-validated hex values.
 *
 * Geometry is the Battle Map's world space, unchanged, so later milestones can layer the map image
 * and fog on top (compare battlemap.html renderMapLayer / renderTokenLayer / drawGrid /
 * renderPersistentMeasurements):
 *   map        the image's natural size in image space; the map transform places it in the world at
 *              (mapTransform.x, mapTransform.y), scaled by mapTransform.scale. A neutral surface is
 *              drawn there; the player-visible background (Milestone 3: map with fog baked in, made
 *              on the host in map image space) covers it when it has arrived. A background encoded
 *              at a reduced resolution is still stretched to the map's full size.
 *   grid       world-space lines every grid.size from (offsetX, offsetY), a major line every 5 cells.
 *   tokens     (x, y) is the top-left corner, w × h the size, rotated by `rot` radians about the
 *              centre. Drawn with its custom art when that has arrived (Milestone 3), else with its
 *              built-in image when it names a preset this player knows (2.3.30), otherwise as an
 *              ellipse marker with a notch marking the image's top edge, colored from its id (stable
 *              across snapshots and reconnects).
 *   labels     name and conditions sit unrotated above the token, as on the DM's map.
 *   overlays   (Milestone 4) a token's aura and vision cone, drawn beneath every token as on the DM's
 *              map. Aura: a circle about the token's centre of (radius + 0.5) cells, the extra half
 *              cell being the token's own. Vision cone: a wedge from the centre, `range` cells long and
 *              `angle` degrees wide, centred on the token's rotation (radians; 0 points along +x).
 *              Both are grid-relative world geometry, so they follow grid size and the token. They are
 *              presentation only: they never take part in the view's framing or hit-testing.
 *   measure    line; cone (90°, apex at x1,y1); circle (radius = length + half a cell, like the DM's).
 *              Their distance labels are derived here from the geometry and the grid's units per cell.
 *
 * Viewport: the snapshot deliberately carries no pan/zoom (the DM's view is the DM's own). By default
 * the player's view fits the SVG viewBox to the map surface and everything on it; since 2.3.30 the
 * player can pan and zoom it locally (player-view.js), which only ever changes this viewBox, never
 * the snapshot. The background and grid extend a view beyond it on every side, so letterboxing on a
 * wider or taller screen still shows the grid rather than an edge.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
// Images are only ever drawn from object URLs the player made itself from verified bytes, or (2.3.30)
// from the player's own built-in token images, resolved from a known preset id
// (battle-map-token-presets.js): a same-origin path of exactly this shape, never a URL from the wire.
const safeUrl = (url) => (typeof url === 'string' && url.startsWith('blob:') ? url : null);
const PRESET_PATH = /^\/images\/(?:playerTokens|enemyTokens)\/[A-Za-z]+Token\.png$/;
const safePresetUrl = (url) => (typeof url === 'string' && PRESET_PATH.test(url) ? url : null);
export const MAX_GRID_LINES = 400; // per axis; beyond this only major lines are drawn, then none
const DEFAULT_CELL = 50;

function el(doc, name, attrs = {}) {
  const node = doc.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

const r2 = (n) => Math.round(n * 100) / 100;

/** A stable marker color for a token id, so a token keeps its color between snapshots. */
export function tokenHue(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function circleRadius(m, cell) {
  return Math.hypot(m.x2 - m.x1, m.y2 - m.y1) + 0.5 * cell;
}

/** The world rectangle the player's view shows: the map surface and all content, padded. */
export function computeViewBox(snapshot) {
  const cell = snapshot.grid.size > 0 ? snapshot.grid.size : DEFAULT_CELL;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x0, y0, x1, y1) => {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  };
  const { map, mapTransform: mt } = snapshot;
  if (map.width > 0 && map.height > 0) add(mt.x, mt.y, mt.x + map.width * mt.scale, mt.y + map.height * mt.scale);
  for (const t of snapshot.tokens) {
    // Room for rotation and for the labels above the token.
    const reach = Math.hypot(t.w, t.h) / 2;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    add(cx - reach, cy - reach - t.h * 0.6, cx + reach, cy + reach);
  }
  for (const m of snapshot.measurements) {
    if (m.type === 'line') add(Math.min(m.x1, m.x2), Math.min(m.y1, m.y2), Math.max(m.x1, m.x2), Math.max(m.y1, m.y2));
    else {
      const r = m.type === 'circle' ? circleRadius(m, cell) : Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
      add(m.x1 - r, m.y1 - r, m.x1 + r, m.y1 + r);
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: cell * 16, h: cell * 10 };
  // Pad by a cell, and never zoom in closer than 8 × 6 cells.
  let w = maxX - minX + cell * 2;
  let h = maxY - minY + cell * 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  w = Math.max(w, cell * 8);
  h = Math.max(h, cell * 6);
  return { x: r2(cx - w / 2), y: r2(cy - h / 2), w: r2(w), h: r2(h) };
}

function renderGrid(doc, grid, box) {
  const g = el(doc, 'g', { class: 'ls-grid', 'data-size': grid.size, 'data-offset-x': grid.offsetX, 'data-offset-y': grid.offsetY });
  if (!grid.show || !(grid.size > 0)) return g;
  g.setAttribute('stroke', grid.color);
  g.setAttribute('stroke-opacity', grid.alpha);

  const lines = (step, width, cls) => {
    const firstX = Math.floor((box.x - grid.offsetX) / step) * step + grid.offsetX;
    const firstY = Math.floor((box.y - grid.offsetY) / step) * step + grid.offsetY;
    const countX = Math.floor((box.x + box.w - firstX) / step) + 1;
    const countY = Math.floor((box.y + box.h - firstY) / step) + 1;
    if (countX > MAX_GRID_LINES || countY > MAX_GRID_LINES) return false;
    const attrs = { class: cls, 'stroke-width': width, 'vector-effect': 'non-scaling-stroke' };
    for (let i = 0; i < countX; i++) {
      const x = r2(firstX + i * step);
      g.append(el(doc, 'line', { ...attrs, x1: x, y1: box.y, x2: x, y2: box.y + box.h }));
    }
    for (let i = 0; i < countY; i++) {
      const y = r2(firstY + i * step);
      g.append(el(doc, 'line', { ...attrs, x1: box.x, y1: y, x2: box.x + box.w, y2: y }));
    }
    return true;
  };
  lines(grid.size, 1, 'ls-grid-minor');
  lines(grid.size * 5, 2, 'ls-grid-major');
  return g;
}

function renderToken(doc, t, artUrl, presetUrl) {
  const cx = r2(t.x + t.w / 2);
  const cy = r2(t.y + t.h / 2);
  const g = el(doc, 'g', { class: 'ls-token', 'data-token-id': t.id });
  // setAttribute on a data-* attribute, not innerHTML: the id is untrusted text.

  const deg = r2((t.rot * 180) / Math.PI);
  const body = el(doc, 'g', { class: 'ls-token-body', transform: `translate(${cx} ${cy}) rotate(${deg})` });
  const hue = tokenHue(t.id);
  const imageUrl = artUrl || presetUrl;
  if (imageUrl) {
    // The token's own art, drawn like the DM's map draws it: the full w x h box, rotated.
    g.setAttribute('data-art', artUrl ? 'image' : 'preset');
    body.append(el(doc, 'image', { class: 'ls-token-art', href: imageUrl, x: r2(-t.w / 2), y: r2(-t.h / 2), width: r2(t.w), height: r2(t.h), preserveAspectRatio: 'none' }));
  } else {
    g.setAttribute('data-art', 'marker');
    body.append(
      el(doc, 'ellipse', { rx: r2(t.w / 2), ry: r2(t.h / 2), fill: `hsl(${hue} 45% 38%)`, stroke: `hsl(${hue} 70% 75%)`, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }),
      // The image's top edge, so rotation is visible without the image.
      el(doc, 'path', { class: 'ls-token-notch', d: `M ${r2(-t.w * 0.12)} ${r2(-t.h / 2 + t.h * 0.2)} L 0 ${r2(-t.h / 2)} L ${r2(t.w * 0.12)} ${r2(-t.h / 2 + t.h * 0.2)} Z`, fill: `hsl(${hue} 70% 85%)` })
    );
  }
  g.append(body);

  // Name and conditions above the token, unrotated (as on the DM's map).
  const size = Math.max(4, Math.min(t.w, t.h) * 0.26);
  let y = -t.h / 2 - size * 0.6;
  const label = el(doc, 'g', { class: 'ls-token-labels', transform: `translate(${cx} ${cy})`, 'text-anchor': 'middle', 'paint-order': 'stroke', stroke: 'rgba(0,0,0,0.85)', 'stroke-width': r2(size * 0.25), 'stroke-linejoin': 'round' });
  if (t.name !== null) {
    const name = el(doc, 'text', { class: 'ls-token-name', y: r2(y), 'font-size': r2(size), 'font-weight': 'bold', fill: '#8bd3ff' });
    name.textContent = t.name;
    label.append(name);
    y -= size * 1.1;
  }
  if (t.conditions.length > 0) {
    const conditions = el(doc, 'text', { class: 'ls-token-conditions', y: r2(y), 'font-size': r2(size * 0.8), fill: '#fbbf24' });
    conditions.textContent = t.conditions.join(', ');
    label.append(conditions);
  }
  if (label.childNodes.length) g.append(label);
  return g;
}

// An SVG arc of at most 180° from the current point to angle a1 on the circle (radians; increasing
// angles run clockwise on screen, as on the canvas).
const arcTo = (cx, cy, r, a1) => `A ${r2(r)} ${r2(r)} 0 0 1 ${r2(cx + r * Math.cos(a1))} ${r2(cy + r * Math.sin(a1))}`;

/**
 * The vision cone wedge as path data: apex at the centre, `angle` degrees (0, 360] wide about `rot`
 * radians, `radius` world units long. Drawn as two arcs of half the angle each, so a full 360° cone
 * is a whole circle (with the edge from the centre, as the DM's canvas draws it).
 */
function visionConePath(cx, cy, radius, rot, angleDeg) {
  const half = (Math.min(angleDeg, 360) * Math.PI) / 360;
  const start = rot - half;
  return [
    `M ${r2(cx)} ${r2(cy)}`,
    `L ${r2(cx + radius * Math.cos(start))} ${r2(cy + radius * Math.sin(start))}`,
    arcTo(cx, cy, radius, rot),
    arcTo(cx, cy, radius, rot + half),
    'Z',
  ].join(' ');
}

// A token's aura and vision cone, or null when it has neither (or the grid has no size).
function renderTokenOverlays(doc, t, grid) {
  if ((!t.aura && !t.visionCone) || !(grid.size > 0)) return null;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const g = el(doc, 'g', { class: 'ls-token-overlays', 'data-token-id': t.id });
  const stroke = { 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' };
  // Colors are the snapshot's validated #rrggbb values, set as attributes (never as CSS text).
  if (t.aura) {
    g.append(el(doc, 'circle', { ...stroke, class: 'ls-aura', cx: r2(cx), cy: r2(cy), r: r2((t.aura.radius + 0.5) * grid.size), fill: t.aura.color, 'fill-opacity': 0.2, stroke: t.aura.color, 'stroke-opacity': 0.6 }));
  }
  if (t.visionCone) {
    const v = t.visionCone;
    g.append(el(doc, 'path', { ...stroke, class: 'ls-vision-cone', d: visionConePath(cx, cy, v.range * grid.size, t.rot, v.angle), fill: v.color, 'fill-opacity': 0.15, stroke: v.color, 'stroke-opacity': 0.4 }));
  }
  return g;
}

function measurementLabel(m, grid) {
  if (!(grid.size > 0)) return null;
  const cells = Math.hypot(m.x2 - m.x1, m.y2 - m.y1) / grid.size;
  if (m.type === 'cone') return `${Math.round(cells * grid.unitsPerCell)} ft cone`;
  if (m.type === 'circle') return `${Math.round((cells + 0.5) * grid.unitsPerCell)} ft radius`;
  return `${Math.round(cells * grid.unitsPerCell)} ft`;
}

function renderMeasurement(doc, m, grid) {
  const g = el(doc, 'g', { class: 'ls-measurement', 'data-measurement-id': m.id, 'data-type': m.type, stroke: m.color, fill: m.color, 'fill-opacity': 0.2 });
  const stroke = { 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' };
  const cell = grid.size > 0 ? grid.size : DEFAULT_CELL;
  const line = () => el(doc, 'line', { ...stroke, x1: r2(m.x1), y1: r2(m.y1), x2: r2(m.x2), y2: r2(m.y2) });
  if (m.type === 'line') {
    g.append(line());
  } else if (m.type === 'cone') {
    const r = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
    const a = Math.atan2(m.y2 - m.y1, m.x2 - m.x1);
    const p = (angle) => `${r2(m.x1 + r * Math.cos(angle))} ${r2(m.y1 + r * Math.sin(angle))}`;
    g.append(el(doc, 'path', { ...stroke, d: `M ${r2(m.x1)} ${r2(m.y1)} L ${p(a - Math.PI / 4)} A ${r2(r)} ${r2(r)} 0 0 1 ${p(a + Math.PI / 4)} Z` }));
  } else {
    g.append(el(doc, 'circle', { ...stroke, cx: r2(m.x1), cy: r2(m.y1), r: r2(circleRadius(m, cell)) }), line());
  }
  const text = measurementLabel(m, grid);
  if (text) {
    const size = cell * 0.3;
    const label = el(doc, 'text', { class: 'ls-measurement-label', x: r2((m.x1 + m.x2) / 2), y: r2((m.y1 + m.y2) / 2 - size * 0.4), 'font-size': r2(size), 'text-anchor': 'middle', 'fill-opacity': 1, stroke: 'rgba(15,22,32,0.9)', 'stroke-width': r2(size * 0.25), 'paint-order': 'stroke' });
    label.textContent = text;
    g.append(label);
  }
  return g;
}

// The world area the backdrop and grid cover for a view: the view and one view-size beyond it on
// every side (letterboxing on a wider or taller screen), and at least the same around the fitted view.
function coverArea(view, fit) {
  const x0 = Math.min(view.x - view.w, fit.x - fit.w);
  const y0 = Math.min(view.y - view.h, fit.y - fit.h);
  const x1 = Math.max(view.x + 2 * view.w, fit.x + 2 * fit.w);
  const y1 = Math.max(view.y + 2 * view.h, fit.y + 2 * fit.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const backdrop = (doc, area) => el(doc, 'rect', { class: 'ls-background', x: r2(area.x), y: r2(area.y), width: r2(area.w), height: r2(area.h), fill: '#091018' });
const setViewBox = (svg, box) => svg.setAttribute('viewBox', `${r2(box.x)} ${r2(box.y)} ${r2(box.w)} ${r2(box.h)}`);

/**
 * Replace `svg`'s contents with a read-only drawing of `snapshot`. Returns the viewBox used.
 * `assets` (optional): `background` { url, assetId } to draw as Layer 1 (Milestone 3),
 * `tokenUrl(assetId)` for custom token art, and `presetUrl(presetId)` for built-in token images
 * (2.3.30). Anything missing falls back to the placeholders.
 * `view` (2.3.30, optional): the player's own pan/zoom, a world rectangle { x, y, w, h } to show
 * instead of the fitted one. It is the player's alone and never part of the snapshot.
 */
export function renderBattleMapSnapshot(svg, snapshot, assets = {}, view = null) {
  const tokenUrl = typeof assets.tokenUrl === 'function' ? assets.tokenUrl : () => null;
  const presetUrl = typeof assets.presetUrl === 'function' ? assets.presetUrl : () => null;
  const doc = svg.ownerDocument;
  const fit = computeViewBox(snapshot);
  const box = view || fit;
  setViewBox(svg, box);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('data-revision', String(snapshot.revision));
  svg.setAttribute('data-view', view ? 'player' : 'fit');

  const area = coverArea(box, fit);
  const layers = [backdrop(doc, area)];

  const { map, mapTransform: mt } = snapshot;
  if (map.width > 0 && map.height > 0) {
    // The map image's place in the world; the image itself arrives with asset transfer (Milestone 3).
    layers.push(el(doc, 'rect', { class: 'ls-map-surface', x: r2(mt.x), y: r2(mt.y), width: r2(map.width * mt.scale), height: r2(map.height * mt.scale), fill: '#1b2530', stroke: '#3a4a5c', 'stroke-width': 1, 'stroke-dasharray': '6 4', 'vector-effect': 'non-scaling-stroke' }));
    // Layer 1: the player-visible background, in map image space, placed by the map transform.
    const bgUrl = safeUrl(assets.background && assets.background.url);
    if (bgUrl) {
      layers.push(el(doc, 'image', { class: 'ls-background-image', href: bgUrl, 'data-asset-id': assets.background.assetId || '', x: r2(mt.x), y: r2(mt.y), width: r2(map.width * mt.scale), height: r2(map.height * mt.scale), preserveAspectRatio: 'none' }));
    }
  }
  layers.push(renderGrid(doc, snapshot.grid, area));

  // Auras and vision cones under every token, as on the DM's map; never interactive.
  const overlays = el(doc, 'g', { class: 'ls-overlays', 'pointer-events': 'none' });
  for (const t of snapshot.tokens) {
    const o = renderTokenOverlays(doc, t, snapshot.grid);
    if (o) overlays.append(o);
  }
  const tokens = el(doc, 'g', { class: 'ls-tokens' });
  for (const t of snapshot.tokens) {
    tokens.append(renderToken(doc, t, t.assetId ? safeUrl(tokenUrl(t.assetId)) : null, t.presetId ? safePresetUrl(presetUrl(t.presetId)) : null));
  }
  // Persistent measurements draw above tokens, as on the DM's map.
  const measurements = el(doc, 'g', { class: 'ls-measurements' });
  for (const m of snapshot.measurements) measurements.append(renderMeasurement(doc, m, snapshot.grid));
  layers.push(overlays, tokens, measurements);

  svg.replaceChildren(...layers);
  return box;
}

/**
 * Show another part of an already drawn snapshot (the player panned or zoomed, or pressed Fit):
 * only the viewBox changes, and the backdrop and grid are redrawn to cover it. Nothing else is
 * touched, so token art and the background image are not reloaded. `view` null means fitted.
 */
export function setPlayerView(svg, snapshot, view) {
  const fit = computeViewBox(snapshot);
  const box = view || fit;
  setViewBox(svg, box);
  svg.setAttribute('data-view', view ? 'player' : 'fit');
  const area = coverArea(box, fit);
  const oldBackdrop = svg.querySelector(':scope > .ls-background');
  const oldGrid = svg.querySelector(':scope > .ls-grid');
  if (oldBackdrop) oldBackdrop.replaceWith(backdrop(svg.ownerDocument, area));
  if (oldGrid) oldGrid.replaceWith(renderGrid(svg.ownerDocument, snapshot.grid, area));
  return box;
}
