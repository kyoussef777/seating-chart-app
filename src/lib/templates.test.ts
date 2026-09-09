import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TEMPLATE_ID,
  EVENT_TEMPLATES,
  TEMPLATE_IDS,
  TEMPLATE_LIST,
  isTemplateId,
  resolveTemplate,
} from './templates.ts';

test('every advertised template id has a template', () => {
  for (const id of TEMPLATE_IDS) {
    assert.equal(EVENT_TEMPLATES[id].id, id);
  }
  assert.equal(TEMPLATE_LIST.length, TEMPLATE_IDS.length);
});

test('the three event types are all present', () => {
  assert.deepEqual([...TEMPLATE_IDS], ['bridal-shower', 'wedding', 'engagement']);
});

test('unknown, missing and malformed ids fall back to the default template', () => {
  for (const value of [undefined, null, '', 'anniversary', 42, {}]) {
    assert.equal(resolveTemplate(value).id, DEFAULT_TEMPLATE_ID);
  }
});

test('a known id resolves to its own template', () => {
  assert.equal(resolveTemplate('engagement').id, 'engagement');
  assert.equal(resolveTemplate('wedding').id, 'wedding');
});

test('isTemplateId only accepts the registered ids', () => {
  assert.equal(isTemplateId('wedding'), true);
  assert.equal(isTemplateId('Wedding'), false);
  assert.equal(isTemplateId(null), false);
});

// A template missing a palette entry renders an element with `undefined` as its
// colour, which browsers drop silently — so check the contract instead.
test('every template supplies a complete palette, shape and font set', () => {
  const paletteKeys = Object.keys(EVENT_TEMPLATES[DEFAULT_TEMPLATE_ID].palette);

  for (const template of TEMPLATE_LIST) {
    assert.deepEqual(Object.keys(template.palette).sort(), [...paletteKeys].sort(), template.id);

    for (const [key, value] of Object.entries(template.palette)) {
      if (key === 'swatches') {
        assert.equal((value as string[]).length, 3, `${template.id}.swatches`);
        continue;
      }
      assert.equal(typeof value, 'string', `${template.id}.${key}`);
      assert.ok((value as string).length > 0, `${template.id}.${key} is empty`);
    }

    for (const key of ['input', 'button', 'panel'] as const) {
      assert.ok(template.shape[key].length > 0, `${template.id}.shape.${key}`);
    }
    for (const key of ['display', 'label', 'body'] as const) {
      assert.match(template.fonts[key], /var\(--font-/, `${template.id}.fonts.${key}`);
    }
  }
});

test('every template ships usable default copy', () => {
  for (const template of TEMPLATE_LIST) {
    assert.ok(template.name.length > 0, template.id);
    assert.ok(template.description.length > 0, template.id);
    assert.ok(template.copy.eventName.length > 0, template.id);
    assert.ok(template.copy.homePageText.length > 0, template.id);
    assert.ok(template.copy.searchClosedMessage.length > 0, template.id);
  }
});

// The venue was hard-coded on the home page and misspelled "Angalina's".
test('the bridal shower venue is spelled Angelina\'s', () => {
  const venue = EVENT_TEMPLATES['bridal-shower'].copy.venueName;
  assert.match(venue, /^Angelina's Restaurant, Staten Island$/);
  assert.doesNotMatch(venue, /Angalina/i);
});
