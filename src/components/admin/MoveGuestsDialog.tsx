'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, UserX, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildMoveOptions,
  describeSelection,
  seatsNeeded,
  type MoveOption,
} from '@/lib/roster';
import { seatsUsed, type Guest, type Table } from '@/lib/seating';

interface MoveGuestsDialogProps {
  /** One guest, or a whole selection being moved together. */
  guests: Guest[];
  tables: Table[];
  /** `null` takes them off their table. */
  onAssign: (tableId: string | null) => void;
  onClose: () => void;
}

/**
 * Pick a table for one guest or a group of them.
 *
 * This is the answer to a roster with two dozen tables: moving somebody used
 * to mean dragging their card across three screens of scroll to a target that
 * was rarely on screen at the same time, and on a desktop there was no other
 * way at all — the tap-to-seat path only appeared on touch devices. Here the
 * move is: open, type a few letters (or don't), press Enter.
 *
 * Tables that cannot take the group are still listed, greyed out with their
 * free count, so "why isn't Table 6 here?" is never a question.
 */
export default function MoveGuestsDialog({
  guests,
  tables,
  onAssign,
  onClose,
}: MoveGuestsDialogProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const need = seatsNeeded(guests);
  const options = useMemo(() => buildMoveOptions(tables, guests, query), [tables, guests, query]);

  /**
   * Everything selectable with the keyboard, in the order it is drawn.
   *
   * Tables come first and "remove from table" last, in both the list and the
   * keyboard order. The dialog is opened to move somebody, so pressing Enter
   * on the best-fitting table is the expected outcome — having the destructive
   * option sitting at index 0 meant a quick type-and-Enter unseated the guest
   * instead of moving them.
   */
  const rows = useMemo(() => {
    const out: Array<{ id: string | null; option: MoveOption | null }> = [];
    for (const option of options.withRoom) out.push({ id: option.table.id, option });
    // Only meaningful when somebody is actually seated.
    if (guests.some((g) => g.tableId)) out.push({ id: null, option: null });
    return out;
  }, [guests, options.withRoom]);

  /** The first actual table, or -1 when none of them can take the group. */
  const firstTableRow = useMemo(() => rows.findIndex((r) => r.id !== null), [rows]);

  // Never start on "remove from table". When no table has room, nothing is
  // highlighted at all, so Enter does nothing rather than quietly unseating
  // the person you were trying to move.
  useEffect(() => {
    setActiveIndex(firstTableRow);
  }, [query, firstTableRow]);

  // Focus the search straight away: on a desktop the whole point is to type
  // a table name rather than hunt for it.
  useEffect(() => {
    const id = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const choose = useCallback(
    (index: number) => {
      if (index < 0) return;
      const row = rows[index];
      if (!row) return;
      onAssign(row.id);
    },
    [onAssign, rows]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => {
          if (rows.length === 0) return -1;
          // From "nothing highlighted", step onto the first or last row.
          if (index < 0) return event.key === 'ArrowDown' ? 0 : rows.length - 1;
          const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
          return (next + rows.length) % rows.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        choose(activeIndex);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, choose, onClose, rows.length]);

  // Keep the keyboard cursor in view as it moves down a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-row="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const title =
    guests.length === 1 ? `Move ${guests[0].name}` : `Move ${describeSelection(guests)}`;

  const rowIndexOf = (tableId: string) => rows.findIndex((r) => r.id === tableId);

  const renderOption = (option: MoveOption, disabled: boolean) => {
    const index = disabled ? -1 : rowIndexOf(option.table.id);
    const active = index === activeIndex;
    return (
      <button
        key={option.table.id}
        type="button"
        data-row={index >= 0 ? index : undefined}
        disabled={disabled}
        onMouseEnter={() => index >= 0 && setActiveIndex(index)}
        onClick={() => !disabled && onAssign(option.table.id)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors',
          disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-stone-100',
          active && !disabled && 'bg-emerald-50 ring-2 ring-emerald-500'
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-emerald-900">
            {option.table.name}
          </span>
          <span className="block text-xs text-stone-500">
            {seatsUsed(option.table.guests)}/{option.table.capacity} seats
            {disabled
              ? option.free <= 0
                ? ' · full'
                : ` · only ${option.free} free, needs ${need}`
              : ` · ${option.free} free`}
          </span>
        </span>
        {active && !disabled && (
          <span className="flex-shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            Enter
          </span>
        )}
      </button>
    );
  };

  const removeIndex = rows.findIndex((r) => r.id === null);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-emerald-900/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="animate-sheet-up flex max-h-[85vh] max-h-[85dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-emerald-900">{title}</h3>
            <p className="text-xs text-stone-500">
              Needs {need} seat{need === 1 ? '' : 's'}
              {options.current ? ` · currently at ${options.current.table.name}` : ''}
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

        {guests.length > 1 && (
          <div className="max-h-24 overflow-y-auto border-b border-stone-200 bg-stone-50 px-4 py-2">
            <p className="flex flex-wrap gap-1">
              {guests.map((guest) => (
                <span
                  key={guest.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-stone-700 ring-1 ring-stone-200"
                >
                  {guest.name}
                  {guest.partySize > 1 && (
                    <span className="flex items-center gap-0.5 text-stone-500">
                      <Users className="h-2.5 w-2.5" />
                      {guest.partySize}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
        )}

        <div className="border-b border-stone-200 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a table…"
              aria-label="Find a table"
              className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <p className="mt-1.5 hidden text-[11px] text-stone-400 sm:block">
            ↑↓ to choose · Enter to move · Esc to close
          </p>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain p-2">
          {options.current && (
            <div className="mb-1 flex w-full items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-emerald-900">
                  {options.current.table.name}
                </span>
                <span className="block text-xs text-stone-500">
                  {seatsUsed(options.current.table.guests)}/{options.current.table.capacity} seats
                </span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                <Check className="h-3 w-3" />
                Seated here
              </span>
            </div>
          )}

          {options.withRoom.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Tables with room
              </p>
              {options.withRoom.map((option) => renderOption(option, false))}
            </>
          )}

          {options.full.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                No room for {need} seat{need === 1 ? '' : 's'}
              </p>
              {options.full.map((option) => renderOption(option, true))}
            </>
          )}

          {options.withRoom.length === 0 && options.full.length === 0 && !options.current && (
            <p className="px-3 py-8 text-center text-sm text-stone-500">
              {tables.length === 0 ? 'No tables yet.' : 'No tables match that search.'}
            </p>
          )}

          {removeIndex >= 0 && (
            <button
              type="button"
              data-row={removeIndex}
              onMouseEnter={() => setActiveIndex(removeIndex)}
              onClick={() => onAssign(null)}
              className={cn(
                'mt-2 flex w-full items-center gap-3 rounded-xl border-t border-stone-200 px-3 py-3 pt-4 text-left text-sm font-medium text-amber-800 transition-colors hover:bg-amber-50',
                activeIndex === removeIndex && 'bg-amber-50 ring-2 ring-amber-400'
              )}
            >
              <UserX className="h-4 w-4 flex-shrink-0" />
              {guests.length === 1 ? 'Remove from table' : 'Remove all from their tables'}
            </button>
          )}
        </div>

        <div className="pb-safe" />
      </div>
    </div>
  );
}
