'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import { User, X, Users } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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

function DraggableGuest({
  guest,
  onUnassign,
  showUnassign = false
}: DraggableGuestProps) {
  const themeConfig = useTheme();
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
        ${themeConfig.listItem.draggable}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <User className={`w-4 h-4 flex-shrink-0 ${themeConfig.icon.color.primary}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium truncate ${themeConfig.text.body}`}>
                {guest.name}
              </p>
              {guest.partySize > 1 && (
                <span className={`${themeConfig.badge.partySize} flex-shrink-0 flex items-center gap-0.5`}>
                  <Users className="w-2.5 h-2.5" />
                  {guest.partySize}
                </span>
              )}
            </div>
            {guest.phoneNumber && (
              <p className={`text-xs truncate ${themeConfig.text.muted}`}>
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
            className={`${themeConfig.button.delete} flex-shrink-0`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(DraggableGuest, (prevProps, nextProps) => {
  // Only re-render if guest data or props actually changed
  return (
    prevProps.guest.id === nextProps.guest.id &&
    prevProps.guest.name === nextProps.guest.name &&
    prevProps.guest.phoneNumber === nextProps.guest.phoneNumber &&
    prevProps.guest.partySize === nextProps.guest.partySize &&
    prevProps.guest.tableId === nextProps.guest.tableId &&
    prevProps.showUnassign === nextProps.showUnassign
  );
});