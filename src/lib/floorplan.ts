/**
 * Pure geometry for the seating-chart canvas.
 *
 * Everything here is deliberately free of React and the DOM: the canvas has
 * grown resize, rotate, marquee select, alignment guides and several arrange
 * layouts, and that arithmetic is far easier to trust with unit tests behind
 * it than with a floor plan and a mouse.
 *
 * Coordinates are floor-plan pixels (the untransformed canvas surface), never
 * screen pixels. Callers divide pointer deltas by the zoom before passing them
 * in.
 */

// Extension included on purpose: `npm test` runs these modules straight
// through node --test, whose resolver needs it (tsconfig turns on
// allowImportingTsExtensions for exactly this).
import { clampBox, type CanvasSize } from './seating.ts';

/** An axis-aligned box, plus the angle it is drawn at. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The eight resize grips, named by compass point. */
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Rotation steps offered while holding Shift. */
export const ANGLE_SNAP = 15;

/** How close (in floor-plan px) two edges must be before a drag snaps them. */
export const GUIDE_THRESHOLD = 6;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Rotate a vector by `deg` about the origin. */
export function rotateVector(x: number, y: number, deg: number) {
  const rad = toRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function centreOf(box: Rect) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Snap a single coordinate to the grid, or pass it through when snapping is
 *  off or the grid is degenerate. */
export function snapValue(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || !gridSize || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/** Normalise any angle into [0, 360). */
export function normalizeAngle(deg: number): number {
  const wrapped = deg % 360;
  // `+ 0` folds -0 onto 0: a rotation of -0 round-trips through JSON as "-0"
  // and reads as a bug in the saved layout.
  return (wrapped < 0 ? wrapped + 360 : wrapped) + 0;
}

/** Round an angle to the nearest `step` degrees, wrapped into [0, 360). */
export function snapAngle(deg: number, step = ANGLE_SNAP): number {
  if (!step || step <= 0) return normalizeAngle(deg);
  return normalizeAngle(Math.round(deg / step) * step);
}

/**
 * The angle at which a rotate grip sitting above an item's centre would be
 * pointing at `(pointerX, pointerY)`. The grip is drawn at the top, so 0°
 * means "handle straight up" and the +90 shifts atan2's 0-is-east convention
 * onto that.
 */
export function angleFromCentre(centre: { x: number; y: number }, pointerX: number, pointerY: number) {
  return normalizeAngle((Math.atan2(pointerY - centre.y, pointerX - centre.x) * 180) / Math.PI + 90);
}

export interface ResizeOptions {
  /** Smallest and largest the box may become, per axis. */
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Hold the original aspect ratio (Shift, or an inherently round shape). */
  keepAspect?: boolean;
  /** Keep the result inside the floor plan. Only applied to an unrotated box,
   *  where "inside" is unambiguous; a rotated one keeps its centre inside. */
  bounds?: CanvasSize;
}

/**
 * Resize a box by dragging one of its grips.
 *
 * The delta is in floor-plan pixels and is interpreted in the box's *own*
 * frame, so a rotated box grows along the edge you grabbed instead of along
 * the screen axes — which is what made the old mouse-move resize jump as soon
 * as anything was rotated. The corner (or edge) opposite the one being dragged
 * stays put.
 */
export function resizeBox(
  box: Box,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  options: ResizeOptions = {}
): Rect {
  const {
    minWidth = 20,
    minHeight = 20,
    maxWidth = Number.POSITIVE_INFINITY,
    maxHeight = Number.POSITIVE_INFINITY,
    keepAspect = false,
    bounds,
  } = options;

  const rotation = box.rotation || 0;
  // Which edges the grip moves: +1 grows to the right/bottom, -1 to the left/top.
  const signX = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
  const signY = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;

  // Into the box's frame, so the maths below is always axis-aligned.
  const local = rotateVector(deltaX, deltaY, -rotation);

  let width = box.width + signX * local.x;
  let height = box.height + signY * local.y;

  if (keepAspect && box.width > 0 && box.height > 0) {
    const ratio = box.height / box.width;
    // A corner grip follows whichever axis the pointer moved furthest along;
    // an edge grip drives the other side from the one it owns.
    if (signX !== 0 && (signY === 0 || Math.abs(local.x) >= Math.abs(local.y))) {
      height = width * ratio;
    } else {
      width = height / ratio;
    }
  }

  width = Math.min(maxWidth, Math.max(minWidth, width));
  height = Math.min(maxHeight, Math.max(minHeight, height));

  if (keepAspect && box.width > 0 && box.height > 0) {
    // Re-apply the ratio after clamping, so hitting a limit on one axis does
    // not quietly distort the box.
    const ratio = box.height / box.width;
    if (width * ratio > maxHeight || width * ratio < minHeight) {
      width = Math.min(maxWidth, Math.max(minWidth, height / ratio));
    }
    height = Math.min(maxHeight, Math.max(minHeight, width * ratio));
  }

  // The anchor is the opposite edge/corner: it must not move, so the centre
  // shifts by half of whatever the box grew, expressed back in screen axes.
  const shift = rotateVector((signX * (width - box.width)) / 2, (signY * (height - box.height)) / 2, rotation);
  const centre = centreOf(box);
  const nextCentre = { x: centre.x + shift.x, y: centre.y + shift.y };

  let x = nextCentre.x - width / 2;
  let y = nextCentre.y - height / 2;

  if (bounds) {
    if (rotation % 360 === 0) {
      const clamped = clampBox(x, y, width, height, bounds);
      x = clamped.x;
      y = clamped.y;
    } else {
      // A rotated box's axis-aligned extent is not its width/height, so pin
      // the centre rather than pretending otherwise.
      const cx = Math.min(Math.max(0, nextCentre.x), bounds.width);
      const cy = Math.min(Math.max(0, nextCentre.y), bounds.height);
      x = cx - width / 2;
      y = cy - height / 2;
    }
  }

  return { x, y, width, height };
}

/** Do two axis-aligned rectangles overlap at all? */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

/** Normalise a drag between two points into a positive-extent rectangle. */
export function rectFromPoints(
  from: { x: number; y: number },
  to: { x: number; y: number }
): Rect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

/** Ids of every item the marquee touches. */
export function itemsInMarquee<T extends { id: string } & Rect>(items: T[], marquee: Rect): string[] {
  return items.filter((item) => rectsIntersect(item, marquee)).map((item) => item.id);
}

export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

/**
 * Align a selection along one edge or axis.
 *
 * Returns only the items that actually move, as `{ id, x, y }`, so callers can
 * persist a minimal diff. Unlike the old version this is not table-only: any
 * box on the canvas can take part, and vertical alignment exists at all.
 */
export function alignBoxes<T extends { id: string } & Rect>(
  items: T[],
  mode: AlignMode
): Array<{ id: string; x: number; y: number }> {
  if (items.length < 2) return [];

  const lefts = items.map((i) => i.x);
  const rights = items.map((i) => i.x + i.width);
  const tops = items.map((i) => i.y);
  const bottoms = items.map((i) => i.y + i.height);

  const target = {
    left: Math.min(...lefts),
    right: Math.max(...rights),
    top: Math.min(...tops),
    bottom: Math.max(...bottoms),
    centerX: (Math.min(...lefts) + Math.max(...rights)) / 2,
    centerY: (Math.min(...tops) + Math.max(...bottoms)) / 2,
  };

  return items
    .map((item) => {
      let { x, y } = item;
      switch (mode) {
        case 'left':
          x = target.left;
          break;
        case 'right':
          x = target.right - item.width;
          break;
        case 'centerX':
          x = target.centerX - item.width / 2;
          break;
        case 'top':
          y = target.top;
          break;
        case 'bottom':
          y = target.bottom - item.height;
          break;
        case 'centerY':
          y = target.centerY - item.height / 2;
          break;
      }
      return { id: item.id, x, y };
    })
    .filter((next, index) => next.x !== items[index].x || next.y !== items[index].y);
}

/**
 * Space a selection evenly between its two outermost members.
 *
 * Gaps are equalised rather than centres, so a row of differently sized tables
 * ends up looking evenly spaced instead of merely evenly indexed.
 */
export function distributeBoxes<T extends { id: string } & Rect>(
  items: T[],
  axis: 'horizontal' | 'vertical'
): Array<{ id: string; x: number; y: number }> {
  if (items.length < 3) return [];

  const horizontal = axis === 'horizontal';
  const sorted = [...items].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));

  const start = horizontal ? sorted[0].x : sorted[0].y;
  const last = sorted[sorted.length - 1];
  const end = horizontal ? last.x + last.width : last.y + last.height;
  const totalSize = sorted.reduce((sum, i) => sum + (horizontal ? i.width : i.height), 0);
  const gap = (end - start - totalSize) / (sorted.length - 1);

  let cursor = start;
  const moves: Array<{ id: string; x: number; y: number }> = [];
  for (const item of sorted) {
    const next = horizontal ? { id: item.id, x: cursor, y: item.y } : { id: item.id, x: item.x, y: cursor };
    if (next.x !== item.x || next.y !== item.y) moves.push(next);
    cursor += (horizontal ? item.width : item.height) + gap;
  }
  return moves;
}

export type ArrangeLayout = 'grid' | 'circle' | 'rows' | 'horseshoe';

export const ARRANGE_LAYOUTS: Array<{ id: ArrangeLayout; label: string; hint: string }> = [
  { id: 'grid', label: 'Grid', hint: 'Even rows and columns that fill the floor' },
  { id: 'circle', label: 'Circle', hint: 'A ring around the middle of the floor' },
  { id: 'rows', label: 'Banquet rows', hint: 'Long rows, like a banquet hall' },
  { id: 'horseshoe', label: 'Horseshoe', hint: 'An open U facing the top of the floor' },
];

/**
 * Lay tables out automatically.
 *
 * Every layout measures the real footprint of each table (the old circle
 * arrangement assumed every table was 100px square and subtracted a fixed 50,
 * which pushed large tables off the plan) and every result is clamped inside
 * the floor, so nothing lands somewhere the organiser has to hunt for.
 */
export function arrangeTables<T extends { id: string; width: number; height: number }>(
  tables: T[],
  bounds: CanvasSize,
  layout: ArrangeLayout = 'grid',
  snap: (value: number) => number = (v) => v
): Array<{ id: string; x: number; y: number }> {
  if (tables.length === 0) return [];

  const place = (item: T, x: number, y: number) => {
    const clamped = clampBox(snap(x), snap(y), item.width, item.height, bounds);
    return { id: item.id, x: clamped.x, y: clamped.y };
  };

  const centre = { x: bounds.width / 2, y: bounds.height / 2 };
  const widest = Math.max(...tables.map((t) => t.width));
  const tallest = Math.max(...tables.map((t) => t.height));

  if (tables.length === 1) {
    return [place(tables[0], centre.x - tables[0].width / 2, centre.y - tables[0].height / 2)];
  }

  if (layout === 'circle' || layout === 'horseshoe') {
    // Big enough that neighbours cannot overlap, but never larger than the floor.
    const spread = layout === 'horseshoe' ? Math.PI : 2 * Math.PI;
    const step = spread / (layout === 'horseshoe' ? Math.max(1, tables.length - 1) : tables.length);
    const minRadius = (Math.max(widest, tallest) * 1.15) / (2 * Math.sin(Math.min(Math.PI / 2, step / 2)) || 1);
    const maxRadius = Math.max(
      0,
      Math.min(bounds.width - widest, bounds.height - tallest) / 2
    );
    const radius = Math.min(maxRadius, Math.max(Math.min(bounds.width, bounds.height) * 0.3, minRadius));

    return tables.map((table, index) => {
      // Start at the bottom of the ring so a horseshoe opens towards the top
      // of the plan, where a head table or stage usually sits.
      const angle = layout === 'horseshoe' ? Math.PI * 0.5 + index * step : index * step - Math.PI / 2;
      return place(
        table,
        centre.x + radius * Math.cos(angle) - table.width / 2,
        centre.y + radius * Math.sin(angle) - table.height / 2
      );
    });
  }

  const gap = 40;
  const columns =
    layout === 'rows'
      ? Math.max(1, Math.floor((bounds.width - gap) / (widest + gap)))
      : Math.max(1, Math.min(tables.length, Math.round(Math.sqrt(tables.length * (bounds.width / bounds.height)))));
  const rows = Math.ceil(tables.length / columns);

  const cellWidth = widest + gap;
  const cellHeight = tallest + gap;
  const originX = Math.max(gap / 2, (bounds.width - columns * cellWidth) / 2);
  const originY = Math.max(gap / 2, (bounds.height - rows * cellHeight) / 2);

  return tables.map((table, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return place(
      table,
      originX + column * cellWidth + (cellWidth - gap - table.width) / 2,
      originY + row * cellHeight + (cellHeight - gap - table.height) / 2
    );
  });
}

export interface Guide {
  axis: 'x' | 'y';
  /** Where to draw the line, in floor-plan coordinates. */
  position: number;
}

export interface GuideResult {
  /** The drag delta after snapping. */
  x: number;
  y: number;
  guides: Guide[];
}

/**
 * Nudge a dragged box so its edges or centre line up with nearby items.
 *
 * This is the alternative to grid snapping: it lines tables up with each other
 * rather than with an arbitrary lattice, which is what an organiser actually
 * wants when squaring off a row of rounds.
 */
export function computeSnapGuides(
  moving: Rect,
  others: Rect[],
  threshold = GUIDE_THRESHOLD,
  bounds?: CanvasSize
): GuideResult {
  const candidates = (rect: Rect, axis: 'x' | 'y') =>
    axis === 'x'
      ? [rect.x, rect.x + rect.width / 2, rect.x + rect.width]
      : [rect.y, rect.y + rect.height / 2, rect.y + rect.height];

  const targets = { x: [] as number[], y: [] as number[] };
  for (const other of others) {
    targets.x.push(...candidates(other, 'x'));
    targets.y.push(...candidates(other, 'y'));
  }
  if (bounds) {
    targets.x.push(0, bounds.width / 2, bounds.width);
    targets.y.push(0, bounds.height / 2, bounds.height);
  }

  const guides: Guide[] = [];
  const offset = { x: 0, y: 0 };

  for (const axis of ['x', 'y'] as const) {
    const edges = candidates(moving, axis);
    let best: { delta: number; position: number } | null = null;
    for (const edge of edges) {
      for (const target of targets[axis]) {
        const delta = target - edge;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, position: target };
        }
      }
    }
    if (best) {
      offset[axis] = best.delta;
      guides.push({ axis, position: best.position });
    }
  }

  return { x: offset.x, y: offset.y, guides };
}

/**
 * Pull every item back inside the floor plan.
 *
 * Shrinking the edit zone used to strand whatever sat outside the new bounds:
 * it stayed in the data, was invisible on the plan, and could not be selected
 * to be moved back. Callers run this whenever the floor size changes.
 */
export function clampItemsIntoBounds<T extends { id: string } & Rect>(
  items: T[],
  bounds: CanvasSize
): Array<{ id: string; x: number; y: number }> {
  const moves: Array<{ id: string; x: number; y: number }> = [];
  for (const item of items) {
    const { x, y } = clampBox(item.x, item.y, item.width, item.height, bounds);
    if (x !== item.x || y !== item.y) moves.push({ id: item.id, x, y });
  }
  return moves;
}

/**
 * Restrict a drag delta so the whole selection stays on the floor plan.
 * Applied to the selection's bounding box rather than item by item, so the
 * group keeps its internal spacing when it hits an edge.
 */
export function clampGroupDelta(
  items: Rect[],
  deltaX: number,
  deltaY: number,
  bounds: CanvasSize
): { x: number; y: number } {
  if (items.length === 0) return { x: deltaX, y: deltaY };

  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const maxY = Math.max(...items.map((i) => i.y + i.height));

  // `+ 0` normalises the -0 that falls out of clamping against an item already
  // flush with the left or top edge, so callers comparing against 0 behave.
  return {
    x: Math.min(Math.max(deltaX, -minX), Math.max(0, bounds.width - maxX)) + 0,
    y: Math.min(Math.max(deltaY, -minY), Math.max(0, bounds.height - maxY)) + 0,
  };
}

/**
 * A free name for a copy: "Table 4" becomes "Table 4 copy", then
 * "Table 4 copy 2". Kept to the 50 characters the table name column holds.
 */
export function duplicateName(name: string, taken: string[]): string {
  const used = new Set(taken.map((n) => n.toLowerCase()));
  const base = `${name} copy`.slice(0, 50);
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${name} copy ${n}`.slice(0, 50);
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}

/**
 * Roughly how wide and tall a label renders.
 *
 * The canvas measures real labels from the DOM, but selection maths runs
 * before a new label has ever been laid out, and the server never has a DOM at
 * all — so this keeps hit-testing and clamping honest in the meantime.
 */
export function estimateLabelSize(text: string, fontSize: number, bold = true) {
  const characters = Math.max(1, text.length);
  return {
    width: Math.round(characters * fontSize * (bold ? 0.62 : 0.56)) + 16,
    height: Math.round(fontSize * 1.4) + 8,
  };
}
