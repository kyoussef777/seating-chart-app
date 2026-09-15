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
  /** Size override in px. Null until someone resizes the table, at which
   *  point it stops tracking the shape's default. */
  width?: number | null;
  height?: number | null;
  /** Key into TABLE_COLORS. Null = the theme's default table styling. */
  color?: string | null;
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

/** Every shape the UI offers. The API validates against this same list: it
 *  used to allow only round and rectangular, so choosing any other shape in
 *  the Add Table dialog silently created a round table. */
export const TABLE_SHAPES = [
  'round',
  'rectangular',
  'square',
  'oval',
  'u-shape',
  'cocktail',
] as const;

export type TableShape = (typeof TABLE_SHAPES)[number];

export function isTableShape(value: unknown): value is TableShape {
  return typeof value === 'string' && (TABLE_SHAPES as readonly string[]).includes(value);
}

/** Human labels for the shape picker, kept beside the list so adding a shape
 *  is one edit rather than three. */
export const TABLE_SHAPE_LABELS: Record<TableShape, string> = {
  round: 'Round',
  rectangular: 'Rectangular',
  square: 'Square',
  oval: 'Oval',
  'u-shape': 'U-Shape',
  cocktail: 'Cocktail',
};

/** Seats a shape usually holds, used to prefill the capacity field. */
export const DEFAULT_TABLE_CAPACITY: Record<TableShape, number> = {
  round: 8,
  rectangular: 10,
  square: 6,
  oval: 12,
  'u-shape': 16,
  cocktail: 4,
};

export const TABLE_CAPACITY_MIN = 1;
export const TABLE_CAPACITY_MAX = 50;

/** Resize limits for a table, in px. */
export const TABLE_MIN_SIZE = 60;
export const TABLE_MAX_SIZE = 600;

/** Accent colours a table can be tinted with, so an organiser can group
 *  tables by family, course or room without reading every name. */
export const TABLE_COLORS: Record<string, { label: string; border: string; bg: string; dot: string }> = {
  emerald: { label: 'Emerald', border: '#059669', bg: '#ffffff', dot: '#059669' },
  slate: { label: 'Slate', border: '#475569', bg: '#f8fafc', dot: '#475569' },
  rose: { label: 'Rose', border: '#e11d48', bg: '#fff1f2', dot: '#e11d48' },
  amber: { label: 'Amber', border: '#d97706', bg: '#fffbeb', dot: '#d97706' },
  violet: { label: 'Violet', border: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed' },
  sky: { label: 'Sky', border: '#0284c7', bg: '#f0f9ff', dot: '#0284c7' },
  teal: { label: 'Teal', border: '#0d9488', bg: '#f0fdfa', dot: '#0d9488' },
};

const SHAPE_DEFAULT_SIZE: Record<TableShape, { width: number; height: number; isCircular: boolean }> = {
  round: { width: 140, height: 140, isCircular: true },
  square: { width: 120, height: 120, isCircular: false },
  rectangular: { width: 180, height: 100, isCircular: false },
  oval: { width: 160, height: 100, isCircular: true },
  'u-shape': { width: 200, height: 140, isCircular: false },
  cocktail: { width: 80, height: 80, isCircular: true },
};

/**
 * Footprint of a table on the floor plan.
 *
 * `size` carries a table's own width/height override; either side may be null,
 * in which case that side falls back to the shape's default. Everything that
 * positions, clamps or hit-tests a table goes through here, so a resized table
 * is bounded by its real footprint rather than its shape's stock one.
 */
export function getTableDimensions(
  shape: string,
  size?: { width?: number | null; height?: number | null } | null
) {
  const base = SHAPE_DEFAULT_SIZE[shape as TableShape] ?? SHAPE_DEFAULT_SIZE.round;
  const width = size?.width != null && size.width > 0 ? size.width : base.width;
  const height = size?.height != null && size.height > 0 ? size.height : base.height;
  return { width, height, isCircular: base.isCircular };
}

/** The stock footprint for a shape, ignoring any override — what "reset size"
 *  goes back to. */
export function getDefaultTableDimensions(shape: string) {
  return getTableDimensions(shape, null);
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

/** Floor-plan size limits for the configurable edit zone. */
export const CANVAS_MIN = 400;
export const CANVAS_MAX = 6000;

export interface CanvasSize {
  width: number;
  height: number;
}

export const DEFAULT_CANVAS: CanvasSize = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

/** Keep an arbitrary box fully inside the floor plan. */
export function clampBox(
  x: number,
  y: number,
  width: number,
  height: number,
  bounds: CanvasSize = DEFAULT_CANVAS
) {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, bounds.width - width)),
    y: Math.min(Math.max(0, y), Math.max(0, bounds.height - height)),
  };
}

/** Keep a table fully inside the floor plan. */
export function clampToCanvas(
  x: number,
  y: number,
  shape: string,
  bounds: CanvasSize = DEFAULT_CANVAS,
  size?: { width?: number | null; height?: number | null } | null
) {
  const { width, height } = getTableDimensions(shape, size);
  return clampBox(x, y, width, height, bounds);
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
    width: t.width ?? null,
    height: t.height ?? null,
    color: t.color ?? null,
    guests: (byTable.get(t.id) || []).sort(byName),
  }));

  return { tables, unassigned: unassigned.sort(byName) };
}

/** Fetch tables + guests and return them already grouped. */
export async function fetchSeating() {
  const [tablesRes, guestsRes] = await Promise.all([fetch('/api/tables'), fetch('/api/guests')]);
  const [tablesData, guestsData] = await Promise.all([tablesRes.json(), guestsRes.json()]);
  if (!tablesRes.ok || !guestsRes.ok) throw new Error('Failed to load seating data');
  return groupGuests(tablesData.tables ?? [], guestsData.guests ?? []);
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
