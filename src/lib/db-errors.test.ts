import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMissingColumnError } from './db-errors.ts';

// The shape Neon/drizzle actually produced in production when the code shipped
// ahead of migration 0001: a wrapper error with the driver error as its cause.
test('a wrapped undefined_column error is recognised', () => {
  const cause = Object.assign(new Error('column "template" does not exist'), { code: '42703' });
  const wrapped = Object.assign(new Error('Failed query: select ...'), { cause });
  assert.equal(isMissingColumnError(wrapped), true);
});

test('an unwrapped undefined_column error is recognised', () => {
  assert.equal(
    isMissingColumnError(Object.assign(new Error('nope'), { code: '42703' })),
    true
  );
});

test('the message alone is enough when no code is attached', () => {
  assert.equal(isMissingColumnError(new Error('column "venue_name" does not exist')), true);
});

test('a nested cause chain is walked', () => {
  const root = Object.assign(new Error('boom'), { code: '42703' });
  const mid = Object.assign(new Error('mid'), { cause: root });
  assert.equal(isMissingColumnError(Object.assign(new Error('outer'), { cause: mid })), true);
});

// Anything else must keep bubbling: a connection failure is not something to
// paper over with template defaults.
test('other database and runtime errors are not treated as a missing column', () => {
  const connection = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
  assert.equal(isMissingColumnError(connection), false);
  assert.equal(isMissingColumnError(new Error('relation "event_settings" does not exist')), false);
  assert.equal(isMissingColumnError(Object.assign(new Error('x'), { code: '42P01' })), false);
  assert.equal(isMissingColumnError(null), false);
  assert.equal(isMissingColumnError(undefined), false);
  assert.equal(isMissingColumnError('column does not exist'), false);
});

test('a self-referencing cause chain terminates', () => {
  const loop: { message: string; cause?: unknown } = { message: 'loop' };
  loop.cause = loop;
  assert.equal(isMissingColumnError(loop), false);
});
