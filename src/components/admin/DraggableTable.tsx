'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Trash2, Users, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import DraggableGuest from './DraggableGuest';
import {
  canSeat,
  getTableDimensions,
  seatsAvailable,
  seatsUsed as sumSeats,
  type GuestDragItem,
  type Table as SeatingTable,
} from '@/lib/seating';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
  tableId: string | null;
}

interface Table {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  positionX: number;
  positionY: number;
  rotation: number;
  guests: Guest[];
}

interface DraggableTableProps {
  table: Table;
  onDelete: () => void;
  onAssignGuest: (guestId: string, tableId: string) => void;
  onUnassignGuest: (guestId: string) => void;
  onRotate: (tableId: string, rotation: number) => void;
  onRename: (tableId: string, newName: string) => void;
  allTableNames: string[];
  /** Touch screens get no HTML5 drag events; the canvas moves the table from
   *  raw touch events instead. */
  onTouchDragStart?: (tableId: string, clientX: number, clientY: number) => void;
  onSeatGuest?: (guest: Guest) => void;
}

function DraggableTable({
  table,
  onDelete,
  onAssignGuest,
  onUnassignGuest,
  onRotate,
  onRename,
  allTableNames,
  onTouchDragStart,
  onSeatGuest,
}: DraggableTableProps) {
  const themeConfig = useTheme();
  const [showGuestList, setShowGuestList] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const [nameError, setNameError] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dimensions = getTableDimensions(table.shape);

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
    setIsEditing(true);
    setEditName(table.name);
    setNameError('');
  };

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

    onRename(table.id, trimmedName);
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

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'table',
    item: () => {
      return { id: table.id, type: 'table' };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: true,
  }));

  // Refuse an over-capacity or same-table drop up front, rather than
  // accepting it and rejecting with an error toast afterwards.
  const [{ isOver, canDropHere }, drop] = useDrop(
    () => ({
      accept: 'guest',
      canDrop: (item: GuestDragItem) => canSeat(table as SeatingTable, item),
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
    drag(el);
    drop(el);
  };

  const tableStyle = {
    position: 'absolute' as const,
    left: `${table.positionX}px`,
    top: `${table.positionY}px`,
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
    transform: `rotate(${table.rotation || 0}deg)`,
    transformOrigin: 'center',
  };

  const seatsUsed = sumSeats(table.guests);
  const isFull = seatsUsed >= table.capacity;
  const freeSeats = seatsAvailable(table as SeatingTable);

  const isRound = table.shape === 'round';
  const isOval = table.shape === 'oval';
  const isCocktail = table.shape === 'cocktail';
  const isUShape = table.shape === 'u-shape';

  const getBorderRadius = () => {
    if (isRound || isCocktail) return '50%';
    if (isOval) return '50%';
    if (isUShape) return '12px 12px 4px 4px';
    return '8px';
  };

  const getSpecialShape = () => {
    if (isUShape) {
      return (
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-white border-t-2 border-emerald-600" />
      );
    }
    return null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onTouchDragStart || e.touches.length !== 1) return;
    // Let the controls, the rename field and the guest popup handle their own
    // taps rather than starting a drag.
    if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return;
    onTouchDragStart(table.id, e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <div
      ref={attachRef}
      onTouchStart={handleTouchStart}
      className={cn(
        themeConfig.table.default,
        'p-3 relative transition-all duration-200 flex flex-col items-center justify-center',
        isOver && canDropHere ? themeConfig.table.dropTarget : '',
        isOver && !canDropHere ? themeConfig.table.full : '',
        isDragging ? themeConfig.table.dragging : 'z-0'
      )}
      style={{
        ...tableStyle,
        borderRadius: getBorderRadius(),
      }}
    >
      {getSpecialShape()}

      {/* Controls - Top Right Corner */}
      <div className="absolute top-1 right-1 flex items-center gap-1 z-20">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const newRotation = ((table.rotation || 0) + 90) % 360;
            onRotate(table.id, newRotation);
          }}
          className={cn(themeConfig.button.edit, 'h-7 w-7 min-h-0 min-w-0 p-0 flex-shrink-0')}
          title="Rotate table"
          aria-label={`Rotate ${table.name}`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(themeConfig.button.delete, 'h-7 w-7 min-h-0 min-w-0 p-0 flex-shrink-0')}
          title="Delete table"
          aria-label={`Delete ${table.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table Name - Centered */}
      <div
        className={cn(
          themeConfig.text.heading,
          isCocktail ? 'text-xs text-center' : 'text-sm text-center font-bold mb-1',
          'relative'
        )}
      >
        {isEditing ? (
          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="w-full px-2 py-1 text-xs border-2 border-emerald-500 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            {nameError && (
              <div className="text-xs text-red-600 font-normal">
                {nameError}
              </div>
            )}
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-emerald-50 rounded px-1 transition-colors"
            onClick={handleStartEdit}
            title="Click to rename"
          >
            {table.name}
          </div>
        )}
      </div>

      {/* Capacity Info - Click to show/hide guest list */}
      <div
        className={cn(
          'flex items-center gap-1 cursor-pointer transition-colors',
          themeConfig.text.body,
          'font-medium',
          isCocktail ? 'text-xs' : 'text-sm',
          `hover:${themeConfig.icon.color.primary}`,
          showGuestList && table.guests.length > 0 && `${themeConfig.icon.color.primary} font-semibold`
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (table.guests.length > 0) {
            setShowGuestList(!showGuestList);
          }
        }}
      >
        <Users className={isCocktail ? 'w-3 h-3' : 'w-4 h-4'} />
        <span title={`${freeSeats} seat${freeSeats === 1 ? '' : 's'} free`}>
          {seatsUsed}/{table.capacity}
        </span>
        {table.guests.length > 0 && (
          <span className="text-xs opacity-80 ml-1 font-normal">
            {isFull ? '(full)' : `(${freeSeats} free)`}
          </span>
        )}
      </div>

      {/* Shape Indicator */}
      <div className="text-xs opacity-60 mt-1">
        {table.shape === 'round' && '⭕'}
        {table.shape === 'square' && '⬜'}
        {table.shape === 'rectangular' && '▬'}
        {table.shape === 'oval' && '⬭'}
        {table.shape === 'u-shape' && '⊓'}
        {table.shape === 'cocktail' && '○'}
      </div>

      {/* Drop Zone Indicator */}
      {isOver && (
        <div
          className={cn(
            'absolute inset-0 border-2 border-dashed pointer-events-none',
            !isFull ? 'border-green-400 bg-green-100/50' : 'border-red-400 bg-red-100/50'
          )}
          style={{ borderRadius: getBorderRadius() }}
        >
          <div className="flex items-center justify-center h-full text-xs font-medium">
            {isFull ? 'Table Full!' : 'Drop Here'}
          </div>
        </div>
      )}

      {/* Guest Count Badge - Shows for all tables with guests */}
      {table.guests.length > 0 && (
        <div
          className={cn(
            'absolute -bottom-2 -right-2 text-xs rounded-full w-6 h-6 flex items-center justify-center transition-colors cursor-pointer z-20',
            themeConfig.badge.default,
            showGuestList && 'ring-2 ring-emerald-300'
          )}
          onClick={(e) => {
            e.stopPropagation();
            setShowGuestList(!showGuestList);
          }}
        >
          {table.guests.length}
        </div>
      )}

      {/* Guest List Popup - Shows guests on click for all tables */}
      {showGuestList && table.guests.length > 0 && (
        <div
          ref={popupRef}
          data-no-drag
          className={cn(
            // Below the table on narrow screens (where `left-full` would push
            // it off the canvas), beside it from `sm` up.
            'absolute z-50 p-3 rounded-lg shadow-xl w-56',
            'left-1/2 top-full mt-2 -translate-x-1/2',
            'sm:left-full sm:top-0 sm:mt-0 sm:ml-2 sm:translate-x-0 sm:min-w-[220px] sm:w-auto',
            `${themeConfig.classes.bgCard} border-2 ${themeConfig.classes.borderPrimary}`
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`font-bold text-sm ${themeConfig.text.heading}`}>
              {table.name} ({seatsUsed}/{table.capacity} seats)
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGuestList(false);
              }}
              className={themeConfig.button.cancel}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
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
    prevProps.table.rotation !== nextProps.table.rotation;

  // Check if guests array changed
  const guestsChanged =
    prevProps.table.guests.length !== nextProps.table.guests.length ||
    prevProps.table.guests.some((guest, index) => {
      const nextGuest = nextProps.table.guests[index];
      return !nextGuest || guest.id !== nextGuest.id || guest.partySize !== nextGuest.partySize;
    });

  // Return true if nothing changed (skip re-render)
  return !tableChanged && !guestsChanged;
});
