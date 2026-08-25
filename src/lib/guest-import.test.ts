import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGuestCsv } from './guest-import.ts';

// Regression: the old header transform rewrote every header containing "name"
// to `name`, so First Name and Last Name collapsed onto one key and one was lost.
test('combines First Name and Last Name instead of dropping one', () => {
  const { guests, mapping } = parseGuestCsv(
    'First Name,Last Name,Email\nAmira,Botros,a@x.com\nBoutros,Hanna,b@x.com'
  );
  assert.deepEqual(guests.map((g) => g.name), ['Amira Botros', 'Boutros Hanna']);
  assert.equal(mapping.firstName, 'First Name');
  assert.equal(mapping.lastName, 'Last Name');
});

// Regression: "Number of Guests" matched the old `includes('number')` phone rule,
// so the party count was written into the phone column.
test('Number of Guests is a party size, not a phone number', () => {
  const { guests, mapping } = parseGuestCsv('Name,Number of Guests\nAmira Botros,4');
  assert.equal(guests[0].partySize, 4);
  assert.equal(guests[0].phoneNumber, null);
  assert.equal(mapping.partySize, 'Number of Guests');
});

test('a single Name column still works', () => {
  const { guests } = parseGuestCsv('Name,Phone\nCarine Fahmy,555-1234');
  assert.equal(guests[0].name, 'Carine Fahmy');
  assert.equal(guests[0].phoneNumber, '555-1234');
});

test('exact match wins so "Name" does not steal "First Name"', () => {
  const { guests } = parseGuestCsv('Name,First Name\nFull Person,Ignored');
  // First/Last pair is preferred when present, else the full name column.
  assert.equal(guests[0].name, 'Ignored');
});

test('additional guests counts as extra people, so party = n + 1', () => {
  const { guests, mapping } = parseGuestCsv('Name,Additional Guests\nDaniel Rizk,3');
  assert.equal(guests[0].partySize, 4);
  assert.match(mapping.partySize, /\+1/);
});

test('party size defaults to 1 and is clamped to a sane range', () => {
  assert.equal(parseGuestCsv('Name\nSolo Guest').guests[0].partySize, 1);
  assert.equal(parseGuestCsv('Name,Party Size\nA,0').guests[0].partySize, 1);
  assert.equal(parseGuestCsv('Name,Party Size\nA,999').guests[0].partySize, 20);
  assert.equal(parseGuestCsv('Name,Party Size\nA,').guests[0].partySize, 1);
});

test('rows without any name are reported, not silently dropped', () => {
  const { guests, invalidRows } = parseGuestCsv('Name,Party Size\nReal Guest,2\n,3');
  assert.equal(guests.length, 1);
  assert.equal(invalidRows.length, 1);
  assert.equal(invalidRows[0].row, 3); // header is row 1
});

test('quoted addresses containing commas survive', () => {
  const { guests } = parseGuestCsv('Name,Mailing Address\nA Guest,"12 Main St, Apt 4, NY"');
  assert.equal(guests[0].address, '12 Main St, Apt 4, NY');
});

// Regression: a loose name matcher fell through onto "Number of Guests" and
// imported the count as a guest called "2".
test('a count column is never used as a fallback name', () => {
  const { guests, invalidRows, mapping } = parseGuestCsv(
    'First Name,Last Name,Number of Guests\nAmira,Botros,2\n,,3'
  );
  assert.deepEqual(guests.map((g) => g.name), ['Amira Botros']);
  assert.equal(invalidRows.length, 1);
  assert.equal(mapping.name, undefined);
  assert.equal(mapping.partySize, 'Number of Guests');
});
