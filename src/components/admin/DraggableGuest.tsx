'use client';

import { useDrag } from 'react-dnd';
import { User, X, Users } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
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
      ref={drag as unknown as React.LegacyRef<HTMLDivElement>}
      className={`
        bg-gray-50 border border-gray-200 rounded-lg p-2 cursor-move select-none
        hover:bg-gray-100 hover:border-gray-300 transition-colors
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <User className="w-4 h-4 text-black flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-black truncate">
                {guest.name}
              </p>
              {guest.partySize > 1 && (
                <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  {guest.partySize}
                </span>
              )}
            </div>
            {guest.phoneNumber && (
              <p className="text-xs text-black truncate">
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