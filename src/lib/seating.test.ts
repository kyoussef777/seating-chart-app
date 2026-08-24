import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  canSeat,
  clampToCanvas,
  groupGuests,
  seatsAvailable,
  seatsUsed,
  type Guest,
  type GuestDragItem,
  type Table,
} from './seating.ts';

const guest = (id: string, partySize = 1, tableId: string | null = null): Guest => ({
  id,
  name: `Guest ${id}`,
  phoneNumber: null,
  address: null,
  partySize,
  tableId,
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

const drag = (g: Guest): GuestDragItem => ({
  id: g.id,
  type: 'guest',
  fromTableId: g.tableId,
  partySize: g.partySize,
  name: g.name,
});

test('seats count whole parties, not head count', () => {
  assert.equal(seatsUsed([guest('a', 3), guest('b', 1)]), 4);
});

// Regression: a guest already seated at the target must not be counted against
// the space they are moving into, or every move looks over-capacity.
test('seatsAvailable excludes the guest being moved', () => {
  const seated = guest('a', 4, 't1');
  const t = table('t1', 8, [seated, guest('b', 2, 't1')]);
  assert.equal(seatsAvailable(t), 2);
  assert.equal(seatsAvailable(t, 'a'), 6);
});

test('canSeat allows a move that fits and blocks one that does not', () => {
  const mover = guest('m', 3, 't1');
  assert.equal(canSeat(table('t2', 4, [guest('x', 1, 't2')]), drag(mover)), true);
  assert.equal(canSeat(table('t3', 4, [guest('y', 2, 't3')]), drag(mover)), false);
});

test('canSeat refuses a drop onto the table the guest already sits at', () => {
  const seated = guest('a', 1, 't1');
  const t = table('t1', 10, [seated]);
  assert.equal(canSeat(t, drag(seated)), false);
});

test('a full table still accepts a guest already sitting there being counted out', () => {
  const seated = guest('a', 2, 't1');
  const t = table('t1', 2, [seated]);
  // No free seats for anyone new...
  assert.equal(canSeat(t, drag(guest('new', 1))), false);
  // ...but the occupant's own seats are not double counted.
  assert.equal(seatsAvailable(t, 'a'), 2);
});

test('clampToCanvas keeps a table fully inside the floor plan', () => {
  const far = clampToCanvas(99999, 99999, 'round');
  assert.equal(far.x, CANVAS_WIDTH - 140);
  assert.equal(far.y, CANVAS_HEIGHT - 140);
  const neg = clampToCanvas(-500, -500, 'round');
  assert.deepEqual(neg, { x: 0, y: 0 });
});

test('groupGuests splits seated from unassigned', () => {
  const { tables, unassigned } = groupGuests(
    [table('t1', 8), table('t2', 8)],
    [guest('a', 1, 't1'), guest('b', 1, null), guest('c', 1, 't1')]
  );
  assert.equal(tables[0].guests.length, 2);
  assert.equal(tables[1].guests.length, 0);
  assert.deepEqual(unassigned.map((g) => g.id), ['b']);
});
