import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SUGGESTIONS, scoreGuest, searchGuests } from './guest-search.ts';

const guests = [
  { name: 'Anna Marie' },
  { name: 'Anna Maria Russo' },
  { name: 'Joanna Ricci' },
  { name: 'Marie Anna' },
  { name: 'Peter Doyle' },
];

test('an empty term matches nothing', () => {
  assert.deepEqual(searchGuests('', guests), []);
  assert.deepEqual(searchGuests('   ', guests), []);
});

test('exact beats prefix beats substring', () => {
  assert.ok(scoreGuest('anna marie', 'Anna Marie') > scoreGuest('anna', 'Anna Marie'));
  assert.ok(scoreGuest('anna', 'Anna Marie') > scoreGuest('anna', 'Joanna Ricci'));
});

test('the best match is ranked first', () => {
  const [first] = searchGuests('anna marie', guests);
  assert.equal(first.name, 'Anna Marie');
});

test('a surname-first list still finds a first-name-first search', () => {
  const names = searchGuests('anna maria', guests).map((g) => g.name);
  assert.ok(names.includes('Anna Maria Russo'));
});

test('search is case and whitespace insensitive', () => {
  assert.equal(searchGuests('  PETER  ', guests)[0].name, 'Peter Doyle');
});

test('names that share nothing with the term are excluded', () => {
  assert.deepEqual(searchGuests('zzz', guests), []);
  assert.equal(scoreGuest('zzz', 'Peter Doyle'), 0);
});

test('results are capped so the dropdown stays usable', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ name: `Anna Guest ${i}` }));
  assert.equal(searchGuests('anna', many).length, MAX_SUGGESTIONS);
});
