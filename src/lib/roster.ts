/**
 * Roster logic: finding, filtering and ordering tables when there are a lot of
 * them, and working out what a move would cost.
 *
 * Pure and DOM-free so it can be unit tested. The roster's job is answering
 * "where is this person, and where can they go instead" without making the
 * organiser scroll three screens and drag.
 */

import { seatsUsed, type Guest, type Table } from './seating.ts';

/**
 * Compare names the way a person reads them, so "Table 2" sorts before
 * "Table 10". A plain locale compare puts "Table 10" second, which is exactly
 * the ordering that makes a 24-table roster hard to scan.
 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortTablesByName<T extends { name: string }>(tables: T[]): T[] {
  return [...tables].sort((x, y) => naturalCompare(x.name, y.name));
}

/** Total seats a set of guests occupies, counting whole parties. */
export function seatsNeeded(guests: Guest[]): number {
  return guests.reduce((total, g) => total + (g.partySize || 1), 0);
}

/**
 * Seats left at a table once the guests being moved are discounted.
 *
 * Anyone in `moving` who already sits here is not counted against the table:
 * moving them "to" their own table is a no-op, and counting them twice makes
 * every such move look over capacity.
 */
export function seatsFreeFor(table: Table, moving: Guest[]): number {
  const movingIds = new Set(moving.map((g) => g.id));
  return table.capacity - seatsUsed(table.guests.filter((g) => !movingIds.has(g.id)));
}

/** Whether every guest being moved fits at the table, as one group. */
export function canFitAll(table: Table, moving: Guest[]): boolean {
  return seatsFreeFor(table, moving) >= seatsNeeded(moving);
}

export type TableFilter = 'all' | 'space' | 'full' | 'empty';

export const TABLE_FILTERS: Array<{ id: TableFilter; label: string; hint: string }> = [
  { id: 'all', label: 'All', hint: 'Every table' },
  { id: 'space', label: 'Has room', hint: 'Tables with a free seat' },
  { id: 'full', label: 'Full', hint: 'Tables with no free seats' },
  { id: 'empty', label: 'Empty', hint: 'Tables with nobody seated' },
];

export interface RosterTableView {
  table: Table;
  /** Guests to show — the search narrows this, it does not just highlight. */
  guests: Guest[];
  /** How many of the table's guests the search hid. */
  hiddenGuests: number;
  used: number;
  free: number;
  matchesQuery: boolean;
}

export interface RosterView {
  tables: RosterTableView[];
  unassigned: Guest[];
  hiddenUnassigned: number;
  /** Tables the filter or search removed, so the UI can say so. */
  hiddenTables: number;
}

function matches(text: string, query: string) {
  return text.toLowerCase().includes(query);
}

/**
 * The roster as it should be shown.
 *
 * Searching narrows what is inside each table rather than only highlighting
 * it: with two dozen tables, "which card was Priya in again?" is the question,
 * and a highlight buried in a full card does not answer it.
 */
export function buildRosterView(
  tables: Table[],
  unassigned: Guest[],
  options: { query?: string; filter?: TableFilter } = {}
): RosterView {
  const query = (options.query ?? '').trim().toLowerCase();
  const filter = options.filter ?? 'all';
  const sorted = sortTablesByName(tables);

  const views: RosterTableView[] = [];
  let hiddenTables = 0;

  for (const table of sorted) {
    const used = seatsUsed(table.guests);
    const free = table.capacity - used;

    const passesFilter =
      filter === 'all' ||
      (filter === 'space' && free > 0) ||
      (filter === 'full' && free <= 0) ||
      (filter === 'empty' && table.guests.length === 0);

    const tableMatches = query.length === 0 || matches(table.name, query);
    const matching = query.length === 0 ? table.guests : table.guests.filter((g) => matches(g.name, query));
    // A table earns its place if its own name matches, or someone at it does.
    const passesQuery = query.length === 0 || tableMatches || matching.length > 0;

    if (!passesFilter || !passesQuery) {
      hiddenTables += 1;
      continue;
    }

    // When the table name itself matched, show everyone at it: the organiser
    // asked for that table, not for a filtered slice of it.
    const guests = query.length === 0 || tableMatches ? table.guests : matching;

    views.push({
      table,
      guests,
      hiddenGuests: table.guests.length - guests.length,
      used,
      free,
      matchesQuery: query.length > 0 && tableMatches,
    });
  }

  const visibleUnassigned =
    query.length === 0 ? unassigned : unassigned.filter((g) => matches(g.name, query));

  return {
    tables: views,
    unassigned: visibleUnassigned,
    hiddenUnassigned: unassigned.length - visibleUnassigned.length,
    hiddenTables,
  };
}

export interface MoveOption {
  table: Table;
  free: number;
  fits: boolean;
  /** Every guest being moved already sits here, so choosing it changes nothing. */
  isCurrent: boolean;
}

export interface MoveOptions {
  /** Tables that can take the whole group, best first. */
  withRoom: MoveOption[];
  /** Tables that cannot, kept visible so the organiser can see why. */
  full: MoveOption[];
  /** Where the group sits now, when they all share a table. */
  current: MoveOption | null;
}

/**
 * Tables to offer when moving one or more guests.
 *
 * Ordered so the answer is usually the first thing on screen: tables that fit
 * the group come first, snuggest fit first — filling a table with exactly the
 * right gap beats scattering a party across half-empty ones. Tables that do
 * not fit are still listed, disabled, rather than silently missing.
 */
export function buildMoveOptions(
  tables: Table[],
  moving: Guest[],
  query = ''
): MoveOptions {
  const q = query.trim().toLowerCase();
  const need = seatsNeeded(moving);
  const movingIds = new Set(moving.map((g) => g.id));
  const currentIds = new Set(moving.map((g) => g.tableId));
  const sharedTableId = currentIds.size === 1 ? [...currentIds][0] : null;

  const options: MoveOption[] = sortTablesByName(tables)
    .filter((table) => q.length === 0 || matches(table.name, q))
    .map((table) => {
      const free = seatsFreeFor(table, moving);
      return {
        table,
        free,
        fits: free >= need,
        isCurrent: table.id === sharedTableId && moving.every((g) => movingIds.has(g.id)),
      };
    });

  const withRoom = options
    .filter((o) => o.fits && !o.isCurrent)
    // Snuggest fit first, then by name for a stable, scannable order.
    .sort((a, b) => a.free - b.free || naturalCompare(a.table.name, b.table.name));

  return {
    withRoom,
    full: options.filter((o) => !o.fits && !o.isCurrent),
    current: options.find((o) => o.isCurrent) ?? null,
  };
}

/** "3 guests · 5 seats", for a bulk action bar. */
export function describeSelection(guests: Guest[]): string {
  const seats = seatsNeeded(guests);
  const people = `${guests.length} guest${guests.length === 1 ? '' : 's'}`;
  return seats === guests.length ? people : `${people} · ${seats} seats`;
}

/**
 * Split a bulk move into the guests that can go and the ones that cannot,
 * so a partially-possible move reports honestly instead of half-failing.
 */
export function planBulkMove(
  table: Table,
  moving: Guest[]
): { accepted: Guest[]; rejected: Guest[] } {
  let remaining = seatsFreeFor(table, moving);
  const accepted: Guest[] = [];
  const rejected: Guest[] = [];
  // Smallest parties first, so a single large party cannot block several
  // small ones that would all have fitted.
  for (const guest of [...moving].sort((a, b) => (a.partySize || 1) - (b.partySize || 1))) {
    const need = guest.partySize || 1;
    if (need <= remaining) {
      accepted.push(guest);
      remaining -= need;
    } else {
      rejected.push(guest);
    }
  }
  return { accepted, rejected };
}
