'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Trash2, Users, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

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
}

function DraggableTable({
  table,
  onDelete,
  onAssignGuest,
  onUnassignGuest,
  onRotate,
}: DraggableTableProps) {
  const themeConfig = useTheme();
  const [showGuestList, setShowGuestList] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowGuestList(false);
      }
    }

    if (showGuestList) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGuestList]);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'table',
    item: () => {
      console.log('Started dragging table:', table.id);
      return { id: table.id, type: 'table' };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: true,
    end: (_, monitor) => {
      console.log('Finished dragging table:', table.id, 'didDrop:', monitor.didDrop());
    },
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'guest',
    drop: (item: { id: string; type: string }) => {
      if (item.type === 'guest' && table.guests.length < table.capacity) {
        onAssignGuest(item.id, table.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const attachRef = (el: HTMLDivElement | null) => {
    drag(el);
    drop(el);
  };

  const tableStyle = {
    position: 'absolute' as const,
    left: `${table.positionX}px`,
    top: `${table.positionY}px`,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
    transform: `rotate(${table.rotation || 0}deg)`,
    transformOrigin: 'center',
  };

  // Calculate seats used based on party sizes
  const seatsUsed = table.guests.reduce((total, guest) => total + (guest.partySize || 1), 0);
  const isFull = seatsUsed >= table.capacity;

  const isRound = table.shape === 'round';
  const isSquare = table.shape === 'square';
  const isOval = table.shape === 'oval';
  const isCocktail = table.shape === 'cocktail';
  const isUShape = table.shape === 'u-shape';

  const shouldUseCompactLayout = isRound || isSquare || isCocktail || isOval || isUShape;

  return (
    <div
      ref={attachRef}
      style={tableStyle}
      className={cn(
        themeConfig.table.default,
        'p-3 relative transition-all duration-200',
        isRound ? 'rounded-full w-32 h-32 flex flex-col items-center justify-center' : 'rounded-lg',
        isOver && !isFull ? themeConfig.table.dropTarget : '',
        isFull && isOver ? themeConfig.table.full : '',
        isDragging ? themeConfig.table.dragging : 'z-0'
      )}
    >
      {/* Table Header */}
      <div className={cn(
        'flex items-center justify-between mb-2',
        shouldUseCompactLayout ? 'flex-col text-center' : ''
      )}>
        <div
          className={cn(
            themeConfig.text.heading,
            'flex-1',
            shouldUseCompactLayout ? 'text-sm text-center' : 'text-base'
          )}
        >
          {table.name}
        </div>
        <div className="flex items-center gap-1">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const newRotation = ((table.rotation || 0) + 90) % 360;
              onRotate(table.id, newRotation);
            }}
            className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors flex-shrink-0 z-10"
            title="Rotate table"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors flex-shrink-0 z-10"
            title="Delete table"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Capacity Info - Click to show/hide guest list */}
      <div
        className={cn(
          'flex items-center gap-1 text-xs mb-2 cursor-pointer transition-colors',
          'text-black font-medium hover:text-yellow-700',
          shouldUseCompactLayout ? 'justify-center' : '',
          showGuestList && table.guests.length > 0 && 'text-yellow-700 font-semibold'
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (table.guests.length > 0) {
            setShowGuestList(!showGuestList);
          }
        }}
      >
        <Users className="w-3 h-3" />
        <span>{seatsUsed}/{table.capacity}</span>
        {table.guests.length > 0 && (
          <span className="text-xs opacity-80 ml-1 font-normal">
            (click)
          </span>
        )}
      </div>

      {/* Guest List - Hidden by default, only show on click via popup */}

      {/* Drop Zone Indicator */}
      {isOver && (
        <div className={cn(
          'absolute inset-0 border-2 border-dashed rounded pointer-events-none',
          shouldUseCompactLayout && (isRound || isCocktail || isOval) ? 'rounded-full' : 'rounded-lg',
          !isFull ? 'border-green-400 bg-green-100 bg-opacity-50' : 'border-red-400 bg-red-100 bg-opacity-50'
        )}>
          <div className="flex items-center justify-center h-full text-xs font-medium">
            {isFull ? 'Table Full!' : 'Drop Here'}
          </div>
        </div>
      )}

      {/* Guest Count Badge - Shows for all tables with guests */}
      {table.guests.length > 0 && (
        <div className={cn(
          'absolute -bottom-2 -right-2 text-xs rounded-full w-5 h-5 flex items-center justify-center transition-colors cursor-pointer',
          'bg-yellow-500 text-black border border-yellow-600 hover:bg-yellow-400',
          showGuestList && 'ring-2 ring-yellow-300'
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
          className={cn(
            'absolute left-full top-0 ml-2 p-3 rounded-lg shadow-lg z-50 min-w-[200px]',
            'bg-white border-2 border-yellow-500'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-sm text-black">
              {table.name} ({seatsUsed}/{table.capacity} seats)
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGuestList(false);
              }}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded p-1 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {table.guests.map((guest) => (
              <div
                key={guest.id}
                className={cn(
                  'flex items-center justify-between text-sm p-2 rounded group transition-colors',
                  'bg-yellow-50 border border-yellow-200 text-black font-medium'
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate">{guest.name}</span>
                  {guest.partySize > 1 && (
                    <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      +{guest.partySize - 1}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnassignGuest(guest.id);
                  }}
                  className="text-red-500 hover:bg-red-100 rounded p-1 transition-all flex-shrink-0"
                  title="Remove from table"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
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