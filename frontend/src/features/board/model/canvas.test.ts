import { describe, expect, it } from 'vitest';

import {
  boxFromDrag,
  clampZoom,
  hitTest,
  linkEnds,
  MAX_ZOOM,
  MIN_SIZE,
  MIN_ZOOM,
  panBy,
  resizeBox,
  strokeBounds,
  strokePath,
  toScreen,
  toWorld,
  zoomAt,
} from './canvas';

const view = { x: 0, y: 0, zoom: 1 };

describe('canvas maths — an infinite surface behind a viewport', () => {
  it('converts between screen and world, and back again', () => {
    const v = { x: 100, y: 50, zoom: 2 };
    const world = toWorld({ x: 40, y: 20 }, v);
    expect(world).toEqual({ x: 120, y: 60 });
    expect(toScreen(world, v)).toEqual({ x: 40, y: 20 });
  });

  it('zooming keeps the point under the cursor still', () => {
    // Without this the canvas slides away from whatever you were looking at.
    const cursor = { x: 300, y: 200 };
    const before = toWorld(cursor, view);
    const zoomed = zoomAt(view, cursor, 1.5);
    const after = toWorld(cursor, zoomed);

    expect(zoomed.zoom).toBeCloseTo(1.5);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zoom stays inside its limits', () => {
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(zoomAt({ ...view, zoom: MAX_ZOOM }, { x: 0, y: 0 }, 2).zoom).toBe(MAX_ZOOM);
  });

  it('panning moves the world under the viewport, scaled by zoom', () => {
    expect(panBy(view, 50, 20)).toEqual({ x: -50, y: -20, zoom: 1 });
    expect(panBy({ ...view, zoom: 2 }, 50, 20)).toEqual({ x: -25, y: -10, zoom: 2 });
  });

  it('a drag up-left makes the same box as a drag down-right', () => {
    const a = boxFromDrag({ x: 10, y: 10 }, { x: 60, y: 40 });
    const b = boxFromDrag({ x: 60, y: 40 }, { x: 10, y: 10 });
    expect(a).toEqual(b);
    expect(a).toEqual({ x: 10, y: 10, width: 50, height: 30 });
  });

  it('resizing pins the opposite corner and refuses to invert', () => {
    const box = { x: 100, y: 100, width: 100, height: 100 };
    expect(resizeBox(box, 'se', { x: 260, y: 240 })).toEqual({
      x: 100,
      y: 100,
      width: 160,
      height: 140,
    });
    expect(resizeBox(box, 'nw', { x: 60, y: 70 })).toEqual({
      x: 60,
      y: 70,
      width: 140,
      height: 130,
    });

    // Dragging a corner past its opposite must not turn the box inside out.
    const crushed = resizeBox(box, 'se', { x: 0, y: 0 });
    expect(crushed.width).toBe(MIN_SIZE);
    expect(crushed.height).toBe(MIN_SIZE);
  });

  it('hit testing picks the topmost element under the point', () => {
    const under = { id: 'a', x: 0, y: 0, width: 100, height: 100 };
    const over = { id: 'b', x: 50, y: 50, width: 100, height: 100 };
    expect(hitTest([under, over], { x: 60, y: 60 })?.id).toBe('b');
    expect(hitTest([under, over], { x: 10, y: 10 })?.id).toBe('a');
    expect(hitTest([under, over], { x: 500, y: 500 })).toBeNull();
  });

  it('a pen stroke gets a box, so it can be grabbed like anything else', () => {
    const stroke = [10, 20, 40, 5, 25, 60];
    expect(strokeBounds(stroke)).toEqual({ x: 10, y: 5, width: 30, height: 55 });
    expect(strokePath(stroke)).toBe('M 10 20 L 40 5 L 25 60');
    expect(strokePath([])).toBe('');
  });

  it('a connector runs between the two centres — that is the mind-map line', () => {
    const from = { x: 0, y: 0, width: 100, height: 50 };
    const to = { x: 200, y: 100, width: 100, height: 50 };
    expect(linkEnds(from, to)).toEqual({ x1: 50, y1: 25, x2: 250, y2: 125 });
  });
});
