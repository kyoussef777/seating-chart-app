/** Shared seating helpers used by both the chart and the roster views. */

export interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
  tableId: string | null;
}

export interface Table {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  positionX: number;
  positionY: number;
  rotation: number;
  guests: Guest[];
}

/** Item carried by a guest drag. fromTableId lets drop targets do capacity
 *  math without looking the guest up in state that may not contain them. */
export interface GuestDragItem {
  id: string;
  type: 'guest';
  fromTableId: string | null;
  partySize: number;
  name: string;
}

/** Floor-plan bounds. Grid, drop clamping and the minimap all derive from
 *  these, so there is no dead background outside the canvas. */
export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 1500;

export function getTableDimensions(shape: string) {
  switch (shape) {
    case 'round':
      return { width: 140, height: 140, isCircular: true };
    case 'square':
      return { width: 120, height: 120, isCircular: false };
    case 'rectangular':
      return { width: 180, height: 100, isCircular: false };
    case 'oval':
      return { width: 160, height: 100, isCircular: true };
    case 'u-shape':
      return { width: 200, height: 140, isCircular: false };
    case 'cocktail':
      return { width: 80, height: 80, isCircular: true };
    default:
      return { width: 140, height: 140, isCircular: true };
  }
}

/** Seats consumed by a set of guests, counting each guest's whole party. */
export function seatsUsed(guests: Guest[]): number {
  return guests.reduce((total, g) => total + (g.partySize || 1), 0);
}

/** Seats a table has left, ignoring `excludeGuestId` (the guest being moved,
 *  who may already be sitting there). */
export function seatsAvailable(table: Table, excludeGuestId?: string): number {
  const used = seatsUsed(table.guests.filter((g) => g.id !== excludeGuestId));
  return table.capacity - used;
}

/** Whether a dragged guest can land on a table. Used for canDrop so an
 *  over-capacity drop is refused rather than accepted then rejected. */
export function canSeat(table: Table, item: GuestDragItem): boolean {
  if (item.fromTableId === table.id) return false; // already here
  return seatsAvailable(table, item.id) >= (item.partySize || 1);
}

/** Keep a table fully inside the floor plan. */
export function clampToCanvas(x: number, y: number, shape: string) {
  const { width, height } = getTableDimensions(shape);
  return {
    x: Math.min(Math.max(0, x), CANVAS_WIDTH - width),
    y: Math.min(Math.max(0, y), CANVAS_HEIGHT - height),
  };
}

/** Split a flat guest list onto its tables. Single source of truth for the
 *  shape both views render from. */
export function groupGuests(rawTables: Table[], guests: Guest[]) {
  const byTable = new Map<string, Guest[]>();
  const unassigned: Guest[] = [];

  for (const guest of guests) {
    if (guest.tableId) {
      const list = byTable.get(guest.tableId);
      if (list) list.push(guest);
      else byTable.set(guest.tableId, [guest]);
    } else {
      unassigned.push(guest);
    }
  }

  const byName = (a: Guest, b: Guest) => a.name.localeCompare(b.name);
  const tables = rawTables.map((t) => ({
    ...t,
    rotation: t.rotation || 0,
    guests: (byTable.get(t.id) || []).sort(byName),
  }));

  return { tables, unassigned: unassigned.sort(byName) };
}

/** Fetch tables + guests and return them already grouped. */
export async function fetchSeating() {
  const [tablesRes, guestsRes] = await Promise.all([fetch('/api/tables'), fetch('/api/guests')]);
  const [tablesData, guestsData] = await Promise.all([tablesRes.json(), guestsRes.json()]);
  if (!tablesRes.ok || !guestsRes.ok) throw new Error('Failed to load seating data');
  return groupGuests(tablesData.tables, guestsData.guests);
}

/** Move a guest to a table, or to null to unassign. Server re-validates
 *  capacity, so the returned error is authoritative. */
export async function persistAssignment(guestId: string, tableId: string | null) {
  const res = await fetch('/api/guests', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: guestId, tableId }),
  });
  if (res.ok) return { ok: true as const };
  const data = await res.json().catch(() => ({}));
  return { ok: false as const, error: data.error || 'Unknown error' };
}

/**
 * Neutralise spreadsheet formula injection.
 *
 * Excel/Sheets treat a leading =, +, -, @ (or tab/CR) as a formula, so an
 * attacker-supplied value such as `=HYPERLINK(...)` or a DDE payload executes
 * when the organiser opens an exported workbook. Prefixing with an apostrophe
 * forces the cell to be read as text.
 */
export function safeCell(value: unknown): string | number {
  if (typeof value === 'number') return value;
  const text = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}
