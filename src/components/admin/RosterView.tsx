'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Users, Search, UserX, Armchair, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsTouch } from '@/hooks/useMediaQuery';
import DraggableGuest from './DraggableGuest';
import AssignGuestSheet from './AssignGuestSheet';
import {
  canSeat,
  fetchSeating,
  persistAssignment,
  seatsAvailable,
  seatsUsed,
  type Guest,
  type GuestDragItem,
  type Table,
} from '@/lib/seating';

/** One table, listing everyone seated at it. Accepts guest drops. */
function TableCard({
  table,
  onDropGuest,
  onUnassign,
  onSeatGuest,
  highlight,
}: {
  table: Table;
  onDropGuest: (guestId: string, tableId: string) => void;
  onUnassign: (guestId: string) => void;
  onSeatGuest: (guest: Guest) => void;
  highlight: string;
}) {
  const themeConfig = useTheme();
  const used = seatsUsed(table.guests);
  const free = seatsAvailable(table);

  const [{ isOver, canDropHere }, drop] = useDrop(
    () => ({
      accept: 'guest',
      canDrop: (item: GuestDragItem) => canSeat(table, item),
      drop: (item: GuestDragItem) => onDropGuest(item.id, table.id),
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDropHere: monitor.canDrop(),
      }),
    }),
    [table, onDropGuest]
  );

  const matches = (g: Guest) =>
    highlight.length > 0 && g.name.toLowerCase().includes(highlight.toLowerCase());

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={cn(
        'rounded-2xl border-2 bg-white shadow-sm transition-colors flex flex-col',
        isOver && canDropHere && 'border-green-400 bg-green-50',
        isOver && !canDropHere && 'border-rose-400 bg-rose-50',
        !isOver && (free === 0 ? 'border-stone-300' : 'border-stone-200')
      )}
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-stone-200 px-4 py-3">
        <h3 className={cn('text-base truncate', themeConfig.text.heading)}>{table.name}</h3>
        <span
          className={cn(
            'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            free === 0 ? 'bg-stone-200 text-stone-700' : 'bg-emerald-100 text-emerald-800'
          )}
          title={`${used} of ${table.capacity} seats used`}
        >
          {used}/{table.capacity}
          {free > 0 && ` · ${free} free`}
        </span>
      </div>

      <div className="flex-1 space-y-1 p-2 min-h-[64px]">
        {table.guests.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-stone-400">
            No one seated yet
          </p>
        ) : (
          table.guests.map((guest) => (
            <div key={guest.id} className={cn(matches(guest) && 'rounded-lg ring-2 ring-amber-400')}>
              <DraggableGuest
                guest={guest}
                showUnassign
                onUnassign={() => onUnassign(guest.id)}
                onSeat={() => onSeatGuest(guest)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Unassigned column. Dropping here removes a guest from their table. */
function UnassignedColumn({
  guests,
  onUnassignDrop,
  onSeatGuest,
  highlight,
}: {
  guests: Guest[];
  onUnassignDrop: (guestId: string) => void;
  onSeatGuest: (guest: Guest) => void;
  highlight: string;
}) {
  const themeConfig = useTheme();
  // On phones this column sits above the tables, so it collapses to keep the
  // tables reachable without a long scroll.
  const [open, setOpen] = useState(true);
  const [{ isOver, canDropHere }, drop] = useDrop(
    () => ({
      accept: 'guest',
      canDrop: (item: GuestDragItem) => item.fromTableId !== null,
      drop: (item: GuestDragItem) => onUnassignDrop(item.id),
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDropHere: monitor.canDrop(),
      }),
    }),
    [onUnassignDrop]
  );

  const seats = seatsUsed(guests);

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={cn(
        'flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-colors',
        isOver && canDropHere ? 'border-amber-400 bg-amber-50' : 'border-stone-200'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-b border-stone-200 px-4 py-3 text-left lg:cursor-default"
      >
        <h3 className={cn('flex items-center gap-2 text-base', themeConfig.text.heading)}>
          <UserX className="h-4 w-4" />
          Not seated
        </h3>
        <span className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {guests.length} · {seats} seat{seats === 1 ? '' : 's'}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-stone-400 transition-transform lg:hidden',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>
      <div
        className={cn(
          'max-h-[45vh] flex-1 space-y-1 overflow-y-auto overscroll-contain p-2 lg:block lg:max-h-[70vh]',
          !open && 'hidden'
        )}
      >
        {guests.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-stone-400">Everyone has a table.</p>
        ) : (
          guests.map((guest) => (
            <div
              key={guest.id}
              className={cn(
                highlight && guest.name.toLowerCase().includes(highlight.toLowerCase()) &&
                  'rounded-lg ring-2 ring-amber-400'
              )}
            >
              <DraggableGuest guest={guest} onSeat={() => onSeatGuest(guest)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function RosterView() {
  const themeConfig = useTheme();
  const toast = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [unassigned, setUnassigned] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const isTouch = useIsTouch();
  const [seatingGuest, setSeatingGuest] = useState<Guest | null>(null);

  const tablesRef = useRef<Table[]>([]);
  const unassignedRef = useRef<Guest[]>([]);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);
  useEffect(() => {
    unassignedRef.current = unassigned;
  }, [unassigned]);

  const load = useCallback(async (initial = false) => {
    try {
      const data = await fetchSeating();
      setTables(data.tables);
      setUnassigned(data.unassigned);
    } catch {
      toast.error('Failed to load seating data');
    } finally {
      if (initial) setLoading(false);
    }
    // toast is stable (memoised context)
  }, [toast]);

  useEffect(() => {
    load(true);
  }, [load]);

  /** Optimistically move a guest, then reconcile with the server. */
  const move = useCallback(
    async (guestId: string, tableId: string | null) => {
      const all = [...tablesRef.current.flatMap((t) => t.guests), ...unassignedRef.current];
      const guest = all.find((g) => g.id === guestId);
      if (!guest) return;
      if (guest.tableId === tableId) return;

      const target = tableId ? tablesRef.current.find((t) => t.id === tableId) : null;
      if (tableId && !target) return;

      if (target) {
        const free = seatsAvailable(target, guestId);
        const need = guest.partySize || 1;
        if (free < need) {
          toast.error(
            `Not enough space at ${target.name}. ${guest.name} needs ${need} seat${need > 1 ? 's' : ''} but only ${free} ${free === 1 ? 'is' : 'are'} free.`
          );
          return;
        }
      }

      const updated = { ...guest, tableId };
      const byName = (a: Guest, b: Guest) => a.name.localeCompare(b.name);

      setTables((prev) =>
        prev.map((t) => {
          const without = t.guests.filter((g) => g.id !== guestId);
          if (t.id === tableId) return { ...t, guests: [...without, updated].sort(byName) };
          return without.length === t.guests.length ? t : { ...t, guests: without };
        })
      );
      setUnassigned((prev) => {
        const without = prev.filter((g) => g.id !== guestId);
        return tableId === null ? [...without, updated].sort(byName) : without;
      });

      const result = await persistAssignment(guestId, tableId);
      if (result.ok) {
        toast.success(
          tableId ? `${guest.name} → ${target!.name}` : `${guest.name} removed from their table`
        );
      } else {
        toast.error(result.error);
        await load();
      }
    },
    [toast, load]
  );

  const stats = useMemo(() => {
    const seated = tables.reduce((n, t) => n + t.guests.length, 0);
    const seatedSeats = tables.reduce((n, t) => n + seatsUsed(t.guests), 0);
    const capacity = tables.reduce((n, t) => n + t.capacity, 0);
    return { seated, seatedSeats, capacity, unseated: unassigned.length };
  }, [tables, unassigned]);

  const visibleTables = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.guests.some((g) => g.name.toLowerCase().includes(q))
    );
  }, [tables, debouncedSearch]);

  const visibleUnassigned = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((g) => g.name.toLowerCase().includes(q));
  }, [unassigned, debouncedSearch]);

  if (loading) {
    return (
      <div className={cn(themeConfig.card, 'py-16 text-center')}>
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className={themeConfig.text.muted}>Loading roster…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(themeConfig.card, 'space-y-3 lg:flex lg:flex-wrap lg:items-center lg:gap-4 lg:space-y-0')}>
        <div className="flex items-center gap-2 lg:min-w-[220px] lg:flex-1">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a guest or table…"
              className={cn(themeConfig.input, 'pl-9')}
            />
          </div>
          <button
            onClick={() => load()}
            className={cn(themeConfig.button.tertiary, 'flex-shrink-0 lg:hidden')}
            aria-label="Reload roster"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Stats read as chips on phones so they wrap predictably instead of
            colliding with the search field. */}
        <div className="flex flex-wrap items-center gap-2 text-sm lg:gap-3">
          <span
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 lg:bg-transparent lg:px-0 lg:py-0"
            title="Guests seated"
          >
            <Armchair className="h-4 w-4 text-emerald-600" />
            <strong>{stats.seated}</strong> seated
            <span className={themeConfig.text.muted}>({stats.seatedSeats} seats)</span>
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 lg:bg-transparent lg:px-0 lg:py-0"
            title="Guests without a table"
          >
            <UserX className="h-4 w-4 text-amber-600" />
            <strong>{stats.unseated}</strong> not seated
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 lg:bg-transparent lg:px-0 lg:py-0"
            title="Total seats across all tables"
          >
            <Users className="h-4 w-4 text-stone-500" />
            <strong>{stats.capacity}</strong> capacity
          </span>
          <button
            onClick={() => load()}
            className={cn(themeConfig.button.tertiary, 'hidden lg:inline-flex')}
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {isTouch && (
          <p className={cn('text-xs lg:hidden', themeConfig.text.muted)}>
            Tap a guest to seat or move them.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <UnassignedColumn
            guests={visibleUnassigned}
            onUnassignDrop={(id) => move(id, null)}
            onSeatGuest={setSeatingGuest}
            highlight={debouncedSearch}
          />
        </div>

        <div className="lg:col-span-3">
          {visibleTables.length === 0 ? (
            <div className={cn(themeConfig.card, 'py-12 text-center')}>
              <p className={themeConfig.text.muted}>
                {tables.length === 0
                  ? 'No tables yet — create some in the Seating Chart tab.'
                  : 'No tables match that search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onDropGuest={(guestId, tableId) => move(guestId, tableId)}
                  onUnassign={(guestId) => move(guestId, null)}
                  onSeatGuest={setSeatingGuest}
                  highlight={debouncedSearch}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {seatingGuest && (
        <AssignGuestSheet
          guest={seatingGuest}
          tables={tables}
          onAssign={(tableId) => {
            move(seatingGuest.id, tableId);
            setSeatingGuest(null);
          }}
          onClose={() => setSeatingGuest(null)}
        />
      )}
    </div>
  );
}
