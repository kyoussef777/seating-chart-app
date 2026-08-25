import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeGuestUpdate } from './guest-update-policy.ts';

const base = { addressCollectionEnabled: true, currentAddress: null as string | null };

test('admin may change anything', () => {
  const r = authorizeGuestUpdate({
    ...base,
    isAdmin: true,
    fields: { name: 'X', phoneNumber: '1', tableId: 't', partySize: 3, address: 'a' },
  });
  assert.deepEqual(r, { ok: true, scope: 'admin' });
});

test('a guest may fill in a blank address', () => {
  const r = authorizeGuestUpdate({ ...base, isAdmin: false, fields: { address: '12 Main St' } });
  assert.deepEqual(r, { ok: true, scope: 'address-only' });
});

// Regression: phoneNumber was missing from the admin-only list, so it was
// anonymously writable on any guest record.
test('anonymous callers cannot write phoneNumber', () => {
  const r = authorizeGuestUpdate({ ...base, isAdmin: false, fields: { phoneNumber: '555' } });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.status, 401);
});

test('anonymous callers cannot write name, tableId or partySize', () => {
  for (const fields of [{ name: 'X' }, { tableId: 't1' }, { partySize: 9 }]) {
    const r = authorizeGuestUpdate({ ...base, isAdmin: false, fields });
    assert.equal(r.ok, false, JSON.stringify(fields));
    assert.equal(r.ok === false && r.status, 401);
  }
});

// Regression: {id, requiresAuth:false} with no fields performed a no-op update
// and returned the full guest row, leaking phone and address.
test('a bare request with no address is refused, not treated as a read', () => {
  const r = authorizeGuestUpdate({ ...base, isAdmin: false, fields: {} });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.status, 401);
});

// Regression: any anonymous caller could erase or rewrite any guest's address.
test('an existing address cannot be overwritten anonymously', () => {
  const r = authorizeGuestUpdate({
    ...base,
    isAdmin: false,
    currentAddress: '99 Existing Rd',
    fields: { address: 'attacker value' },
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.status, 409);
});

test('an existing address is still editable by an admin', () => {
  const r = authorizeGuestUpdate({
    ...base,
    isAdmin: true,
    currentAddress: '99 Existing Rd',
    fields: { address: 'corrected value' },
  });
  assert.equal(r.ok, true);
});

test('blank or non-string addresses are rejected', () => {
  for (const address of ['', '   ', 42, null]) {
    const r = authorizeGuestUpdate({ ...base, isAdmin: false, fields: { address } });
    assert.equal(r.ok, false, String(address));
  }
});

test('the toggle closes the endpoint for anonymous callers only', () => {
  const anon = authorizeGuestUpdate({
    ...base, isAdmin: false, addressCollectionEnabled: false, fields: { address: 'a' },
  });
  assert.equal(anon.ok === false && anon.status, 403);
  const admin = authorizeGuestUpdate({
    ...base, isAdmin: true, addressCollectionEnabled: false, fields: { address: 'a' },
  });
  assert.equal(admin.ok, true);
});
