'use client';

import { useDrag, useDrop } from 'react-dnd';
import { Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  tableId: string | null;
}

interface Table {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  positionX: number;
  positionY: number;
  guests: Guest[];
}

interface DraggableTableProps {
  table: Table;
  onDelete: () => void;
  onAssignGuest: (guestId: string, tableId: string) => void;
  onUnassignGuest: (guestId: string) => void;
}

export default function DraggableTable({
  table,
  onDelete,
  onAssignGuest,
  onUnassignGuest,
}: DraggableTableProps) {
  const themeConfig = useTheme();
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
  };

  const isFull = table.guests.length >= table.capacity;
  const isRound = table.shape === 'round';

  return (
    <div
      ref={attachRef}
      style={tableStyle}
      className={cn(
        themeConfig.table.default,
        'p-3',
        isRound ? 'rounded-full w-32 h-32 flex flex-col items-center justify-center' : 'rounded-lg',
        isOver && !isFull ? themeConfig.table.dropTarget : '',
        isFull && isOver ? themeConfig.table.full : '',
        isDragging ? themeConfig.table.dragging : 'z-0'
      )}
    >
      {/* Table Header */}
      <div className={cn(
        'flex items-center justify-between mb-2',
        isRound ? 'flex-col text-center' : ''
      )}>
        <div
          className={cn(
            themeConfig.text.heading,
            'flex-1',
            isRound ? 'text-sm text-center' : 'text-base'
          )}
        >
          {table.name}
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors flex-shrink-0 z-10"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Capacity Info */}
      <div className={cn(
        'flex items-center gap-1 text-xs text-gray-500 mb-2',
        isRound ? 'justify-center' : ''
      )}>
        <Users className="w-3 h-3" />
        <span>{table.guests.length}/{table.capacity}</span>
      </div>

      {/* Guest List */}
      <div className={cn(
        'space-y-1',
        isRound ? 'hidden' : 'max-h-32 overflow-y-auto w-full'
      )}>
        {table.guests.map((guest) => (
          <div
            key={guest.id}
            className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700 flex items-center justify-between group"
          >
            <span className="truncate">{guest.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnassignGuest(guest.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 rounded p-0.5 transition-all"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Drop Zone Indicator */}
      {isOver && (
        <div className={cn(
          'absolute inset-0 border-2 border-dashed rounded pointer-events-none',
          isRound ? 'rounded-full' : 'rounded-lg',
          !isFull ? 'border-green-400 bg-green-100 bg-opacity-50' : 'border-red-400 bg-red-100 bg-opacity-50'
        )}>
          <div className="flex items-center justify-center h-full text-xs font-medium">
            {isFull ? 'Table Full!' : 'Drop Here'}
          </div>
        </div>
      )}

      {/* Round Table Guest Count (when collapsed) */}
      {isRound && table.guests.length > 0 && (
        <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {table.guests.length}
        </div>
      )}
    </div>
  );
}