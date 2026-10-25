/**
 * Geometry for the guest portal's "where is my table" map.
 *
 * Pure and DOM-free so it can be unit tested. The map is drawn from the same
 * records the admin canvas edits, so moving a table in the Seating Chart moves
 * it for guests too — there is no second copy of the layout to keep in step.
 */

import { getTableDimensions } from './seating.ts';

export interface MapBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface MapTable {
  id: string;
  name: string;
  shape: string;
  positionX: number;
  positionY: number;
  rotation?: number | null;
  width?: number | null;
  height?: number | null;
}

/** A table's footprint on the floor plan, sized as the admin canvas sizes it. */
export function tableBox(table: MapTable): MapBox & { isCircular: boolean } {
  const { width, height, isCircular } = getTableDimensions(table.shape, table);
  return {
    x: table.positionX,
    y: table.positionY,
    width,
    height,
    rotation: table.rotation || 0,
    isCircular,
  };
}

/** Axis-aligned bounds of a box once rotated about its centre. */
export function rotatedBounds(box: MapBox) {
  const rad = (box.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = box.width * cos + box.height * sin;
  const h = box.width * sin + box.height * cos;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { minX: cx - w / 2, minY: cy - h / 2, maxX: cx + w / 2, maxY: cy + h / 2 };
}

/**
 * The SVG viewBox that frames every box, with `pad` floor-plan px of margin.
 * Cropping to the content rather than the whole canvas keeps the room as large
 * as the card allows; an empty plan falls back to a unit box.
 */
export function mapViewBox(boxes: MapBox[], pad = 30) {
  if (boxes.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    const b = rotatedBounds(box);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}
