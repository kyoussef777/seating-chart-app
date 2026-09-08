'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Search, UserX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { seatsAvailable, seatsUsed, type Guest, type Table } from '@/lib/seating';

interface AssignGuestSheetProps {
  guest: Guest;
  tables: Table[];
  /** `null` removes the guest from their current table. */
  onAssign: (tableId: string | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet for seating a guest by tapping.
 *
 * The seating views are built around HTML5 drag-and-drop, which never fires
 * on touch screens. This gives phones an equivalent — and arguably faster —
 * way to move someone between tables, with the same capacity rules applied
 * up front so a full table simply cannot be chosen.
 */
export default function AssignGuestSheet({ guest, tables, onAssign, onClose }: AssignGuestSheetProps) {
  const [query, setQuery] = useState('');
  const need = guest.partySize || 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const visibleTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
    return q ? sorted.filter((t) => t.name.toLowerCase().includes(q)) : sorted;
  }, [tables, query]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-emerald-900/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Seat ${guest.name}`}
    >
      <div
        className="flex max-h-[85vh] max-h-[85dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl animate-sheet-up sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-emerald-900">Seat {guest.name}</h3>
            <p className="text-xs text-stone-500">
              Needs {need} seat{need === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {tables.length > 6 && (
          <div className="border-b border-stone-200 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a table…"
                className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain p-2">
          {guest.tableId && (
            <button
              onClick={() => onAssign(null)}
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-amber-800 hover:bg-amber-50"
            >
              <UserX className="h-4 w-4 flex-shrink-0" />
              Remove from table
            </button>
          )}

          {visibleTables.map((table) => {
            const free = seatsAvailable(table, guest.id);
            const isCurrent = table.id === guest.tableId;
            const disabled = !isCurrent && free < need;

            return (
              <button
                key={table.id}
                disabled={disabled}
                onClick={() => (isCurrent ? onClose() : onAssign(table.id))}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left',
                  disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-stone-100',
                  isCurrent && 'bg-emerald-50'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-emerald-900">
                    {table.name}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {seatsUsed(table.guests)}/{table.capacity} seats
                    {disabled ? ' · full' : free > 0 ? ` · ${free} free` : ''}
                  </span>
                </span>
                {isCurrent && (
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    <Check className="h-3 w-3" />
                    Seated here
                  </span>
                )}
              </button>
            );
          })}

          {visibleTables.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-stone-500">
              {tables.length === 0 ? 'No tables yet.' : 'No tables match that search.'}
            </p>
          )}
        </div>

        <div className="pb-safe" />
      </div>
    </div>
  );
}
