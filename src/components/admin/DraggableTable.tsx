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
  onRename: (tableId: string, newName: string) => void;
  allTableNames: string[];
}

// Get dimensions for each table shape
const getTableDimensions = (shape: string) => {
  switch (shape) {
    case 'round':
      return { width: 140, height: 140, isCircular: true };
    case 'square':
      return { width: 120, height: 120, isCircular: false };
    case 'rectangular':
      return { width: 180, height: 100, isCircular: false };
    case 'oval':
      return { width: 160, height: 100, isCircular: true };
    case 'u-shape':
      return { width: 200, height: 140, isCircular: false };
    case 'cocktail':
      return { width: 80, height: 80, isCircular: true };
    default:
      return { width: 140, height: 140, isCircular: true };
  }
};

function DraggableTable({
  table,
  onDelete,
  onAssignGuest,
  onUnassignGuest,
  onRotate,
  onRename,
  allTableNames,
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

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'guest',
    drop: (item: { id: string; type: string }) => {
      if (item.type === 'guest') {
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
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
    transform: `rotate(${table.rotation || 0}deg)`,
    transformOrigin: 'center',
  };

  // Calculate seats used based on party sizes
  const seatsUsed = table.guests.reduce((total, guest) => total + (guest.partySize || 1), 0);
  const isFull = seatsUsed >= table.capacity;

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

  return (
    <div
      ref={attachRef}
      className={cn(
        themeConfig.table.default,
        'p-3 relative transition-all duration-200 flex flex-col items-center justify-center',
        isOver && !isFull ? themeConfig.table.dropTarget : '',
        isFull && isOver ? themeConfig.table.full : '',
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
          className={`${themeConfig.button.edit} flex-shrink-0`}
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
          className={`${themeConfig.button.delete} flex-shrink-0`}
          title="Delete table"
        >
          <Trash2 className="w-3 h-3" />
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
        <span>{seatsUsed}/{table.capacity}</span>
        {table.guests.length > 0 && (
          <span className="text-xs opacity-80 ml-1 font-normal">
            (click)
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
            !isFull ? 'border-green-400 bg-green-100 bg-opacity-50' : 'border-red-400 bg-red-100 bg-opacity-50'
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
          className={cn(
            'absolute left-full top-0 ml-2 p-3 rounded-lg shadow-xl z-50 min-w-[220px]',
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
              <div
                key={guest.id}
                className={cn(
                  'flex items-center justify-between text-sm p-2 rounded group transition-colors',
                  themeConfig.listItem.default
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`truncate ${themeConfig.text.body}`}>{guest.name}</span>
                  {guest.partySize > 1 && (
                    <span className={`${themeConfig.badge.partySize} flex-shrink-0`}>
                      +{guest.partySize - 1}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnassignGuest(guest.id);
                  }}
                  className={`${themeConfig.button.delete} flex-shrink-0`}
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
