import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDetailSheetRows, buildSummarySheetRows } from './seating-export.ts';
import type { Guest, Table } from './seating.ts';

const guest = (id: string, partySize = 1, extra: Partial<Guest> = {}): Guest => ({
  id,
  name: `Guest ${id}`,
  phoneNumber: null,
  address: null,
  partySize,
  tableId: null,
  ...extra,
});

const table = (id: string, capacity: number, guests: Guest[] = []): Table => ({
  id,
  name: `Table ${id}`,
  shape: 'round',
  capacity,
  positionX: 0,
  positionY: 0,
  rotation: 0,
  guests,
});

test('summary sheet totals capacity, seats used and guest counts across tables', () => {
  const t1 = table('1', 8, [guest('a', 3), guest('b', 1)]);
  const t2 = table('2', 4);
  const rows = buildSummarySheetRows([t2, t1], []);

  assert.deepEqual(rows[0], ['Table Name', 'Shape', 'Capacity', 'Seats Used', 'Seats Free', 'Guests Assigned']);
  // Sorted by name: "Table 1" before "Table 2".
  assert.deepEqual(rows[1], ['Table 1', 'round', 8, 4, 4, 2]);
  assert.deepEqual(rows[2], ['Table 2', 'round', 4, 0, 4, 0]);
  assert.deepEqual(rows[3], ['TOTAL', '', 12, 4, 8, 2]);
});

test('summary sheet appends an unassigned block only when there are unassigned guests', () => {
  const rows = buildSummarySheetRows([table('1', 4)], []);
  assert.equal(rows.length, 3); // header + table row + TOTAL, no unassigned block

  const withUnassigned = buildSummarySheetRows([table('1', 4)], [guest('u', 2)]);
  assert.deepEqual(withUnassigned.at(-2), ['Unassigned guests', '', '', '', '', 1]);
  assert.deepEqual(withUnassigned.at(-1), ['Unassigned seats needed', '', '', '', '', 2]);
});

test('detail sheet lists one row per guest, only labelling the table on its first row', () => {
  const t = table('1', 8, [guest('b', 1), guest('a', 2)]);
  const rows = buildDetailSheetRows([t], []);

  assert.deepEqual(rows[0], ['Table Name', 'Table Shape', 'Capacity', 'Seats Used', 'Guest Name', 'Party Size', 'Phone Number', 'Address']);
  // Guests sorted by name within the table: "Guest a" before "Guest b".
  assert.deepEqual(rows[1], ['Table 1', 'round', 8, 3, 'Guest a', 2, '', '']);
  assert.deepEqual(rows[2], ['', '', '', '', 'Guest b', 1, '', '']);
});

test('detail sheet marks an empty table rather than omitting it', () => {
  const rows = buildDetailSheetRows([table('1', 4)], []);
  assert.deepEqual(rows[1], ['Table 1', 'round', 4, 0, '(No guests assigned)', '', '', '']);
});

test('detail sheet neutralises formula-injection guest fields', () => {
  const rows = buildDetailSheetRows([], [guest('x', 1, { name: '=HYPERLINK("http://evil")' })]);
  const unassignedRow = rows.find((r) => r[4] && String(r[4]).includes('HYPERLINK'));
  assert.equal(unassignedRow?.[4], '\'=HYPERLINK("http://evil")');
});
