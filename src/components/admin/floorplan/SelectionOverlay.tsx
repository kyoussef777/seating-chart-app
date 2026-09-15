'use client';

import React from 'react';
import { Copy, RotateCw, Trash2 } from 'lucide-react';
import type { ResizeHandle } from '@/lib/floorplan';
import { RESIZE_HANDLES } from '@/lib/floorplan';
import type { CanvasItem } from './types';

/**
 * Selection chrome for the floor plan.
 *
 * The handles live in one overlay layer above every item rather than inside
 * each item's own element. That is deliberate: nesting them inside the item
 * meant the rotate and delete buttons became part of a label's editable text
 * (blurring a selected label appended "A-A+" to it), and it forced every item
 * type to carry its own copy of the handle markup.
 */

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

/** Where each grip sits, as a percentage of the item's box. */
const HANDLE_POSITION: Record<ResizeHandle, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  e: { left: '100%', top: '50%' },
  se: { left: '100%', top: '100%' },
  s: { left: '50%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
};

interface SelectionOverlayProps {
  items: CanvasItem[];
  /** Screen scale, so handles stay a constant physical size at any zoom. */
  zoom: number;
  locked: boolean;
  /** Coarse pointer: grips and buttons grow to a finger-sized target. */
  touch: boolean;
  /** Floor-plan bounds, so the control bar never hangs off the edge. */
  canvasSize: { width: number; height: number };
  onResizeStart: (item: CanvasItem, handle: ResizeHandle, e: React.PointerEvent) => void;
  onRotateStart: (item: CanvasItem, e: React.PointerEvent) => void;
  onDelete: (item: CanvasItem) => void;
  onDuplicate: (item: CanvasItem) => void;
}

export default function SelectionOverlay({
  items,
  zoom,
  locked,
  touch,
  canvasSize,
  onResizeStart,
  onRotateStart,
  onDelete,
  onDuplicate,
}: SelectionOverlayProps) {
  // Handles are drawn inside the zoomed surface, so everything counter-scales
  // to stay grabbable at 20% and unobtrusive at 300%.
  const scale = 1 / Math.max(zoom, 0.01);
  const grip = (touch ? 15 : 11) * scale;
  const button = (touch ? 40 : 26) * scale;
  const offset = (touch ? 50 : 34) * scale;

  // Grips are useless on an item smaller than the grips themselves, and worse
  // than useless: eight of them blanket a small label at low zoom and swallow
  // the double-click that opens it for editing. Below this the item is sized
  // from the inspector (or after zooming in) instead.
  const GRIP_MIN_SCREEN_PX = touch ? 46 : 34;

  // Three buttons plus the two gaps between them, in floor-plan units.
  const barHalfWidth = (button * 3 + 8 * scale) / 2;
  const barShift = (item: CanvasItem) => {
    const centre = item.x + item.width / 2;
    const clamped = Math.min(
      Math.max(centre, barHalfWidth),
      Math.max(barHalfWidth, canvasSize.width - barHalfWidth)
    );
    return clamped - centre;
  };
  const gripsFit = (item: CanvasItem) =>
    item.width * zoom >= GRIP_MIN_SCREEN_PX && item.height * zoom >= GRIP_MIN_SCREEN_PX;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {items.map((item) => {
        const single = items.length === 1;
        return (
          <div
            key={item.id}
            className="absolute"
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              transform: `rotate(${item.rotation || 0}deg)`,
              transformOrigin: 'center',
            }}
          >
            <div
              className="absolute inset-0 border-2 border-emerald-500"
              style={{ borderWidth: Math.max(1, 2 * scale) }}
            />

            {/* Resize grips. Only ever shown for a single selection: dragging
                one grip of a group is ambiguous, and a group is far more
                often moved than resized. */}
            {single &&
              !locked &&
              item.resizable &&
              gripsFit(item) &&
              RESIZE_HANDLES.map((handle) => (
                <div
                  key={handle}
                  role="button"
                  aria-label={`Resize ${item.name} from the ${handle} edge`}
                  className="pointer-events-auto absolute rounded-full border-2 border-white bg-emerald-600 shadow"
                  style={{
                    width: grip,
                    height: grip,
                    left: HANDLE_POSITION[handle].left,
                    top: HANDLE_POSITION[handle].top,
                    marginLeft: -grip / 2,
                    marginTop: -grip / 2,
                    borderWidth: Math.max(1, 2 * scale),
                    cursor: HANDLE_CURSOR[handle],
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => onResizeStart(item, handle, e)}
                />
              ))}

            {/* Rotate, duplicate and delete sit on one bar above the item, or
                below it when the item is close enough to the top of the plan
                that the bar would be clipped — which on a phone, where the
                whole plan is barely taller than the bar, happens often.
                Horizontally the bar is nudged back inside the plan: the buttons
                keep a constant screen size, so zoomed out they are far wider
                than the item they belong to and would otherwise hang off the
                edge, unreachable. */}
            {single && !locked && (
              <div
                className="pointer-events-auto absolute left-1/2 flex items-center"
                style={{
                  ...(item.y < offset
                    ? { top: item.height + offset - button }
                    : { top: -offset }),
                  gap: 4 * scale,
                  transform: `translateX(calc(-50% + ${barShift(item)}px))`,
                  touchAction: 'none',
                }}
              >
                <button
                  type="button"
                  title="Drag to rotate (hold Shift to snap)"
                  aria-label={`Rotate ${item.name}`}
                  className="flex items-center justify-center rounded-full bg-emerald-600 text-white shadow hover:bg-emerald-700"
                  style={{ width: button, height: button, cursor: 'grab' }}
                  onPointerDown={(e) => onRotateStart(item, e)}
                >
                  <RotateCw style={{ width: button * 0.55, height: button * 0.55 }} />
                </button>
                <button
                  type="button"
                  title="Duplicate (Ctrl/⌘+D)"
                  aria-label={`Duplicate ${item.name}`}
                  className="flex items-center justify-center rounded-full bg-stone-700 text-white shadow hover:bg-stone-800"
                  style={{ width: button, height: button }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(item);
                  }}
                >
                  <Copy style={{ width: button * 0.5, height: button * 0.5 }} />
                </button>
                <button
                  type="button"
                  title="Delete (Del)"
                  aria-label={`Delete ${item.name}`}
                  className="flex items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700"
                  style={{ width: button, height: button }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                >
                  <Trash2 style={{ width: button * 0.5, height: button * 0.5 }} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
