'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import DraggableGuest from './DraggableGuest';
import {
  TABLE_COLORS,
  canSeat,
  getTableDimensions,
  seatsAvailable,
  seatsUsed as sumSeats,
  type Guest,
  type GuestDragItem,
  type Table,
} from '@/lib/seating';

interface DraggableTableProps {
  table: Table;
  onAssignGuest: (guestId: string, tableId: string) => void;
  onUnassignGuest: (guestId: string) => void;
  onRename: (tableId: string, newName: string) => void;
  allTableNames: string[];
  /** Pointer events drive the move (mouse, pen and touch alike); the canvas
   *  owns the gesture so it can apply zoom, snapping and bounds. */
  onDragStart: (tableId: string, e: React.PointerEvent) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  locked?: boolean;
  onSeatGuest?: (guest: Guest) => void;
  /** Canvas scale. The guest list and the rename field are counter-scaled by
   *  it so they stay readable at any zoom, instead of shrinking with the plan
   *  into a few unreadable pixels. */
  zoom?: number;
}

const SHAPE_GLYPH: Record<string, string> = {
  round: '⭕',
  square: '⬜',
  rectangular: '▬',
  oval: '⬭',
  'u-shape': '⊓',
  cocktail: '○',
};

function DraggableTable({
  table,
  onAssignGuest,
  onUnassignGuest,
  onRename,
  allTableNames,
  onDragStart,
  isDragging = false,
  isSelected = false,
  locked = false,
  onSeatGuest,
  zoom = 1,
}: DraggableTableProps) {
  const themeConfig = useTheme();
  const [showGuestList, setShowGuestList] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const [nameError, setNameError] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dimensions = getTableDimensions(table.shape, table);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowGuestList(false);
      }
    }

    if (showGuestList) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showGuestList]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (locked) return;
    setIsEditing(true);
    setEditName(table.name);
    setNameError('');
  };

  // Counter-scale: these are rendered inside the zoomed floor plan, so without
  // this a rename field is a few pixels tall at a normal working zoom.
  const counterScale = 1 / Math.max(zoom, 0.05);

  const handleSaveEdit = () => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      setNameError('Table name cannot be empty');
      return;
    }

    // Check if name already exists (excluding current table)
    const isDuplicate = allTableNames.some(
      name => name.toLowerCase() === trimmedName.toLowerCase() && name !== table.name
    );

    if (isDuplicate) {
      setNameError('A table with this name already exists');
      return;
    }

    if (trimmedName !== table.name) onRename(table.id, trimmedName);
    setIsEditing(false);
    setNameError('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(table.name);
    setNameError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Refuse an over-capacity or same-table drop up front, rather than
  // accepting it and rejecting with an error toast afterwards.
  const [{ isOver, canDropHere }, drop] = useDrop(
    () => ({
      accept: 'guest',
      canDrop: (item: GuestDragItem) => canSeat(table, item),
      drop: (item: GuestDragItem) => {
        onAssignGuest(item.id, table.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDropHere: monitor.canDrop(),
      }),
    }),
    [table.id, table.capacity, table.guests, onAssignGuest]
  );

  const attachRef = (el: HTMLDivElement | null) => {
    drop(el);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Always claim the press: otherwise it reaches the canvas, which reads a
    // press on empty space as "start panning" or "start a marquee".
    e.stopPropagation();
    // Controls, the rename field and the guest popup keep their own taps.
    if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return;
    onDragStart(table.id, e);
  };

  const seatsUsed = sumSeats(table.guests);
  const isFull = seatsUsed >= table.capacity;
  const isOver100 = seatsUsed > table.capacity;
  const freeSeats = seatsAvailable(table);

  const isRound = table.shape === 'round';
  const isOval = table.shape === 'oval';
  const isCocktail = table.shape === 'cocktail';
  const isUShape = table.shape === 'u-shape';

  // A resized table should not keep 14px text on a 60px footprint, nor stay
  // tiny once it has been scaled up to fill a head-table slot.
  const scale = Math.min(dimensions.width, dimensions.height) / 140;
  const compact = isCocktail || scale < 0.75;

  const palette = table.color ? TABLE_COLORS[table.color] : null;

  const getBorderRadius = () => {
    if (isRound || isCocktail || isOval) return '50%';
    if (isUShape) return '12px 12px 4px 4px';
    return '8px';
  };

  const tableStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${table.positionX}px`,
    top: `${table.positionY}px`,
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    cursor: locked ? 'default' : isDragging ? 'grabbing' : 'grab',
    // No transition while dragging: the table must track the pointer exactly.
    transition: isDragging ? 'none' : 'box-shadow 150ms ease-out',
    // Above shapes and venue furniture, below labels (which caption them) —
    // see LAYER in SeatingChart. A table being dragged lifts above everything.
    zIndex: isDragging ? 20 : 3,
    willChange: isDragging ? 'left, top' : undefined,
    transform: `rotate(${table.rotation || 0}deg)`,
    transformOrigin: 'center',
    borderRadius: getBorderRadius(),
    ...(palette ? { borderColor: palette.border, backgroundColor: palette.bg } : {}),
  };

  return (
    <div
      ref={attachRef}
      onPointerDown={handlePointerDown}
      className={cn(
        themeConfig.table.default,
        // No overflow clipping here. The guest list and the seat-count badge
        // are positioned outside the table's own box, and clipping the root
        // hid both of them completely — which is what made it impossible to
        // see who was sitting where. The name truncates instead.
        'relative flex flex-col items-center justify-center p-2 select-none touch-none',
        isOver && canDropHere ? themeConfig.table.dropTarget : '',
        isOver && !canDropHere ? themeConfig.table.full : '',
        isDragging ? themeConfig.table.dragging : '',
        // The selection ring itself is drawn by the canvas overlay, which also
        // carries the resize, rotate and delete controls.
        isSelected ? 'shadow-xl' : ''
      )}
      style={tableStyle}
    >
      {isUShape && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 border-t-2 border-emerald-600 bg-white/70" />
      )}

      {/* Table name — click to rename in place. */}
      <div
        className={cn(
          themeConfig.text.heading,
          'relative z-10 max-w-full text-center leading-tight',
          compact ? 'text-[10px]' : 'text-sm'
        )}
        style={palette ? { color: palette.border } : undefined}
      >
        {isEditing ? (
          <div
            className="absolute left-1/2 top-1/2 z-40 flex flex-col gap-1"
            data-no-drag
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              transform: `translate(-50%, -50%) scale(${counterScale}) rotate(${-(table.rotation || 0)}deg)`,
              transformOrigin: 'center',
              width: 180,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              aria-label={`Rename ${table.name}`}
              className="w-full rounded border-2 border-emerald-500 bg-white px-2 py-1.5 text-sm text-stone-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            {nameError && (
              <div className="rounded bg-white px-1 text-[11px] font-normal text-red-600 shadow">
                {nameError}
              </div>
            )}
          </div>
        ) : (
          <div
            className="cursor-text truncate rounded px-1 font-bold transition-colors hover:bg-emerald-50"
            onDoubleClick={handleStartEdit}
            title={locked ? table.name : `${table.name} — double-click to rename`}
          >
            {table.name}
          </div>
        )}
      </div>

      {/* Capacity — click to show who is sitting here. */}
      <div
        className={cn(
          'relative z-10 flex cursor-pointer items-center gap-1 font-medium transition-colors',
          themeConfig.text.body,
          compact ? 'text-[10px]' : 'text-sm',
          showGuestList && table.guests.length > 0 && 'font-semibold'
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (table.guests.length > 0) setShowGuestList((open) => !open);
        }}
        title={`${freeSeats} seat${freeSeats === 1 ? '' : 's'} free`}
      >
        <Users className={compact ? 'h-2.5 w-2.5' : 'h-4 w-4'} />
        <span>
          {seatsUsed}/{table.capacity}
        </span>
      </div>

      {/* Fullness at a glance, so a crowded plan reads without arithmetic. */}
      {!compact && (
        <div className="relative z-10 mt-1 h-1.5 w-2/3 overflow-hidden rounded-full bg-stone-200">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-200',
              isOver100 ? 'bg-rose-500' : isFull ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{
              width: `${Math.min(100, (seatsUsed / Math.max(1, table.capacity)) * 100)}%`,
            }}
          />
        </div>
      )}

      {!compact && (
        <div className="relative z-10 mt-0.5 text-[10px] opacity-60">
          {SHAPE_GLYPH[table.shape] ?? SHAPE_GLYPH.round}
        </div>
      )}

      {/* Drop feedback */}
      {isOver && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-20 border-2 border-dashed',
            canDropHere ? 'border-green-500 bg-green-100/60' : 'border-red-400 bg-red-100/60'
          )}
          style={{ borderRadius: getBorderRadius() }}
        >
          <div className="flex h-full items-center justify-center text-center text-[11px] font-semibold">
            {canDropHere ? 'Drop here' : 'No room'}
          </div>
        </div>
      )}

      {/* Guest count badge */}
      {table.guests.length > 0 && (
        <div
          className={cn(
            'absolute -bottom-2 -right-2 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-xs transition-colors',
            themeConfig.badge.default,
            showGuestList && 'ring-2 ring-emerald-300'
          )}
          onClick={(e) => {
            e.stopPropagation();
            setShowGuestList((open) => !open);
          }}
        >
          {table.guests.length}
        </div>
      )}

      {/* Who is sitting here */}
      {showGuestList && table.guests.length > 0 && (
        <div
          ref={popupRef}
          data-no-drag
          role="group"
          aria-label={`Guests at ${table.name}`}
          className={cn(
            'absolute left-1/2 top-full z-50 w-72 rounded-lg p-3 shadow-xl',
            `${themeConfig.classes.bgCard} border-2 ${themeConfig.classes.borderPrimary}`
          )}
          /* Counter-scaled and un-rotated: this lives inside the zoomed floor
             plan, so at a normal working zoom it would otherwise render a few
             pixels tall and unreadable. */
          style={{
            transform: `translateX(-50%) scale(${counterScale}) rotate(${-(table.rotation || 0)}deg)`,
            transformOrigin: 'top center',
            marginTop: 8 * counterScale,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className={`text-sm font-bold ${themeConfig.text.heading}`}>
              {table.name} ({seatsUsed}/{table.capacity} seats)
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGuestList(false);
              }}
              aria-label="Close guest list"
              className={themeConfig.button.cancel}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {table.guests.map((guest) => (
              <DraggableGuest
                key={guest.id}
                guest={guest}
                showUnassign
                onUnassign={() => onUnassignGuest(guest.id)}
                onSeat={onSeatGuest ? () => onSeatGuest(guest) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(DraggableTable, (prevProps, nextProps) => {
  // Only re-render if table data or guests actually changed
  const tableChanged =
    prevProps.table.id !== nextProps.table.id ||
    prevProps.table.name !== nextProps.table.name ||
    prevProps.table.shape !== nextProps.table.shape ||
    prevProps.table.capacity !== nextProps.table.capacity ||
    prevProps.table.positionX !== nextProps.table.positionX ||
    prevProps.table.positionY !== nextProps.table.positionY ||
    prevProps.table.rotation !== nextProps.table.rotation ||
    prevProps.table.width !== nextProps.table.width ||
    prevProps.table.height !== nextProps.table.height ||
    prevProps.table.color !== nextProps.table.color;

  // Check if guests array changed
  const guestsChanged =
    prevProps.table.guests.length !== nextProps.table.guests.length ||
    prevProps.table.guests.some((guest, index) => {
      const nextGuest = nextProps.table.guests[index];
      return !nextGuest || guest.id !== nextGuest.id || guest.partySize !== nextGuest.partySize;
    });

  // Return true if nothing changed (skip re-render)
  return (
    !tableChanged &&
    !guestsChanged &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.locked === nextProps.locked
  );
});
