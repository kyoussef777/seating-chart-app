/**
 * Classifying database errors.
 *
 * Free of any database imports so it can be unit tested directly.
 */

/** PostgreSQL `undefined_column`. */
const UNDEFINED_COLUMN = '42703';

/**
 * True when a query failed because the database is missing a column the code
 * asked for — the signature of code deployed ahead of its migration. Drizzle
 * wraps the driver error, so the cause chain is walked.
 */
export function isMissingColumnError(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current !== 'object' || seen.has(current)) return false;
    seen.add(current);

    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (candidate.code === UNDEFINED_COLUMN) return true;
    // Backstop for drivers that report the failure only in the message.
    if (typeof candidate.message === 'string' && /column .* does not exist/i.test(candidate.message)) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}
