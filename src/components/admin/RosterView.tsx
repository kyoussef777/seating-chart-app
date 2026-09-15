'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import {
  Armchair,
  ArrowRightLeft,
  CheckSquare,
  ChevronDown,
  RefreshCw,
  Rows3,
  Search,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import DraggableGuest from './DraggableGuest';
import MoveGuestsDialog from './MoveGuestsDialog';
import {
  TABLE_FILTERS,
  buildRosterView,
  describeSelection,
  planBulkMove,
  seatsNeeded,
  type RosterTableView,
  type TableFilter,
} from '@/lib/roster';
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
  view,
  onDropGuest,
  onUnassign,
  onMoveGuest,
  onMoveTable,
  selectedIds,
  onToggleSelect,
  selecting,
  compact,
}: {
  view: RosterTableView;
  onDropGuest: (guestId: string, tableId: string) => void;
  onUnassign: (guestId: string) => void;
  onMoveGuest: (guest: Guest) => void;
  onMoveTable: (table: Table) => void;
  selectedIds: Set<string>;
  onToggleSelect: (guest: Guest) => void;
  selecting: boolean;
  compact: boolean;
}) {
  const themeConfig = useTheme();
  const { table, guests, hiddenGuests, used, free } = view;

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

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={cn(
        'flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-colors',
        isOver && canDropHere && 'border-green-400 bg-green-50',
        isOver && !canDropHere && 'border-rose-400 bg-rose-50',
        !isOver && (view.matchesQuery ? 'border-amber-300' : free === 0 ? 'border-stone-300' : 'border-stone-200')
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-3 py-2.5">
        <h3 className={cn('min-w-0 flex-1 truncate text-base', themeConfig.text.heading)}>
          {table.name}
        </h3>
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
        {table.guests.length > 0 && (
          <button
            type="button"
            onClick={() => onMoveTable(table)}
            title={`Select everyone at ${table.name}`}
            aria-label={`Select everyone at ${table.name}`}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 pointer-coarse:h-11 pointer-coarse:w-11"
          >
            <CheckSquare className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className={cn('min-h-[56px] flex-1 p-2', compact ? 'space-y-0.5' : 'space-y-1')}>
        {guests.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-stone-400">
            {table.guests.length === 0 ? 'No one seated yet' : 'No matches at this table'}
          </p>
        ) : (
          guests.map((guest) => (
            <DraggableGuest
              key={guest.id}
              guest={guest}
              showUnassign
              compact={compact}
              selectable={selecting}
              selected={selectedIds.has(guest.id)}
              onToggleSelect={() => onToggleSelect(guest)}
              onUnassign={() => onUnassign(guest.id)}
              onSeat={() => onMoveGuest(guest)}
            />
          ))
        )}
        {hiddenGuests > 0 && (
          <p className="px-2 pt-1 text-center text-[11px] text-stone-400">
            +{hiddenGuests} more not matching
          </p>
        )}
      </div>
    </div>
  );
}

/** Unassigned column. Dropping here removes a guest from their table. */
function UnassignedColumn({
  guests,
  hidden,
  onUnassignDrop,
  onMoveGuest,
  selectedIds,
  onToggleSelect,
  selecting,
  compact,
}: {
  guests: Guest[];
  hidden: number;
  onUnassignDrop: (guestId: string) => void;
  onMoveGuest: (guest: Guest) => void;
  selectedIds: Set<string>;
  onToggleSelect: (guest: Guest) => void;
  selecting: boolean;
  compact: boolean;
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

  const seats = seatsNeeded(guests);

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={cn(
        'flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-colors lg:sticky lg:top-20',
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
            className={cn('h-4 w-4 text-stone-400 transition-transform lg:hidden', open && 'rotate-180')}
          />
        </span>
      </button>
      <div
        className={cn(
          'max-h-[45vh] flex-1 overflow-y-auto overscroll-contain p-2 lg:block lg:max-h-[62vh]',
          compact ? 'space-y-0.5' : 'space-y-1',
          !open && 'hidden'
        )}
      >
        {guests.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-stone-400">
            {hidden > 0 ? 'No matches here.' : 'Everyone has a table.'}
          </p>
        ) : (
          guests.map((guest) => (
            <DraggableGuest
              key={guest.id}
              guest={guest}
              compact={compact}
              selectable={selecting}
              selected={selectedIds.has(guest.id)}
              onToggleSelect={() => onToggleSelect(guest)}
              onSeat={() => onMoveGuest(guest)}
            />
          ))
        )}
        {hidden > 0 && guests.length > 0 && (
          <p className="px-2 pt-1 text-center text-[11px] text-stone-400">
            +{hidden} more not matching
          </p>
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
  const [filter, setFilter] = useState<TableFilter>('all');
  const [compact, setCompact] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [movingGuests, setMovingGuests] = useState<Guest[] | null>(null);

  const tablesRef = useRef<Table[]>([]);
  const unassignedRef = useRef<Guest[]>([]);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);
  useEffect(() => {
    unassignedRef.current = unassigned;
  }, [unassigned]);

  const load = useCallback(
    async (initial = false) => {
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
    },
    [toast]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const allGuests = useMemo(
    () => [...tables.flatMap((t) => t.guests), ...unassigned],
    [tables, unassigned]
  );

  const selectedGuests = useMemo(
    () => allGuests.filter((g) => selectedIds.has(g.id)),
    [allGuests, selectedIds]
  );

  // Drop anyone who has since been deleted, so the action bar cannot refer to
  // people who are no longer there.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(allGuests.map((g) => g.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (live.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [allGuests]);

  /** Apply a move locally, then reconcile with the server. */
  const applyLocalMove = useCallback((guest: Guest, tableId: string | null) => {
    const updated = { ...guest, tableId };
    const byName = (a: Guest, b: Guest) => a.name.localeCompare(b.name);
    setTables((prev) =>
      prev.map((t) => {
        const without = t.guests.filter((g) => g.id !== guest.id);
        if (t.id === tableId) return { ...t, guests: [...without, updated].sort(byName) };
        return without.length === t.guests.length ? t : { ...t, guests: without };
      })
    );
    setUnassigned((prev) => {
      const without = prev.filter((g) => g.id !== guest.id);
      return tableId === null ? [...without, updated].sort(byName) : without;
    });
  }, []);

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

      applyLocalMove(guest, tableId);

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
    [applyLocalMove, load, toast]
  );

  /**
   * Move a whole selection at once. Anyone who does not fit is reported rather
   * than silently dropped, and the ones who do fit still go.
   */
  const moveMany = useCallback(
    async (guests: Guest[], tableId: string | null) => {
      const target = tableId ? tablesRef.current.find((t) => t.id === tableId) : null;
      if (tableId && !target) return;

      const pending = guests.filter((g) => g.tableId !== tableId);
      if (pending.length === 0) {
        setSelectedIds(new Set());
        return;
      }

      const { accepted, rejected } = target
        ? planBulkMove(target, pending)
        : { accepted: pending, rejected: [] as Guest[] };

      for (const guest of accepted) applyLocalMove(guest, tableId);

      const results = await Promise.all(
        accepted.map(async (guest) => ({
          guest,
          result: await persistAssignment(guest.id, tableId),
        }))
      );
      const failed = results.filter((r) => !r.result.ok);

      if (failed.length > 0) {
        toast.error(`${failed.length} of ${accepted.length} moves failed. Refreshing…`);
        await load();
      } else if (accepted.length > 0) {
        toast.success(
          tableId
            ? `${describeSelection(accepted)} → ${target!.name}`
            : `${describeSelection(accepted)} removed from their tables`
        );
      }

      if (rejected.length > 0 && target) {
        toast.warning(
          `${describeSelection(rejected)} did not fit at ${target.name} — still ${rejected.length === 1 ? 'where they were' : 'where they were'}.`
        );
      }

      setSelectedIds(new Set(rejected.map((g) => g.id)));
    },
    [applyLocalMove, load, toast]
  );

  const toggleSelect = useCallback((guest: Guest) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guest.id)) next.delete(guest.id);
      else next.add(guest.id);
      return next;
    });
  }, []);

  const selectWholeTable = useCallback((table: Table) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const everyone = table.guests.every((g) => next.has(g.id));
      for (const guest of table.guests) {
        if (everyone) next.delete(guest.id);
        else next.add(guest.id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !movingGuests) setSelectedIds(new Set());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [movingGuests]);

  const stats = useMemo(() => {
    const seated = tables.reduce((n, t) => n + t.guests.length, 0);
    const seatedSeats = tables.reduce((n, t) => n + seatsUsed(t.guests), 0);
    const capacity = tables.reduce((n, t) => n + t.capacity, 0);
    return { seated, seatedSeats, capacity, unseated: unassigned.length };
  }, [tables, unassigned]);

  const view = useMemo(
    () => buildRosterView(tables, unassigned, { query: debouncedSearch, filter }),
    [tables, unassigned, debouncedSearch, filter]
  );

  const selecting = selectedIds.size > 0;

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
      <div className={cn(themeConfig.card, 'space-y-3')}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a guest or table…"
              aria-label="Find a guest or table"
              className={cn(themeConfig.input, 'pl-9')}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setCompact((v) => !v)}
            aria-pressed={compact}
            title="Tighter rows, so more tables fit on screen"
            className={cn(
              'flex items-center gap-1 rounded-lg px-3 py-2 text-sm pointer-coarse:min-h-11',
              compact ? themeConfig.button.primary : themeConfig.button.secondary
            )}
          >
            <Rows3 className="h-4 w-4" />
            <span className="hidden sm:inline">Compact</span>
          </button>
          <button
            onClick={() => load()}
            className={cn(themeConfig.button.tertiary, 'flex-shrink-0 pointer-coarse:min-h-11')}
            aria-label="Reload roster"
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Filters: with two dozen tables, "which ones still have room?" is the
            question that decides where anyone goes. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-stone-300">
            {TABLE_FILTERS.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                title={option.hint}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors pointer-coarse:min-h-11',
                  filter === option.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <span className="flex flex-wrap items-center gap-2 text-sm lg:gap-3">
            <span
              className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1"
              title="Guests seated"
            >
              <Armchair className="h-4 w-4 text-emerald-600" />
              <strong>{stats.seated}</strong> seated
              <span className={themeConfig.text.muted}>({stats.seatedSeats} seats)</span>
            </span>
            <span
              className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1"
              title="Guests without a table"
            >
              <UserX className="h-4 w-4 text-amber-600" />
              <strong>{stats.unseated}</strong> not seated
            </span>
            <span
              className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1"
              title="Total seats across all tables"
            >
              <Users className="h-4 w-4 text-stone-500" />
              <strong>{stats.capacity}</strong> capacity
            </span>
          </span>
        </div>

        <p className={cn('text-xs', themeConfig.text.muted)}>
          Use the ⇄ button on anyone to move them — no dragging across the page. Tick several
          people (or a whole table) to move them together.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <UnassignedColumn
            guests={view.unassigned}
            hidden={view.hiddenUnassigned}
            onUnassignDrop={(id) => move(id, null)}
            onMoveGuest={(guest) => setMovingGuests([guest])}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            selecting={selecting}
            compact={compact}
          />
        </div>

        <div className="lg:col-span-3">
          {view.tables.length === 0 ? (
            <div className={cn(themeConfig.card, 'py-12 text-center')}>
              <p className={themeConfig.text.muted}>
                {tables.length === 0
                  ? 'No tables yet — create some in the Seating Chart tab.'
                  : `No tables match. ${view.hiddenTables} hidden by the search or filter.`}
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'grid grid-cols-1 gap-3 sm:grid-cols-2',
                  compact ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
                )}
              >
                {view.tables.map((tableView) => (
                  <TableCard
                    key={tableView.table.id}
                    view={tableView}
                    onDropGuest={(guestId, tableId) => move(guestId, tableId)}
                    onUnassign={(guestId) => move(guestId, null)}
                    onMoveGuest={(guest) => setMovingGuests([guest])}
                    onMoveTable={selectWholeTable}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    selecting={selecting}
                    compact={compact}
                  />
                ))}
              </div>
              {view.hiddenTables > 0 && (
                <p className={cn('pt-3 text-center text-xs', themeConfig.text.muted)}>
                  {view.hiddenTables} table{view.hiddenTables === 1 ? '' : 's'} hidden by the search
                  or filter.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bulk action bar. Sits above the fold of the page so a selection made
          at the bottom of a long roster is still actionable without scrolling
          back up. */}
      {selecting && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-safe">
          <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-emerald-700 bg-emerald-900 px-3 py-2.5 text-white shadow-2xl">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {describeSelection(selectedGuests)} selected
            </span>
            <button
              onClick={() => setMovingGuests(selectedGuests)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 pointer-coarse:min-h-11"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Move to…
            </button>
            <button
              onClick={() => moveMany(selectedGuests, null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 px-3 py-2 text-sm font-medium hover:bg-white/10 pointer-coarse:min-h-11"
            >
              <UserX className="h-4 w-4" />
              Unseat
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 pointer-coarse:h-11 pointer-coarse:w-11"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {movingGuests && movingGuests.length > 0 && (
        <MoveGuestsDialog
          guests={movingGuests}
          tables={tables}
          onAssign={(tableId) => {
            if (movingGuests.length === 1) move(movingGuests[0].id, tableId);
            else moveMany(movingGuests, tableId);
            setMovingGuests(null);
          }}
          onClose={() => setMovingGuests(null)}
        />
      )}
    </div>
  );
}
