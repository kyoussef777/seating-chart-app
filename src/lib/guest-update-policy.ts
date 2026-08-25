/**
 * Authorization policy for PUT /api/guests.
 *
 * Kept as a pure function so the rules are testable without a database, and so
 * the decision cannot drift from the handler. The caller decides *who* the
 * requester is (from the session cookie) — never from the request body.
 */

/** Fields present on the request. `undefined` means "not supplied". */
export interface RequestedFields {
  name?: unknown;
  phoneNumber?: unknown;
  address?: unknown;
  tableId?: unknown;
  partySize?: unknown;
}

export interface PolicyInput {
  /** True only when a valid session cookie was verified server-side. */
  isAdmin: boolean;
  fields: RequestedFields;
  addressCollectionEnabled: boolean;
  /** The guest's currently stored address, used to prevent overwrites. */
  currentAddress: string | null;
}

export type PolicyResult =
  | { ok: true; scope: 'admin' }
  | { ok: true; scope: 'address-only' }
  | { ok: false; status: number; error: string };

/** Everything an unauthenticated caller is forbidden from touching. */
const ADMIN_ONLY_FIELDS = ['name', 'phoneNumber', 'tableId', 'partySize'] as const;

export function authorizeGuestUpdate(input: PolicyInput): PolicyResult {
  const { isAdmin, fields, addressCollectionEnabled, currentAddress } = input;

  if (isAdmin) return { ok: true, scope: 'admin' };

  // phoneNumber was previously absent from this list, leaving it anonymously
  // writable on any guest record.
  const forbidden = ADMIN_ONLY_FIELDS.filter((f) => fields[f] !== undefined);
  if (forbidden.length > 0) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required to change guest details',
    };
  }

  if (fields.address === undefined) {
    // Nothing an anonymous caller may legitimately change. Refusing here also
    // stops a bare {id} request being used to read a guest record back.
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  if (!addressCollectionEnabled) {
    return { ok: false, status: 403, error: 'Address collection is currently turned off' };
  }

  // Guests may fill in a blank address, never edit or erase one that exists.
  // Without a per-guest credential this is what stops anonymous callers
  // destroying or rewriting addresses for arbitrary guest ids.
  if (currentAddress !== null && currentAddress.trim() !== '') {
    return {
      ok: false,
      status: 409,
      error: 'An address is already on file for this guest. Please contact the hosts to change it.',
    };
  }

  const value = fields.address;
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, status: 400, error: 'A valid address is required' };
  }

  return { ok: true, scope: 'address-only' };
}
