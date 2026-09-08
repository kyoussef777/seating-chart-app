'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import { User, X, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useIsTouch } from '@/hooks/useMediaQuery';
import type { GuestDragItem } from '@/lib/seating';

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
  /** Opens the tap-to-seat sheet. Touch screens never fire HTML5 drag
   *  events, so this is the only way to move a guest there. */
  onSeat?: () => void;
}

function DraggableGuest({
  guest,
  onUnassign,
  showUnassign = false,
  onSeat,
}: DraggableGuestProps) {
  const themeConfig = useTheme();
  const isTouch = useIsTouch();
  const tapToSeat = isTouch && Boolean(onSeat);
  // Carry the origin table + party size so drop targets can check capacity
  // without looking the guest up in state that may not hold them.
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'guest',
      item: {
        id: guest.id,
        type: 'guest',
        fromTableId: guest.tableId,
        partySize: guest.partySize || 1,
        name: guest.name,
      } satisfies GuestDragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [guest.id, guest.tableId, guest.partySize, guest.name]
  );

  return (
    <div
      ref={drag as unknown as React.LegacyRef<HTMLDivElement>}
      className={cn(
        themeConfig.listItem.draggable,
        isDragging ? 'opacity-50' : 'opacity-100',
        tapToSeat && 'cursor-pointer active:bg-stone-200'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <div
          className="flex items-center gap-2 min-w-0 flex-1"
          onClick={tapToSeat ? onSeat : undefined}
          role={tapToSeat ? 'button' : undefined}
          tabIndex={tapToSeat ? 0 : undefined}
          aria-label={tapToSeat ? `Seat ${guest.name}` : undefined}
        >
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

        {tapToSeat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSeat?.();
            }}
            aria-label={`Seat ${guest.name}`}
            className="flex h-11 w-9 flex-shrink-0 items-center justify-center rounded-lg text-stone-400"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {showUnassign && onUnassign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnassign();
            }}
            aria-label={`Remove ${guest.name} from their table`}
            className={`${themeConfig.button.delete} flex-shrink-0`}
          >
            <X className="w-4 h-4" />
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
    prevProps.showUnassign === nextProps.showUnassign &&
    Boolean(prevProps.onSeat) === Boolean(nextProps.onSeat)
  );
});