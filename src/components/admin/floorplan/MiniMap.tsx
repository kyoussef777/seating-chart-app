'use client';

import React, { useCallback, useRef } from 'react';
import type { CanvasSize } from '@/lib/seating';
import type { CanvasItem } from './types';

interface MiniMapProps {
  items: CanvasItem[];
  canvasSize: CanvasSize;
  /** The part of the floor plan currently on screen, in floor-plan pixels. */
  viewport: { x: number; y: number; width: number; height: number };
  selectedIds: Set<string>;
  /** Centre the view on a point of the floor plan. */
  onNavigate: (point: { x: number; y: number }) => void;
}

const KIND_FILL: Record<CanvasItem['kind'], string> = {
  table: 'bg-emerald-600',
  ref: 'bg-indigo-400',
  shape: 'bg-stone-400',
  label: 'bg-amber-500',
};

/**
 * A real minimap: it draws every item to scale, frames what is on screen, and
 * clicking or dragging it moves the view there.
 *
 * The old one drew a fixed 10px dot per table, showed nothing else, had no
 * viewport indicator and was `pointer-events-none` — so it could say roughly
 * where the tables were, and nothing else.
 */
export default function MiniMap({
  items,
  canvasSize,
  viewport,
  selectedIds,
  onNavigate,
}: MiniMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const navigateTo = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      onNavigate({
        x: ((clientX - rect.left) / rect.width) * canvasSize.width,
        y: ((clientY - rect.top) / rect.height) * canvasSize.height,
      });
    },
    [canvasSize.height, canvasSize.width, onNavigate]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    navigateTo(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    navigateTo(e.clientX, e.clientY);
  };

  const endDrag = (e: React.PointerEvent) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const percent = (value: number, total: number) => `${(value / Math.max(1, total)) * 100}%`;

  return (
    <div
      ref={ref}
      role="presentation"
      title="Click or drag to move the view"
      className="absolute bottom-3 right-3 h-24 w-32 cursor-pointer overflow-hidden rounded-lg border-2 border-stone-400 bg-white/95 shadow-lg sm:bottom-4 sm:right-4 sm:h-36 sm:w-48"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="relative h-full w-full bg-stone-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={`absolute rounded-[1px] ${KIND_FILL[item.kind]} ${
              selectedIds.has(item.id) ? 'opacity-100 ring-1 ring-emerald-900' : 'opacity-70'
            }`}
            style={{
              left: percent(item.x, canvasSize.width),
              top: percent(item.y, canvasSize.height),
              // A minimum keeps a small object from vanishing entirely.
              width: `max(2px, ${percent(item.width, canvasSize.width)})`,
              height: `max(2px, ${percent(item.height, canvasSize.height)})`,
            }}
          />
        ))}

        {/* What is on screen right now. */}
        <div
          className="pointer-events-none absolute border-2 border-emerald-700 bg-emerald-500/10"
          style={{
            left: percent(Math.max(0, viewport.x), canvasSize.width),
            top: percent(Math.max(0, viewport.y), canvasSize.height),
            width: percent(Math.min(viewport.width, canvasSize.width), canvasSize.width),
            height: percent(Math.min(viewport.height, canvasSize.height), canvasSize.height),
          }}
        />
      </div>
    </div>
  );
}
