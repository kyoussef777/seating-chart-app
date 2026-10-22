import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitFontSize, longestBalancedLine, splitCouple } from './display-text.ts';

test('a single line is the whole text', () => {
  assert.equal(longestBalancedLine('Our Wedding Day', 1), 15);
});

test('wrapping balances the lines rather than filling the first', () => {
  // Filling greedily at 15 would give "one two three" / "four".
  assert.equal(longestBalancedLine('one two three four', 2), 10); // "one two" / "three four"
  assert.equal(longestBalancedLine('Our Wedding Day', 2), 11); // "Our Wedding" / "Day"
});

test('the longest word is a floor wrapping cannot get under', () => {
  assert.equal(longestBalancedLine('Supercalifragilistic is', 3), 20);
});

test('blank text has no width', () => {
  assert.equal(longestBalancedLine('   ', 2), 0);
});

test('extra whitespace does not count as characters', () => {
  assert.equal(longestBalancedLine('  Mira    Kamal ', 1), 10);
});

test('couples split on &, + and "and"', () => {
  assert.deepEqual(splitCouple('Mira & Kamal'), { first: 'Mira', joiner: '&', second: 'Kamal' });
  assert.deepEqual(splitCouple('Ann and Bob Smith'), { first: 'Ann', joiner: 'and', second: 'Bob Smith' });
  assert.deepEqual(splitCouple('Ann AND Bob'), { first: 'Ann', joiner: 'AND', second: 'Bob' });
  assert.deepEqual(splitCouple('Ann + Bob'), { first: 'Ann', joiner: '+', second: 'Bob' });
});

test('names that merely contain "and" are not split', () => {
  assert.equal(splitCouple('Sandy Anderson'), null);
  assert.equal(splitCouple('Our Wedding Day'), null);
});

test('more than one joiner, or a dangling one, is not a couple', () => {
  assert.equal(splitCouple('Ann & Bob & Cy'), null);
  assert.equal(splitCouple('& Bob'), null);
  assert.equal(splitCouple('Ann &'), null);
});

test('fitFontSize sizes against the longest piece', () => {
  const options = { maxLines: 1, charEm: 0.5, maxPx: 40, minPx: 20 };
  assert.equal(fitFontSize('abcd', options), 'clamp(20px, calc(100cqi / 2), 40px)');
  assert.equal(fitFontSize(['ab', 'abcdefgh'], options), 'clamp(20px, calc(100cqi / 4), 40px)');
});

test('fitFontSize never divides by zero', () => {
  const size = fitFontSize('', { maxLines: 2, charEm: 0.8, maxPx: 40, minPx: 20 });
  assert.equal(size, 'clamp(20px, calc(100cqi / 0.8), 40px)');
});
