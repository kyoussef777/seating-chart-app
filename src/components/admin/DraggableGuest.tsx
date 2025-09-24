'use client';

import { useDrag } from 'react-dnd';
import { User, X } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  tableId: string | null;
}

interface DraggableGuestProps {
  guest: Guest;
  onUnassign?: () => void;
  showUnassign?: boolean;
}

export default function DraggableGuest({
  guest,
  onUnassign,
  showUnassign = false
}: DraggableGuestProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'guest',
    item: { id: guest.id, type: 'guest' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`
        bg-gray-50 border border-gray-200 rounded-lg p-2 cursor-move select-none
        hover:bg-gray-100 hover:border-gray-300 transition-colors
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {guest.name}
            </p>
            {guest.phoneNumber && (
              <p className="text-xs text-gray-500 truncate">
                {guest.phoneNumber}
              </p>
            )}
          </div>
        </div>

        {showUnassign && onUnassign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnassign();
            }}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}