import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIELD_LIMITS,
  TEXT_FIELDS,
  defaultPortalSettings,
  normalizeSettingsUpdate,
  templateDefaults,
  toPortalSettings,
} from './event-settings.ts';
import { EVENT_TEMPLATES } from './templates.ts';

test('a full valid payload comes back trimmed', () => {
  const result = normalizeSettingsUpdate({
    template: 'wedding',
    eventName: '  Sarah & John  ',
    eventKicker: ' The Wedding Of ',
    homePageText: ' Find your table ',
    venueName: ' The Boathouse ',
    eventDate: ' June 7 ',
    searchClosedMessage: ' Soon ',
    searchEnabled: false,
    addressCollectionEnabled: true,
  });

  assert.deepEqual(result, {
    ok: true,
    values: {
      template: 'wedding',
      eventName: 'Sarah & John',
      eventKicker: 'The Wedding Of',
      homePageText: 'Find your table',
      venueName: 'The Boathouse',
      eventDate: 'June 7',
      searchClosedMessage: 'Soon',
      searchEnabled: false,
      addressCollectionEnabled: true,
    },
  });
});

test('only the supplied fields are returned, so a single toggle can be patched', () => {
  const result = normalizeSettingsUpdate({ searchEnabled: false });
  assert.deepEqual(result, { ok: true, values: { searchEnabled: false } });
});

test('an empty payload is refused', () => {
  for (const body of [{}, { eventName: undefined }]) {
    const result = normalizeSettingsUpdate(body);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error, 'At least one field is required');
  }
});

test('non-objects are refused rather than coerced', () => {
  for (const body of [null, 'eventName=x', 42, ['eventName']]) {
    assert.equal(normalizeSettingsUpdate(body).ok, false, JSON.stringify(body));
  }
});

test('an unknown template is refused', () => {
  const result = normalizeSettingsUpdate({ template: 'anniversary' });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.error, 'Unknown template');
});

test('required fields cannot be saved blank or as whitespace', () => {
  for (const field of ['eventName', 'homePageText'] as const) {
    const result = normalizeSettingsUpdate({ [field]: '   ' });
    assert.equal(result.ok, false, field);
    assert.match(result.ok === false ? result.error : '', /cannot be empty/);
  }
});

test('optional fields may be cleared, which hides that line on the portal', () => {
  const result = normalizeSettingsUpdate({ venueName: '  ', eventDate: '' });
  assert.deepEqual(result, { ok: true, values: { venueName: '', eventDate: '' } });
});

test('over-long text is refused with the limit named', () => {
  for (const field of TEXT_FIELDS) {
    const result = normalizeSettingsUpdate({ [field]: 'x'.repeat(FIELD_LIMITS[field].max + 1) });
    assert.equal(result.ok, false, field);
    assert.match(result.ok === false ? result.error : '', /characters or fewer/, field);
  }
});

test('text exactly at the limit is accepted', () => {
  for (const field of TEXT_FIELDS) {
    const value = 'x'.repeat(FIELD_LIMITS[field].max);
    const result = normalizeSettingsUpdate({ [field]: value });
    assert.equal(result.ok, true, field);
  }
});

test('non-string text and non-boolean toggles are refused', () => {
  assert.equal(normalizeSettingsUpdate({ eventName: 12 }).ok, false);
  assert.equal(normalizeSettingsUpdate({ searchEnabled: 'true' }).ok, false);
  assert.equal(normalizeSettingsUpdate({ addressCollectionEnabled: 1 }).ok, false);
});

test('a missing settings row falls back to the default template copy', () => {
  const settings = toPortalSettings(null);
  assert.deepEqual(settings, defaultPortalSettings());
  assert.equal(settings.template, 'bridal-shower');
  assert.equal(settings.venueName, "Angelina's Restaurant, Staten Island");
});

test('a stored row is used as typed, including cleared optional lines', () => {
  const settings = toPortalSettings({
    template: 'engagement',
    eventName: 'Our Engagement',
    eventKicker: '',
    homePageText: 'Welcome',
    venueName: '',
    eventDate: '',
    searchClosedMessage: 'Later',
    searchEnabled: false,
    addressCollectionEnabled: false,
  });

  assert.equal(settings.template, 'engagement');
  assert.equal(settings.venueName, '');
  assert.equal(settings.eventKicker, '');
  assert.equal(settings.searchEnabled, false);
  assert.equal(settings.addressCollectionEnabled, false);
});

// A row written before this release has no template column, and a hand-edited
// row could carry anything at all.
test('a row with a missing or unknown template still renders', () => {
  assert.equal(toPortalSettings({ eventName: 'X' }).template, 'bridal-shower');
  assert.equal(toPortalSettings({ template: 'anniversary' }).template, 'bridal-shower');
});

test('columns missing from an older row fall back to that template copy', () => {
  const settings = toPortalSettings({ template: 'wedding', eventName: 'Ours' });
  assert.equal(settings.eventName, 'Ours');
  assert.equal(settings.homePageText, EVENT_TEMPLATES.wedding.copy.homePageText);
  assert.equal(settings.searchEnabled, true);
});

test('template defaults are themselves valid settings updates', () => {
  for (const id of ['bridal-shower', 'wedding', 'engagement'] as const) {
    const result = normalizeSettingsUpdate(templateDefaults(id));
    assert.equal(result.ok, true, id);
    assert.equal(result.ok === true && result.values.template, id);
  }
});
