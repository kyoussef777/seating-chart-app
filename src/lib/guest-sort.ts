/** Sorting and filtering for the admin guest list. Pure, so the ordering
 *  rules can be tested without a browser. */

export interface SortableGuest {
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
  tableId: string | null;
}

export type GuestSort = 'first-name' | 'last-name' | 'table' | 'party-size';

export type GuestStatus = 'all' | 'seated' | 'unassigned' | 'missing-phone' | 'missing-address';

export const GUEST_SORTS: { value: GuestSort; label: string }[] = [
  { value: 'first-name', label: 'First name (A–Z)' },
  { value: 'last-name', label: 'Last name (A–Z)' },
  { value: 'table', label: 'Table' },
  { value: 'party-size', label: 'Party size (largest first)' },
];

export const GUEST_STATUSES: { value: GuestStatus; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'seated', label: 'Seated' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'missing-phone', label: 'Missing phone' },
  { value: 'missing-address', label: 'Missing address' },
];

// `numeric` so "Table 10" follows "Table 9"; `base` so case and accents do not
// split otherwise identical names.
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Last word of a name, which is the surname for the way guests are entered
 *  here ("Jane Doe", "Jane and John Doe"). A single word is its own surname. */
export function surname(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

export function compareGuests<T extends SortableGuest>(
  sort: GuestSort,
  tableName: (tableId: string | null) => string
): (a: T, b: T) => number {
  const byName = (a: T, b: T) => collator.compare(a.name, b.name);

  switch (sort) {
    case 'last-name':
      return (a, b) => collator.compare(surname(a.name), surname(b.name)) || byName(a, b);
    case 'party-size':
      return (a, b) => b.partySize - a.partySize || byName(a, b);
    case 'table':
      // Unassigned guests last: they are the work still to do, not table zero.
      return (a, b) => {
        if (!a.tableId !== !b.tableId) return a.tableId ? -1 : 1;
        return collator.compare(tableName(a.tableId), tableName(b.tableId)) || byName(a, b);
      };
    default:
      return byName;
  }
}

function matchesStatus(guest: SortableGuest, status: GuestStatus): boolean {
  switch (status) {
    case 'seated':
      return guest.tableId !== null;
    case 'unassigned':
      return guest.tableId === null;
    case 'missing-phone':
      return !guest.phoneNumber?.trim();
    case 'missing-address':
      return !guest.address?.trim();
    default:
      return true;
  }
}

function matchesSearch(guest: SortableGuest, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    guest.name.toLowerCase().includes(term) ||
    (guest.phoneNumber?.toLowerCase().includes(term) ?? false) ||
    (guest.address?.toLowerCase().includes(term) ?? false)
  );
}

export interface GuestQuery {
  search?: string;
  status?: GuestStatus;
  /** '' means any table. */
  tableId?: string;
  sort?: GuestSort;
  tableName?: (tableId: string | null) => string;
}

/** Filter then sort. The list is copied, so the caller's array is untouched. */
export function queryGuests<T extends SortableGuest>(guests: T[], query: GuestQuery = {}): T[] {
  const { search = '', status = 'all', tableId = '', sort = 'first-name' } = query;
  const tableName = query.tableName ?? ((id) => id ?? '');

  return guests
    .filter(
      (guest) =>
        matchesSearch(guest, search) &&
        matchesStatus(guest, status) &&
        (!tableId || guest.tableId === tableId)
    )
    .sort(compareGuests<T>(sort, tableName));
}
