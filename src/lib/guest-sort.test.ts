import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryGuests, surname, type SortableGuest } from './guest-sort.ts';

const guest = (
  name: string,
  extra: Partial<SortableGuest> = {}
): SortableGuest => ({
  name,
  phoneNumber: null,
  address: null,
  partySize: 1,
  tableId: null,
  ...extra,
});

const tableName = (id: string | null) => (id ? { t1: 'Table 2', t2: 'Table 10' }[id] ?? '' : 'Unassigned');

test('surname takes the last word, and copes with one-word names', () => {
  assert.equal(surname('Jane Doe'), 'Doe');
  assert.equal(surname('  Mary  Anne  Smith '), 'Smith');
  assert.equal(surname('Cher'), 'Cher');
  assert.equal(surname('   '), '');
});

test('sorts by first name, last name and party size', () => {
  const guests = [guest('Zoe Adams', { partySize: 2 }), guest('Adam Zeller'), guest('mary Baker', { partySize: 4 })];

  assert.deepEqual(queryGuests(guests, { sort: 'first-name' }).map((g) => g.name), [
    'Adam Zeller',
    'mary Baker',
    'Zoe Adams',
  ]);
  assert.deepEqual(queryGuests(guests, { sort: 'last-name' }).map((g) => g.name), [
    'Zoe Adams',
    'mary Baker',
    'Adam Zeller',
  ]);
  assert.deepEqual(queryGuests(guests, { sort: 'party-size' }).map((g) => g.name), [
    'mary Baker',
    'Zoe Adams',
    'Adam Zeller',
  ]);
});

test('table sort is numeric and puts unassigned guests last', () => {
  const guests = [guest('C', { tableId: 't2' }), guest('B', { tableId: null }), guest('A', { tableId: 't1' })];
  assert.deepEqual(
    queryGuests(guests, { sort: 'table', tableName }).map((g) => g.name),
    ['A', 'C', 'B']
  );
});

test('filters by status, table and search together', () => {
  const guests = [
    guest('Jane Doe', { tableId: 't1', phoneNumber: '555-0100' }),
    guest('John Doe', { tableId: 't1' }),
    guest('Ada Lovelace', { address: '1 Analytical Way' }),
  ];

  assert.deepEqual(queryGuests(guests, { status: 'unassigned' }).map((g) => g.name), ['Ada Lovelace']);
  assert.deepEqual(queryGuests(guests, { status: 'missing-phone' }).map((g) => g.name), ['Ada Lovelace', 'John Doe']);
  assert.deepEqual(queryGuests(guests, { tableId: 't1' }).map((g) => g.name), ['Jane Doe', 'John Doe']);
  assert.deepEqual(queryGuests(guests, { search: 'analytical' }).map((g) => g.name), ['Ada Lovelace']);
  assert.deepEqual(queryGuests(guests, { search: '555' }).map((g) => g.name), ['Jane Doe']);
  assert.deepEqual(queryGuests(guests, { status: 'seated', search: 'doe', tableId: 't1' }).length, 2);
});

test('the source list is never reordered in place', () => {
  const guests = [guest('Zoe'), guest('Adam')];
  queryGuests(guests, { sort: 'first-name' });
  assert.deepEqual(guests.map((g) => g.name), ['Zoe', 'Adam']);
});
