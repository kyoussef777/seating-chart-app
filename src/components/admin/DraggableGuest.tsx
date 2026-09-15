'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import { ArrowRightLeft, User, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { Guest, GuestDragItem } from '@/lib/seating';

interface DraggableGuestProps {
  guest: Guest;
  onUnassign?: () => void;
  showUnassign?: boolean;
  /**
   * Opens the move picker. Offered on every device, not just touch: dragging a
   * guest across a roster of two dozen tables means hauling their card over
   * several screens of scroll to a target that is rarely visible at the same
   * time, and on a desktop this used to be the only way.
   */
  onSeat?: () => void;
  /** Multi-select, for moving a family in one go. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Extra context, e.g. which table they are at in a search result. */
  meta?: string;
  /** Tighter rows, for scanning a long roster. */
  compact?: boolean;
}

function DraggableGuest({
  guest,
  onUnassign,
  showUnassign = false,
  onSeat,
  selectable = false,
  selected = false,
  onToggleSelect,
  meta,
  compact = false,
}: DraggableGuestProps) {
  const themeConfig = useTheme();
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
        compact ? 'p-1.5' : 'p-3',
        isDragging ? 'opacity-50' : 'opacity-100',
        selected && 'bg-emerald-50 ring-2 ring-emerald-500'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${guest.name}`}
            className="h-4 w-4 flex-shrink-0 cursor-pointer accent-emerald-600"
          />
        )}

        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={selectable ? onToggleSelect : undefined}
          role={selectable ? 'button' : undefined}
          tabIndex={selectable ? 0 : undefined}
          onKeyDown={
            selectable
              ? (e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onToggleSelect?.();
                  }
                }
              : undefined
          }
        >
          {!selectable && (
            <User className={cn('h-4 w-4 flex-shrink-0', themeConfig.icon.color.primary)} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn('truncate text-sm font-medium', themeConfig.text.body)}
                title={guest.name}
              >
                {guest.name}
              </p>
              {guest.partySize > 1 && (
                <span
                  className={cn(themeConfig.badge.partySize, 'flex flex-shrink-0 items-center gap-0.5')}
                >
                  <Users className="h-2.5 w-2.5" />
                  {guest.partySize}
                </span>
              )}
            </div>
            {meta ? (
              <p className={cn('truncate text-xs', themeConfig.text.muted)}>{meta}</p>
            ) : (
              !compact &&
              guest.phoneNumber && (
                <p className={cn('truncate text-xs', themeConfig.text.muted)}>{guest.phoneNumber}</p>
              )
            )}
          </div>
        </div>

        {onSeat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSeat();
            }}
            aria-label={`Move ${guest.name} to another table`}
            title="Move to another table"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 pointer-coarse:h-11 pointer-coarse:w-11"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        )}

        {showUnassign && onUnassign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnassign();
            }}
            aria-label={`Remove ${guest.name} from their table`}
            title="Remove from table"
            className={cn(themeConfig.button.delete, 'flex-shrink-0')}
          >
            <X className="h-4 w-4" />
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
    prevProps.selected === nextProps.selected &&
    prevProps.selectable === nextProps.selectable &&
    prevProps.compact === nextProps.compact &&
    prevProps.meta === nextProps.meta &&
    Boolean(prevProps.onSeat) === Boolean(nextProps.onSeat)
  );
});
