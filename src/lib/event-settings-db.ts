/**
 * Reading the event settings row, tolerant of a database that has not been
 * migrated yet.
 *
 * Vercel deploys code the moment a branch merges; `npm run db:migrate` is a
 * separate, manual step. Between the two, `select *` on event_settings asks for
 * columns the database does not have and every route that touches settings —
 * the home page, /api/settings, /api/guests — fails with a 500. The guest
 * portal is the public face of the event, so it degrades instead: it reads the
 * columns that do exist and lets `toPortalSettings` fill the rest from the
 * template defaults.
 */

import { db } from './db';
import { eventSettings } from './schema';
import { isMissingColumnError } from './db-errors';

/** The columns event_settings had before the template migration (0001). */
const COLUMNS_BEFORE_TEMPLATES = {
  id: eventSettings.id,
  eventName: eventSettings.eventName,
  homePageText: eventSettings.homePageText,
  searchEnabled: eventSettings.searchEnabled,
  addressCollectionEnabled: eventSettings.addressCollectionEnabled,
  updatedAt: eventSettings.updatedAt,
};

export type EventSettingsRow = Record<string, unknown> | null;

/**
 * The settings row, or null when there is none.
 *
 * Falls back to the pre-template columns when the database has not been
 * migrated, so callers always get something usable. Any other failure is
 * rethrown — a broken connection is not something to paper over.
 */
export async function readEventSettingsRow(): Promise<EventSettingsRow> {
  try {
    const [row] = await db.select().from(eventSettings).limit(1);
    return row ?? null;
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    console.warn(
      'event_settings is missing the template columns — run `npm run db:migrate`. ' +
        'Serving the guest portal from template defaults until then.'
    );

    const [row] = await db.select(COLUMNS_BEFORE_TEMPLATES).from(eventSettings).limit(1);
    return row ?? null;
  }
}
