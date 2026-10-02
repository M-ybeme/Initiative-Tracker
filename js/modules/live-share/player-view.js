/**
 * The Live Share player's own camera on the Battle Map (2.3.30): pan and zoom, local to this player.
 *
 * Two transforms must not be confused:
 *   the map transform   where the map sits in Battle Map world space. The DM's, saved and published
 *                       in the snapshot (snapshot.mapTransform). Never touched here.
 *   the player view     which world rectangle this player's screen shows. This module's alone: it is
 *                       never put in a snapshot, never sent, and changes nothing on the host.
 *
 * A view is a world rectangle { x, y, w, h }, used as the map SVG's viewBox (drawn with
 * preserveAspectRatio "xMidYMid meet"). `null` means fitted: the view follows the fitted rectangle
 * of whatever snapshot is shown (computeViewBox). The first pan or zoom switches to a player view,
 * which then stays where the player put it while snapshots and images arrive; Fit returns to null.
 *
 * Gestures (Pointer Events, so mouse, pen and touch alike), on the map element only:
 *   wheel             zoom about the pointer
 *   one pointer drag  pan, once it has moved more than TAP_SLOP_PX; less than that is a tap
 *                     (reported to onTap with its world point, for player pings in Milestone 6)
 *   two pointers      pinch: zoom about their midpoint, and pan with it; never a tap
 * The element should have `touch-action: none` so the browser does not scroll or zoom the page for
 * touches that start on the map (the rest of the page scrolls as usual).
 *
 * Pure helpers (clientToWorld, zoomView, panView) carry the geometry and are unit tested; the
 * controller only wires events to them.
 */

// Zoom relative to the fitted view: from twice as far out to 8x closer.
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;
// A press that moves less than this (CSS px) is a tap, not a pan.
export const TAP_SLOP_PX = 5;
const WHEEL_ZOOM_PER_PX = 0.0015;

/**
 * The world point under a client (CSS px) point, for an element whose `rect` is its client rect and
 * whose viewBox is `view`, drawn "xMidYMid meet": scaled uniformly to fit, centred.
 */
export function clientToWorld(rect, view, clientX, clientY) {
  const s = meetScale(rect, view);
  const ox = rect.left + (rect.width - view.w * s) / 2;
  const oy = rect.top + (rect.height - view.h * s) / 2;
  return { x: view.x + (clientX - ox) / s, y: view.y + (clientY - oy) / s };
}

/** CSS px per world unit for `view` in `rect` ("meet"). */
export function meetScale(rect, view) {
  return Math.min(rect.width / view.w, rect.height / view.h);
}

/** The zoom of `view` relative to `fit` (1 = fitted, 2 = twice as close). */
export const zoomOf = (view, fit) => fit.w / view.w;

// Keeps the view's centre inside the fitted rectangle, so the map can't be lost off screen.
function clampCentre(view, fit) {
  const cx = Math.min(fit.x + fit.w, Math.max(fit.x, view.x + view.w / 2));
  const cy = Math.min(fit.y + fit.h, Math.max(fit.y, view.y + view.h / 2));
  return { x: cx - view.w / 2, y: cy - view.h / 2, w: view.w, h: view.h };
}

/**
 * `view` zoomed by `factor` (> 1 closer) about the world point `at`, which stays where it is on
 * screen. The result's zoom stays within MIN_ZOOM..MAX_ZOOM of `fit`.
 */
export function zoomView(view, fit, at, factor) {
  if (!(factor > 0) || !Number.isFinite(factor)) return view;
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomOf(view, fit) * factor));
  const k = fit.w / zoom / view.w; // new size / old size
  const next = { x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k, w: view.w * k, h: view.h * k };
  return clampCentre(next, fit);
}

/** `view` moved by (dx, dy) world units (the content moves the other way on screen). */
export function panView(view, fit, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return view;
  return clampCentre({ ...view, x: view.x + dx, y: view.y + dy }, fit);
}

/**
 * Wires pan / zoom / tap gestures on `element` (the map SVG).
 *   getFit()        the fitted rectangle of the snapshot now shown, or null when there is none
 *   onView(view)    the view changed (null: fitted); redraw with it
 *   onTap(world)    a press released within TAP_SLOP_PX of where it started, with no pinch: a click
 *                   candidate, for future pings
 * Returns { view(), reset(), stats(), destroy() }. stats() is safe for diagnostics: no content.
 *
 * Zoom limits and the pan bound are measured against the fitted rectangle as it was when the player
 * started navigating (the anchor), not the current one: the fit grows and shrinks as the DM moves
 * tokens and measurements, and the player's zoom must not jump when it does. Fit (reset) drops it.
 */
export function createPlayerView({ element, getFit, onView = () => {}, onTap = () => {} }) {
  let view = null;
  let anchor = null; // the fit when the player view started; null while fitted
  const pointers = new Map(); // pointerId -> { x, y } (client px)
  // { kind: 'press' | 'pan', startX, startY, lastX, lastY } for one pointer, { kind: 'pinch',
  // distance, mid } for two, { kind: 'done' } after a pinch until every pointer is up.
  let gesture = null;
  const counts = { zooms: 0, pans: 0, pinches: 0, taps: 0, resets: 0 };

  const rect = () => element.getBoundingClientRect();
  // The rectangle the screen shows now: the player's view, or the fitted one.
  const current = (fit) => view || fit;
  // What zoom and pan are limited by: the anchor, or (starting from fitted) the fit itself.
  const limits = (fit) => anchor || fit;

  function apply(next) {
    if (next && !anchor) anchor = getFit();
    if (!next) anchor = null;
    view = next;
    onView(view);
  }

  function onWheel(e) {
    const fit = getFit();
    if (!fit) return;
    const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    if (!px) return; // a sideways swipe or Shift+wheel: not a zoom, so the page keeps it
    e.preventDefault(); // zoom the map, don't scroll the page (only over the map)
    const v = current(fit);
    counts.zooms += 1;
    apply(zoomView(v, limits(fit), clientToWorld(rect(), v, e.clientX, e.clientY), Math.exp(-px * WHEEL_ZOOM_PER_PX)));
  }

  const midpoint = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  function onDown(e) {
    if (!getFit()) return;
    // Only the main button (mouse left, pen tip, a touch): other mouse and pen buttons are not ours.
    if (e.pointerType !== 'touch' && e.button !== 0) return;
    // A new primary pointer means no other pointer is down: forget any whose release was lost.
    if (e.isPrimary) pointers.clear();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      element.setPointerCapture(e.pointerId);
    } catch {
      // A synthetic or already released pointer: the gesture still works while over the map.
    }
    if (pointers.size === 1) gesture = { kind: 'press', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
    else if (pointers.size === 2) {
      const m = midpoint();
      gesture = { kind: 'pinch', distance: m.distance, mid: m };
      counts.pinches += 1;
    }
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const fit = getFit();
    if (!fit) return;
    const r = rect();
    const bound = limits(fit);
    if (gesture.kind === 'pinch' && pointers.size >= 2) {
      const m = midpoint();
      let v = current(fit);
      const s = meetScale(r, v);
      // Pan with the midpoint, then zoom about it by the change in finger distance.
      v = panView(v, bound, (gesture.mid.x - m.x) / s, (gesture.mid.y - m.y) / s);
      if (gesture.distance > 0 && m.distance > 0) v = zoomView(v, bound, clientToWorld(r, v, m.x, m.y), m.distance / gesture.distance);
      gesture.mid = m;
      gesture.distance = m.distance;
      apply(v);
      return;
    }
    if (gesture.kind === 'press') {
      if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) <= TAP_SLOP_PX) return;
      gesture.kind = 'pan';
      counts.pans += 1;
    }
    if (gesture.kind === 'pan') {
      const v = current(fit);
      const s = meetScale(r, v);
      const dx = (gesture.lastX - e.clientX) / s;
      const dy = (gesture.lastY - e.clientY) / s;
      gesture.lastX = e.clientX;
      gesture.lastY = e.clientY;
      apply(panView(v, bound, dx, dy));
    }
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    // A tap: released (not cancelled) close to where it was pressed, never part of a pan or pinch.
    const still = gesture && gesture.kind === 'press' && Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) <= TAP_SLOP_PX;
    if (still && e.type === 'pointerup') {
      const fit = getFit();
      if (fit) {
        counts.taps += 1;
        onTap(clientToWorld(rect(), current(fit), e.clientX, e.clientY));
      }
    }
    // Lifting one finger of a pinch ends the gesture; the other finger starts nothing until lifted.
    if (pointers.size === 0) gesture = null;
    else if (gesture && gesture.kind === 'pinch') gesture = { kind: 'done' };
  }

  // A pointer whose capture is lost (e.g. the page was hidden mid-touch) ends like a cancelled one.
  const events = { wheel: onWheel, pointerdown: onDown, pointermove: onMove, pointerup: onUp, pointercancel: onUp, lostpointercapture: onUp };
  for (const [type, fn] of Object.entries(events)) element.addEventListener(type, fn, type === 'wheel' ? { passive: false } : undefined);

  return {
    view: () => view,
    /** Back to the fitted view (Fit button, or a different map). */
    reset() {
      counts.resets += 1;
      apply(null);
    },
    stats() {
      const fit = anchor || getFit();
      return { mode: view ? 'player' : 'fit', zoom: view && fit ? Math.round(zoomOf(view, fit) * 100) / 100 : 1, ...counts };
    },
    destroy() {
      for (const [type, fn] of Object.entries(events)) element.removeEventListener(type, fn);
    },
  };
}
