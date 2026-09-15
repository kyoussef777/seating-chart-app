import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMoveOptions,
  buildRosterView,
  canFitAll,
  describeSelection,
  naturalCompare,
  planBulkMove,
  seatsFreeFor,
  seatsNeeded,
  sortTablesByName,
} from './roster.ts';
import type { Guest, Table } from './seating.ts';

const guest = (id: string, name: string, partySize = 1, tableId: string | null = null): Guest => ({
  id,
  name,
  phoneNumber: null,
  address: null,
  partySize,
  tableId,
});

const table = (id: string, name: string, capacity: number, guests: Guest[] = []): Table => ({
  id,
  name,
  shape: 'round',
  capacity,
  positionX: 0,
  positionY: 0,
  rotation: 0,
  guests,
});

/* ---- ordering ---------------------------------------------------------- */

// Regression: a plain compare puts "Table 10" straight after "Table 1", which
// is what makes a two-dozen-table roster hard to scan.
test('tables sort the way a person reads them', () => {
  const names = ['Table 10', 'Table 2', 'Table 1', 'Head Table', 'Table 21'];
  assert.deepEqual(
    sortTablesByName(names.map((n, i) => table(`t${i}`, n, 8))).map((t) => t.name),
    ['Head Table', 'Table 1', 'Table 2', 'Table 10', 'Table 21']
  );
});

test('naturalCompare is case insensitive and number aware', () => {
  assert.ok(naturalCompare('table 2', 'Table 10') < 0);
  assert.equal(naturalCompare('Table 3', 'table 3'), 0);
});

/* ---- seat maths -------------------------------------------------------- */

test('seatsNeeded counts whole parties', () => {
  assert.equal(seatsNeeded([guest('a', 'A', 3), guest('b', 'B', 1)]), 4);
  assert.equal(seatsNeeded([]), 0);
});

// Regression: a guest already at the target must not be counted against it,
// or moving someone within their own table reads as over capacity.
test('seatsFreeFor discounts the guests being moved', () => {
  const seated = guest('a', 'A', 4, 't1');
  const t = table('t1', 'Table 1', 8, [seated, guest('b', 'B', 2, 't1')]);
  assert.equal(seatsFreeFor(t, []), 2);
  assert.equal(seatsFreeFor(t, [seated]), 6);
});

test('canFitAll treats the selection as one group', () => {
  const t = table('t1', 'Table 1', 8, [guest('x', 'X', 5, 't1')]);
  assert.equal(canFitAll(t, [guest('a', 'A', 2)]), true);
  assert.equal(canFitAll(t, [guest('a', 'A', 2), guest('b', 'B', 2)]), false);
});

/* ---- the roster view --------------------------------------------------- */

const roster = () => {
  const g1 = guest('g1', 'Priya Sharma', 1, 't1');
  const g2 = guest('g2', 'Omar Khalil', 2, 't1');
  const g3 = guest('g3', 'Zara Cohen', 1, 't2');
  return {
    tables: [
      table('t2', 'Table 10', 8, [g3]),
      table('t1', 'Table 2', 4, [g1, g2]),
      table('t3', 'Table 3', 6, []),
    ],
    unassigned: [guest('g4', 'Hugo Rossi', 1), guest('g5', 'Priya Nair', 3)],
  };
};

test('the roster view sorts naturally and reports seats', () => {
  const { tables, unassigned } = roster();
  const view = buildRosterView(tables, unassigned);
  assert.deepEqual(view.tables.map((t) => t.table.name), ['Table 2', 'Table 3', 'Table 10']);
  assert.equal(view.tables[0].used, 3);
  assert.equal(view.tables[0].free, 1);
  assert.equal(view.unassigned.length, 2);
});

// Searching has to narrow what is inside a card, not merely tint it: a
// highlight buried in a full table does not answer "where is Priya?".
test('a search narrows tables down to the matching guests', () => {
  const { tables, unassigned } = roster();
  const view = buildRosterView(tables, unassigned, { query: 'priya' });
  assert.deepEqual(view.tables.map((t) => t.table.name), ['Table 2']);
  assert.deepEqual(view.tables[0].guests.map((g) => g.name), ['Priya Sharma']);
  assert.equal(view.tables[0].hiddenGuests, 1);
  assert.deepEqual(view.unassigned.map((g) => g.name), ['Priya Nair']);
  assert.equal(view.hiddenTables, 2);
});

test('searching a table name shows everyone at that table', () => {
  const { tables, unassigned } = roster();
  const view = buildRosterView(tables, unassigned, { query: 'Table 2' });
  assert.equal(view.tables.length, 1);
  assert.equal(view.tables[0].guests.length, 2);
  assert.equal(view.tables[0].hiddenGuests, 0);
  assert.equal(view.tables[0].matchesQuery, true);
});

test('filters narrow to tables with room, full ones, or empty ones', () => {
  const { tables, unassigned } = roster();
  const withRoom = buildRosterView(tables, unassigned, { filter: 'space' });
  assert.deepEqual(withRoom.tables.map((t) => t.table.name), ['Table 2', 'Table 3', 'Table 10']);

  const full = buildRosterView(
    [table('t1', 'Table 1', 2, [guest('a', 'A', 2, 't1')]), table('t2', 'Table 2', 8)],
    [],
    { filter: 'full' }
  );
  assert.deepEqual(full.tables.map((t) => t.table.name), ['Table 1']);

  const empty = buildRosterView(tables, unassigned, { filter: 'empty' });
  assert.deepEqual(empty.tables.map((t) => t.table.name), ['Table 3']);
  assert.equal(empty.hiddenTables, 2);
});

test('a search that matches nothing returns nothing, and says how much it hid', () => {
  const { tables, unassigned } = roster();
  const view = buildRosterView(tables, unassigned, { query: 'nobody' });
  assert.equal(view.tables.length, 0);
  assert.equal(view.hiddenTables, 3);
  assert.equal(view.hiddenUnassigned, 2);
});

/* ---- the move picker --------------------------------------------------- */

test('move options put the tables that fit first, snuggest first', () => {
  const tables = [
    table('t1', 'Table 1', 10, []), // 10 free
    table('t2', 'Table 2', 4, [guest('x', 'X', 1, 't2')]), // 3 free
    table('t3', 'Table 3', 8, [guest('y', 'Y', 6, 't3')]), // 2 free
  ];
  const options = buildMoveOptions(tables, [guest('m', 'Mover', 2)]);
  assert.deepEqual(options.withRoom.map((o) => o.table.name), ['Table 3', 'Table 2', 'Table 1']);
  assert.equal(options.full.length, 0);
});

test('tables that cannot take the group are listed, not hidden', () => {
  const tables = [table('t1', 'Table 1', 4, [guest('x', 'X', 4, 't1')])];
  const options = buildMoveOptions(tables, [guest('m', 'Mover', 2)]);
  assert.equal(options.withRoom.length, 0);
  assert.deepEqual(options.full.map((o) => o.table.name), ['Table 1']);
  assert.equal(options.full[0].free, 0);
});

test('the group current table is separated out, not offered as a move', () => {
  const seated = guest('m', 'Mover', 2, 't1');
  const tables = [table('t1', 'Table 1', 8, [seated]), table('t2', 'Table 2', 8, [])];
  const options = buildMoveOptions(tables, [seated]);
  assert.equal(options.current?.table.name, 'Table 1');
  assert.deepEqual(options.withRoom.map((o) => o.table.name), ['Table 2']);
});

test('a group spread across tables has no single current table', () => {
  const a = guest('a', 'A', 1, 't1');
  const b = guest('b', 'B', 1, 't2');
  const tables = [table('t1', 'Table 1', 8, [a]), table('t2', 'Table 2', 8, [b])];
  const options = buildMoveOptions(tables, [a, b]);
  assert.equal(options.current, null);
  assert.equal(options.withRoom.length, 2);
});

test('the move picker can be searched by table name', () => {
  const tables = [table('t1', 'Head Table', 8), table('t2', 'Table 4', 8)];
  const options = buildMoveOptions(tables, [guest('m', 'M', 1)], 'head');
  assert.deepEqual(options.withRoom.map((o) => o.table.name), ['Head Table']);
});

/* ---- bulk moves -------------------------------------------------------- */

test('a bulk move reports who fits and who does not', () => {
  const t = table('t1', 'Table 1', 8, [guest('x', 'X', 4, 't1')]); // 4 free
  const plan = planBulkMove(t, [guest('a', 'A', 3), guest('b', 'B', 1), guest('c', 'C', 2)]);
  // Smallest first: B(1) and C(2) both get in, rather than A(3) taking the
  // space alone and blocking them.
  assert.deepEqual(plan.accepted.map((g) => g.name).sort(), ['B', 'C']);
  assert.deepEqual(plan.rejected.map((g) => g.name), ['A']);
});

test('a bulk move that fits entirely rejects nobody', () => {
  const t = table('t1', 'Table 1', 8, []);
  const plan = planBulkMove(t, [guest('a', 'A', 3), guest('b', 'B', 2)]);
  assert.equal(plan.accepted.length, 2);
  assert.equal(plan.rejected.length, 0);
});

test('describeSelection mentions seats only when they differ from heads', () => {
  assert.equal(describeSelection([guest('a', 'A')]), '1 guest');
  assert.equal(describeSelection([guest('a', 'A'), guest('b', 'B')]), '2 guests');
  assert.equal(describeSelection([guest('a', 'A', 3), guest('b', 'B')]), '2 guests · 4 seats');
});
