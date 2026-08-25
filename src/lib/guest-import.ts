import Papa from 'papaparse';

export interface ParsedGuest {
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
}

export interface ParseResult {
  guests: ParsedGuest[];
  invalidRows: { row: number; error: string }[];
  /** Which source column fed each field, so the UI can show what was detected. */
  mapping: Record<string, string>;
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Matchers are ordered: the first header that matches wins for that field.
 *  Deliberately strict — "number of guests" must not look like a phone number. */
const FIRST_NAME = ['first name', 'firstname', 'given name'];
const LAST_NAME = ['last name', 'lastname', 'surname', 'family name'];
const FULL_NAME = ['full name', 'guest name', 'invitee name', 'name', 'invitee'];
const PHONE = ['phone', 'mobile', 'cell', 'telephone', 'tel'];
const ADDRESS = ['address', 'mailing address', 'street'];
/** Absolute headcount for the party. */
const PARTY_TOTAL = ['party size', 'guest count', 'number of guests', 'no of guests', 'guests', 'seats', 'headcount', 'total guests'];
/** Counts *extra* people beyond the invitee, so the party is this + 1. */
const PARTY_EXTRA = ['additional guests', 'extra guests', 'plus ones', 'plus one', 'additional', 'guests allowed'];

function pick(headers: string[], candidates: string[], exclude: (string | undefined)[] = []): string | undefined {
  const pool = headers.filter((h) => !exclude.includes(h));
  // Exact match first so "name" never steals "first name".
  for (const c of candidates) {
    const hit = pool.find((h) => norm(h) === c);
    if (hit) return hit;
  }
  for (const c of candidates) {
    const hit = pool.find((h) => norm(h).includes(c));
    if (hit) return hit;
  }
  return undefined;
}

function toPartySize(raw: unknown, isExtra: boolean): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = parseInt(String(raw).replace(/[^0-9-]/g, ''), 10);
  if (Number.isNaN(n)) return null;
  const total = isExtra ? n + 1 : n;
  return Math.max(1, Math.min(20, total));
}

/**
 * Parse a guest CSV. Headers are kept verbatim and resolved per row, so two
 * columns can never collapse onto the same key the way a header-rewriting
 * transform does (First Name + Last Name both becoming "name").
 */
export function parseGuestCsv(csvText: string): ParseResult {
  const { data, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = meta.fields ?? [];
  const hFirst = pick(headers, FIRST_NAME);
  const hLast = pick(headers, LAST_NAME);
  const hPhone = pick(headers, PHONE);
  const hAddress = pick(headers, ADDRESS);
  // Extras are resolved first: a loose substring like "guests" in PARTY_TOTAL
  // otherwise swallows "Additional Guests" and reads it as an absolute count.
  const hPartyExtra = pick(headers, PARTY_EXTRA);
  const hPartyTotal = hPartyExtra ? undefined : pick(headers, PARTY_TOTAL);
  // Name resolves last, over only the unclaimed headers, so a loose match can
  // never fall through onto a count/phone/address column and import its value
  // as somebody's name.
  const hFull = pick(headers, FULL_NAME, [hFirst, hLast, hPhone, hAddress, hPartyExtra, hPartyTotal]);

  const mapping: Record<string, string> = {};
  if (hFull && !(hFirst && hLast)) mapping.name = hFull;
  if (hFirst) mapping.firstName = hFirst;
  if (hLast) mapping.lastName = hLast;
  if (hPhone) mapping.phoneNumber = hPhone;
  if (hAddress) mapping.address = hAddress;
  if (hPartyTotal) mapping.partySize = hPartyTotal;
  if (hPartyExtra) mapping.partySize = `${hPartyExtra} (+1)`;

  const guests: ParsedGuest[] = [];
  const invalidRows: { row: number; error: string }[] = [];

  data.forEach((row, i) => {
    const parts = [hFirst && row[hFirst], hLast && row[hLast]].filter(Boolean).map((s) => String(s).trim());
    // Prefer an explicit first/last pair; fall back to a single name column.
    let name = parts.join(' ').trim();
    if (!name && hFull) name = String(row[hFull] ?? '').trim();

    if (!name) {
      invalidRows.push({ row: i + 2, error: 'Missing name' }); // +2: 1-indexed, past header
      return;
    }

    const size =
      (hPartyTotal ? toPartySize(row[hPartyTotal], false) : null) ??
      (hPartyExtra ? toPartySize(row[hPartyExtra], true) : null) ??
      1;

    const phone = hPhone ? String(row[hPhone] ?? '').trim() : '';
    const address = hAddress ? String(row[hAddress] ?? '').trim() : '';

    guests.push({
      name: name.slice(0, 255),
      phoneNumber: phone ? phone.slice(0, 20) : null,
      address: address ? address.slice(0, 500) : null,
      partySize: size,
    });
  });

  return { guests, invalidRows, mapping };
}
