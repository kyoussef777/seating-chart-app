/**
 * Event settings: the shape of the row, what a valid update looks like, and
 * how a (possibly missing) row becomes the settings the guest portal renders.
 *
 * Kept as pure functions with no database or React imports so the rules are
 * unit testable and cannot drift between the API route, the admin form and the
 * home page.
 */

import {
  DEFAULT_TEMPLATE_ID,
  EVENT_TEMPLATES,
  isTemplateId,
  resolveTemplate,
  type TemplateId,
} from './templates.ts';

/** Everything the guest portal needs to render itself. */
export interface PortalSettings {
  template: TemplateId;
  eventName: string;
  /** Small-caps line above the event name. Empty hides it. */
  eventKicker: string;
  homePageText: string;
  /** Venue line under the event name. Empty hides it. */
  venueName: string;
  /** Date line, shown beside the venue. Empty hides it. */
  eventDate: string;
  /** Shown in place of the search box while search is switched off. */
  searchClosedMessage: string;
  searchEnabled: boolean;
  addressCollectionEnabled: boolean;
}

/** The editable text fields, in the order the admin form shows them. */
export const TEXT_FIELDS = [
  'eventName',
  'eventKicker',
  'homePageText',
  'venueName',
  'eventDate',
  'searchClosedMessage',
] as const;

export type TextField = (typeof TEXT_FIELDS)[number];

export const BOOLEAN_FIELDS = ['searchEnabled', 'addressCollectionEnabled'] as const;

/**
 * Per-field limits. `required` fields cannot be saved blank; the rest treat an
 * empty string as "hide this line", which is why they have no minimum.
 */
export const FIELD_LIMITS: Record<TextField, { max: number; required: boolean }> = {
  eventName: { max: 80, required: true },
  eventKicker: { max: 60, required: false },
  homePageText: { max: 300, required: true },
  venueName: { max: 120, required: false },
  eventDate: { max: 60, required: false },
  searchClosedMessage: { max: 300, required: false },
};

const FIELD_LABELS: Record<TextField, string> = {
  eventName: 'Event name',
  eventKicker: 'Event type line',
  homePageText: 'Welcome message',
  venueName: 'Venue',
  eventDate: 'Date',
  searchClosedMessage: 'Search-closed message',
};

/** The copy a template starts from — also what the admin "reset" button restores. */
export function templateDefaults(templateId: unknown): PortalSettings {
  const template = resolveTemplate(templateId);
  return {
    template: template.id,
    ...template.copy,
    searchEnabled: true,
    addressCollectionEnabled: true,
  };
}

/** Settings used before (or instead of) a database row. */
export function defaultPortalSettings(): PortalSettings {
  return templateDefaults(DEFAULT_TEMPLATE_ID);
}

/**
 * Turn a settings row into portal settings.
 *
 * A missing row (a brand-new database) falls back to the default template's
 * copy. A present row is used as typed: a blank venue means the admin cleared
 * it, and the portal hides that line rather than resurrecting a default.
 */
export function toPortalSettings(row: Partial<Record<string, unknown>> | null | undefined): PortalSettings {
  if (!row) return defaultPortalSettings();

  const template = isTemplateId(row.template) ? row.template : DEFAULT_TEMPLATE_ID;
  const fallback = EVENT_TEMPLATES[template].copy;

  const text = (value: unknown, field: TextField): string =>
    typeof value === 'string' ? value : fallback[field];

  return {
    template,
    eventName: text(row.eventName, 'eventName'),
    eventKicker: text(row.eventKicker, 'eventKicker'),
    homePageText: text(row.homePageText, 'homePageText'),
    venueName: text(row.venueName, 'venueName'),
    eventDate: text(row.eventDate, 'eventDate'),
    searchClosedMessage: text(row.searchClosedMessage, 'searchClosedMessage'),
    searchEnabled: row.searchEnabled !== false,
    addressCollectionEnabled: row.addressCollectionEnabled !== false,
  };
}

export type SettingsUpdate = Partial<PortalSettings>;

export type NormalizeResult =
  | { ok: true; values: SettingsUpdate }
  | { ok: false; error: string };

/**
 * Validate and trim a PUT /api/settings body.
 *
 * Only the fields actually present are returned, so a caller may patch a
 * single toggle without resending the whole event.
 */
export function normalizeSettingsUpdate(input: unknown): NormalizeResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Expected a settings object' };
  }

  const body = input as Record<string, unknown>;
  const values: SettingsUpdate = {};

  if (body.template !== undefined) {
    if (!isTemplateId(body.template)) {
      return { ok: false, error: 'Unknown template' };
    }
    values.template = body.template;
  }

  for (const field of TEXT_FIELDS) {
    const raw = body[field];
    if (raw === undefined) continue;

    if (typeof raw !== 'string') {
      return { ok: false, error: `${FIELD_LABELS[field]} must be text` };
    }

    const trimmed = raw.trim();
    const { max, required } = FIELD_LIMITS[field];

    if (required && trimmed.length === 0) {
      return { ok: false, error: `${FIELD_LABELS[field]} cannot be empty` };
    }
    if (trimmed.length > max) {
      return {
        ok: false,
        error: `${FIELD_LABELS[field]} must be ${max} characters or fewer`,
      };
    }

    values[field] = trimmed;
  }

  for (const field of BOOLEAN_FIELDS) {
    const raw = body[field];
    if (raw === undefined) continue;

    if (typeof raw !== 'boolean') {
      return { ok: false, error: `${field} must be true or false` };
    }
    values[field] = raw;
  }

  if (Object.keys(values).length === 0) {
    return { ok: false, error: 'At least one field is required' };
  }

  return { ok: true, values };
}
