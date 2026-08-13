/**
 * Pure canvas maths for the board — no React, no DOM, so the fiddly parts are testable.
 *
 * The canvas is infinite: there is no page, only a viewport looking at world coordinates.
 * Everything here converts between the two and answers "what is under the pointer".
 */

export interface Viewport {
  /** World coordinate at the viewport's top-left corner. */
  x: number;
  y: number;
  /** 1 = 100%. */
  zoom: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
/** Anything smaller is a mis-click, not an element. */
export const MIN_SIZE = 12;

export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(zoom.toFixed(3))));

/** Screen point (relative to the canvas element) → world point. */
export function toWorld(point: { x: number; y: number }, view: Viewport): { x: number; y: number } {
  return { x: view.x + point.x / view.zoom, y: view.y + point.y / view.zoom };
}

/** World point → screen point. */
export function toScreen(
  point: { x: number; y: number },
  view: Viewport,
): { x: number; y: number } {
  return { x: (point.x - view.x) * view.zoom, y: (point.y - view.y) * view.zoom };
}

/**
 * Zoom about a fixed screen point — the point under the cursor must not move.
 * Without this the canvas slides away from whatever you were looking at.
 */
export function zoomAt(view: Viewport, screen: { x: number; y: number }, factor: number): Viewport {
  const zoom = clampZoom(view.zoom * factor);
  if (zoom === view.zoom) return view;
  const before = toWorld(screen, view);
  const after = toWorld(screen, { ...view, zoom });
  return { x: view.x + (before.x - after.x), y: view.y + (before.y - after.y), zoom };
}

export function panBy(view: Viewport, dx: number, dy: number): Viewport {
  return { ...view, x: view.x - dx / view.zoom, y: view.y - dy / view.zoom };
}

/** Normalise a drag into a positive-size box, so dragging up-left works like down-right. */
export function boxFromDrag(from: { x: number; y: number }, to: { x: number; y: number }): Box {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

/** Resize by dragging a corner, keeping the opposite corner pinned. */
export function resizeBox(box: Box, corner: Corner, to: { x: number; y: number }): Box {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  const next = { ...box };
  if (corner === 'nw' || corner === 'sw') {
    next.x = Math.min(to.x, right - MIN_SIZE);
    next.width = right - next.x;
  } else {
    next.width = Math.max(MIN_SIZE, to.x - box.x);
  }
  if (corner === 'nw' || corner === 'ne') {
    next.y = Math.min(to.y, bottom - MIN_SIZE);
    next.height = bottom - next.y;
  } else {
    next.height = Math.max(MIN_SIZE, to.y - box.y);
  }
  return next;
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se';
export const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

/** The topmost element under a world point — later elements sit on top. */
export function hitTest<T extends Box & { id: string }>(
  elements: readonly T[],
  point: { x: number; y: number },
): T | null {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const e = elements[i];
    if (
      point.x >= e.x &&
      point.x <= e.x + Math.max(e.width, MIN_SIZE) &&
      point.y >= e.y &&
      point.y <= e.y + Math.max(e.height, MIN_SIZE)
    ) {
      return e;
    }
  }
  return null;
}

/** Bounding box of a freehand stroke, so a pen mark can be hit-tested and moved like the rest. */
export function strokeBounds(points: readonly number[]): Box {
  if (points.length < 2) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** An SVG path for a stroke, in world coordinates. */
export function strokePath(points: readonly number[]): string {
  if (points.length < 2) return '';
  const parts = [`M ${points[0]} ${points[1]}`];
  for (let i = 2; i < points.length; i += 2) parts.push(`L ${points[i]} ${points[i + 1]}`);
  return parts.join(' ');
}

/**
 * Where a connector between two elements should start and end: the centres, trimmed to the
 * edges so the line touches the boxes instead of burying itself in them.
 */
export function linkEnds(from: Box, to: Box): { x1: number; y1: number; x2: number; y2: number } {
  const c1 = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const c2 = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  return { x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y };
}
