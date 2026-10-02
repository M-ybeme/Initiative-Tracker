// 2.3.30: the Live Share player's own pan / zoom (js/modules/live-share/player-view.js). The
// geometry helpers are checked directly; the controller with synthetic pointer and wheel events on a
// happy-dom element whose client rect is fixed. Nothing here touches a snapshot or the network.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clientToWorld, meetScale, zoomView, panView, zoomOf, createPlayerView, MIN_ZOOM, MAX_ZOOM, TAP_SLOP_PX } from '../../js/modules/live-share/player-view.js';

const FIT = { x: 0, y: 0, w: 1000, h: 500 };
// An element 800 x 400 CSS px at (100, 50): the fit view fills it exactly (0.8 px per world unit).
const RECT = { left: 100, top: 50, width: 800, height: 400 };
const near = (a, b) => Object.keys(b).forEach((k) => expect(a[k]).toBeCloseTo(b[k], 6));

describe('player view geometry', () => {
  it('maps client points to world points ("meet": uniform scale, centred)', () => {
    expect(meetScale(RECT, FIT)).toBe(0.8);
    near(clientToWorld(RECT, FIT, 100, 50), { x: 0, y: 0 });
    near(clientToWorld(RECT, FIT, 500, 250), { x: 500, y: 250 });
    // A taller element letterboxes vertically: the view sits centred with bands above and below.
    const tall = { left: 0, top: 0, width: 800, height: 800 };
    near(clientToWorld(tall, FIT, 0, 200), { x: 0, y: 0 });
    near(clientToWorld(tall, FIT, 400, 400), { x: 500, y: 250 });
  });

  it('zooms about a world point, which stays put on screen', () => {
    const at = { x: 250, y: 100 };
    const v = zoomView(FIT, FIT, at, 2);
    near(v, { x: 125, y: 50, w: 500, h: 250 });
    expect(zoomOf(v, FIT)).toBeCloseTo(2);
    // The same world point is under the same screen point before and after.
    const before = { x: 100 + 250 * 0.8, y: 50 + 100 * 0.8 };
    near(clientToWorld(RECT, v, before.x, before.y), at);
  });

  it(`keeps zoom within ${MIN_ZOOM}x..${MAX_ZOOM}x of the fitted view`, () => {
    let v = FIT;
    for (let i = 0; i < 50; i++) v = zoomView(v, FIT, { x: 500, y: 250 }, 1.5);
    expect(zoomOf(v, FIT)).toBeCloseTo(MAX_ZOOM);
    for (let i = 0; i < 50; i++) v = zoomView(v, FIT, { x: 500, y: 250 }, 0.5);
    expect(zoomOf(v, FIT)).toBeCloseTo(MIN_ZOOM);
    for (const bad of [0, -1, NaN, Infinity]) expect(zoomView(FIT, FIT, { x: 1, y: 1 }, bad)).toBe(FIT);
  });

  it('pans by world units and never lets the view centre leave the fitted area', () => {
    near(panView(FIT, FIT, 100, -50), { x: 100, y: -50, w: 1000, h: 500 });
    const far = panView(FIT, FIT, 1e9, 1e9);
    expect(far.x + far.w / 2).toBe(1000);
    expect(far.y + far.h / 2).toBe(500);
    expect(panView(FIT, FIT, NaN, 0)).toBe(FIT);
  });
});

describe('player view controller', () => {
  let el;
  let fit;
  let views;
  let taps;
  let pv;
  const ev = (type, init) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0, ...init });
    el.dispatchEvent(e);
    return e;
  };
  beforeEach(() => {
    el = document.createElement('div');
    el.getBoundingClientRect = () => RECT;
    el.setPointerCapture = vi.fn();
    fit = FIT;
    views = [];
    taps = [];
    pv = createPlayerView({ element: el, getFit: () => fit, onView: (v) => views.push(v), onTap: (p) => taps.push(p) });
  });

  it('starts fitted', () => {
    expect(pv.view()).toBeNull();
    expect(pv.stats()).toMatchObject({ mode: 'fit', zoom: 1 });
  });

  it('a press that moves less than the slop is a tap at its world point, not a pan', () => {
    ev('pointerdown', { clientX: 500, clientY: 250 });
    ev('pointermove', { clientX: 500 + TAP_SLOP_PX - 1, clientY: 250 });
    ev('pointerup', { clientX: 500 + TAP_SLOP_PX - 1, clientY: 250 });
    expect(views).toEqual([]);
    expect(pv.view()).toBeNull();
    expect(taps).toHaveLength(1);
    near(taps[0], { x: (400 + TAP_SLOP_PX - 1) / 0.8, y: 250 });
  });

  it('a drag beyond the slop pans (content follows the pointer) and is not a tap', () => {
    ev('pointerdown', { clientX: 500, clientY: 250 });
    ev('pointermove', { clientX: 520, clientY: 250 }); // starts the pan
    ev('pointermove', { clientX: 580, clientY: 290 }); // 60 px right, 40 down from there
    ev('pointerup', { clientX: 580, clientY: 290 });
    expect(taps).toEqual([]);
    // In total 80 px right and 40 px down: the view moved 100 left and 50 up (world units).
    near(pv.view(), { x: -100, y: -50, w: 1000, h: 500 });
    expect(pv.stats()).toMatchObject({ mode: 'player', pans: 1, taps: 0 });
  });

  it('the wheel zooms about the pointer and only over the map (the page does not scroll)', () => {
    const e = ev('wheel', { clientX: 300, clientY: 130, deltaY: -200, deltaMode: 0 });
    expect(e.defaultPrevented).toBe(true);
    const v = pv.view();
    expect(zoomOf(v, FIT)).toBeCloseTo(Math.exp(0.3));
    near(clientToWorld(RECT, v, 300, 130), { x: 250, y: 100 }); // the point under the pointer stays
  });

  it('a pinch zooms about the midpoint by the change in finger distance, and is never a tap', () => {
    ev('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 400, clientY: 250 });
    ev('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 600, clientY: 250 });
    ev('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 250 });
    ev('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 700, clientY: 250 });
    ev('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 250 });
    ev('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 700, clientY: 250 });
    expect(taps).toEqual([]);
    expect(zoomOf(pv.view(), FIT)).toBeCloseTo(2); // 200 px apart -> 400 px apart
    near(clientToWorld(RECT, pv.view(), 500, 250), { x: 500, y: 250 }); // the midpoint stays put
    expect(pv.stats()).toMatchObject({ pinches: 1, taps: 0 });
  });

  it('one finger pans on touch too', () => {
    ev('pointerdown', { pointerType: 'touch', clientX: 500, clientY: 250 });
    ev('pointermove', { pointerType: 'touch', clientX: 400, clientY: 250 });
    ev('pointerup', { pointerType: 'touch', clientX: 400, clientY: 250 });
    near(pv.view(), { x: 125, y: 0, w: 1000, h: 500 });
  });

  it('ignores right / middle mouse buttons, and a cancelled pointer is not a tap', () => {
    ev('pointerdown', { button: 2, clientX: 500, clientY: 250 });
    ev('pointermove', { clientX: 700, clientY: 250 });
    ev('pointerup', { clientX: 700, clientY: 250 });
    ev('pointerdown', { clientX: 500, clientY: 250 });
    ev('pointercancel', { clientX: 500, clientY: 250 });
    expect(views).toEqual([]);
    expect(taps).toEqual([]);
  });

  it('does nothing before there is a map', () => {
    fit = null;
    const e = ev('wheel', { clientX: 300, clientY: 130, deltaY: -200 });
    expect(e.defaultPrevented).toBe(false);
    ev('pointerdown', { clientX: 500, clientY: 250 });
    ev('pointerup', { clientX: 500, clientY: 250 });
    expect(views).toEqual([]);
    expect(taps).toEqual([]);
  });

  it('reset() returns to fitted; destroy() detaches every listener', () => {
    ev('wheel', { clientX: 300, clientY: 130, deltaY: -200 });
    pv.reset();
    expect(pv.view()).toBeNull();
    expect(views.at(-1)).toBeNull();
    pv.destroy();
    ev('wheel', { clientX: 300, clientY: 130, deltaY: -200 });
    expect(pv.view()).toBeNull();
  });

  it('zoom limits stay anchored to the fit when navigation began, though the fit changes with tokens', () => {
    ev('wheel', { clientX: 500, clientY: 250, deltaY: -462 }); // ~2x
    const before = zoomOf(pv.view(), FIT);
    // The DM saves a token far off the map: the fitted rectangle becomes 9x wider.
    fit = { x: 0, y: 0, w: 9000, h: 500 };
    ev('wheel', { clientX: 500, clientY: 250, deltaY: 20 }); // a small step out
    expect(zoomOf(pv.view(), FIT)).toBeCloseTo(before * Math.exp(-20 * 0.0015), 6); // no jump
    expect(pv.stats().zoom).toBeCloseTo(zoomOf(pv.view(), FIT), 1);
    // Fit drops the anchor: the next navigation is measured against the new fit.
    pv.reset();
    ev('wheel', { clientX: 500, clientY: 250, deltaY: -462 });
    expect(zoomOf(pv.view(), fit)).toBeCloseTo(2, 1);
  });

  it('a sideways wheel (deltaY 0) is left to the page and does not leave the fitted view', () => {
    const e = ev('wheel', { clientX: 300, clientY: 130, deltaY: 0, deltaX: 120 });
    expect(e.defaultPrevented).toBe(false);
    expect(pv.view()).toBeNull();
  });

  it('a press released far from where it started is not a tap, even with no move in between', () => {
    ev('pointerdown', { clientX: 500, clientY: 250 });
    ev('pointerup', { clientX: 900, clientY: 250 });
    expect(taps).toEqual([]);
  });

  it('pen and mouse buttons other than the main one are ignored; a pen tip pans', () => {
    ev('pointerdown', { pointerType: 'pen', button: 2, clientX: 500, clientY: 250 });
    ev('pointermove', { pointerType: 'pen', clientX: 700, clientY: 250 });
    ev('pointerup', { pointerType: 'pen', clientX: 700, clientY: 250 });
    expect(views).toEqual([]);
    ev('pointerdown', { pointerType: 'pen', button: 0, clientX: 500, clientY: 250 });
    ev('pointermove', { pointerType: 'pen', clientX: 420, clientY: 250 });
    ev('pointerup', { pointerType: 'pen', clientX: 420, clientY: 250 });
    expect(pv.view()).not.toBeNull();
  });

  it('a pointer that loses capture ends its gesture (no tap), and the next touch pans normally', () => {
    ev('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: 500, clientY: 250 });
    ev('lostpointercapture', { pointerId: 7, pointerType: 'touch', clientX: 500, clientY: 250 });
    expect(taps).toEqual([]);
    ev('pointerdown', { pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: 500, clientY: 250 });
    ev('pointermove', { pointerId: 8, pointerType: 'touch', clientX: 400, clientY: 250 });
    ev('pointerup', { pointerId: 8, pointerType: 'touch', clientX: 400, clientY: 250 });
    expect(pv.stats()).toMatchObject({ pans: 1, pinches: 0 });
  });

  it('a pointer whose release never arrived does not turn later one-finger drags into pinches', () => {
    ev('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 300, clientY: 250 }); // never released
    for (let i = 0; i < 3; i++) {
      const id = 10 + i;
      ev('pointerdown', { pointerId: id, pointerType: 'touch', isPrimary: true, clientX: 500, clientY: 250 });
      ev('pointermove', { pointerId: id, pointerType: 'touch', clientX: 450, clientY: 250 });
      ev('pointerup', { pointerId: id, pointerType: 'touch', clientX: 450, clientY: 250 });
    }
    expect(pv.stats()).toMatchObject({ pans: 3, pinches: 0 });
  });

  it('after a pinch, the finger left down neither pans nor taps; a cancel mid-pinch ends it cleanly', () => {
    ev('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 400, clientY: 250 });
    ev('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 600, clientY: 250 });
    ev('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 700, clientY: 250 });
    ev('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 700, clientY: 250 });
    const afterPinch = pv.view();
    ev('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 250 });
    ev('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 250 });
    expect(pv.view()).toBe(afterPinch);
    ev('pointerdown', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: 400, clientY: 250 });
    ev('pointerdown', { pointerId: 4, pointerType: 'touch', clientX: 600, clientY: 250 });
    ev('pointercancel', { pointerId: 4, pointerType: 'touch', clientX: 600, clientY: 250 });
    ev('pointercancel', { pointerId: 3, pointerType: 'touch', clientX: 400, clientY: 250 });
    expect(taps).toEqual([]);
    expect(pv.stats()).toMatchObject({ pans: 0, taps: 0 });
  });

  it('knows nothing about snapshots or the network', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('js/modules/live-share/player-view.js', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(source).not.toMatch(/import|send\(|RTCDataChannel|WebSocket|fetch\(|snapshot|mapTransform|localStorage/);
  });
});
