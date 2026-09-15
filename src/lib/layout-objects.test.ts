import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LABEL_FONT_MAX,
  LABEL_FONT_MIN,
  OBJECT_MAX_SIZE,
  normalizeHexColor,
  normalizeLabel,
  normalizeReferenceObject,
  normalizeShape,
  resolveReferenceObject,
} from './layout-objects.ts';

test('normalizeLabel fills in every column a row needs', () => {
  const label = normalizeLabel({ text: 'Head Table', x: 10, y: 20 });
  assert.deepEqual(label, {
    text: 'Head Table',
    x: 10,
    y: 20,
    fontSize: 18,
    rotation: 0,
    color: '#064e3b',
    background: 'light',
    bold: true,
    align: 'center',
  });
});

// The routes used to insert whatever arrived, so a payload missing fontSize
// (or carrying a string) hit a NOT NULL violation and failed the whole save.
test('normalizeLabel survives junk input', () => {
  const label = normalizeLabel({ text: '   ', fontSize: 'huge', x: 'left', rotation: null });
  assert.equal(label.text, 'Label');
  assert.equal(label.fontSize, 18);
  assert.equal(label.x, 0);
  assert.equal(label.rotation, 0);
});

test('normalizeLabel clamps the font size and validates the enums', () => {
  assert.equal(normalizeLabel({ fontSize: 2 }).fontSize, LABEL_FONT_MIN);
  assert.equal(normalizeLabel({ fontSize: 900 }).fontSize, LABEL_FONT_MAX);
  assert.equal(normalizeLabel({ background: 'rainbow' }).background, 'light');
  assert.equal(normalizeLabel({ background: 'solid' }).background, 'solid');
  assert.equal(normalizeLabel({ align: 'justify' }).align, 'center');
  assert.equal(normalizeLabel({ align: 'right' }).align, 'right');
  assert.equal(normalizeLabel({ bold: false }).bold, false);
});

test('normalizeHexColor only accepts hex literals', () => {
  assert.equal(normalizeHexColor('#abc', '#000'), '#abc');
  assert.equal(normalizeHexColor('#A1B2C3', '#000'), '#A1B2C3');
  // Anything that could smuggle arbitrary CSS in falls back.
  assert.equal(normalizeHexColor('url(javascript:alert(1))', '#000'), '#000');
  assert.equal(normalizeHexColor('red', '#000'), '#000');
  assert.equal(normalizeHexColor(42, '#000'), '#000');
});

test('normalizeShape defaults the size from the shape type', () => {
  assert.equal(normalizeShape({ type: 'circle' }).width, 180);
  assert.equal(normalizeShape({ type: 'line' }).height, 6);
  assert.equal(normalizeShape({ type: 'hexagon' }).type, 'rectangle');
});

test('normalizeShape clamps opacity and size and validates the border style', () => {
  assert.equal(normalizeShape({ opacity: 5 }).opacity, 1);
  assert.equal(normalizeShape({ opacity: -2 }).opacity, 0);
  assert.equal(normalizeShape({ width: 99999 }).width, OBJECT_MAX_SIZE);
  assert.equal(normalizeShape({ borderStyle: 'groovy' }).borderStyle, 'dashed');
  assert.equal(normalizeShape({ borderStyle: 'none' }).borderStyle, 'none');
});

test('a line may be thinner than the general minimum', () => {
  assert.equal(normalizeShape({ type: 'line', height: 3 }).height, 3);
  // Anything else is held at the minimum so it stays grabbable.
  assert.equal(normalizeShape({ type: 'rectangle', height: 3 }).height, 20);
});

test('an empty shape label is stored as null, not an empty caption', () => {
  assert.equal(normalizeShape({ label: '   ' }).label, null);
  assert.equal(normalizeShape({ label: ' Zone A ' }).label, 'Zone A');
});

test('normalizeReferenceObject falls back to the type defaults', () => {
  const object = normalizeReferenceObject({ type: 'bar' });
  assert.equal(object.width, 150);
  assert.equal(object.height, 80);
  assert.equal(object.label, null);
  assert.equal(object.color, null);
});

test('normalizeReferenceObject rejects an unknown type and an unknown tint', () => {
  assert.equal(normalizeReferenceObject({ type: 'moat' }).type, 'danceFloor');
  assert.equal(normalizeReferenceObject({ color: 'chartreuse' }).color, null);
  assert.equal(normalizeReferenceObject({ color: 'blue' }).color, 'blue');
});

test('resolveReferenceObject applies overrides over the stock caption and tint', () => {
  const stock = resolveReferenceObject({ type: 'bar', label: null, color: null });
  assert.equal(stock.label, 'Bar');
  assert.equal(stock.palette.bg, '#dbeafe');

  const custom = resolveReferenceObject({ type: 'bar', label: 'Prosecco Bar', color: 'rose' });
  assert.equal(custom.label, 'Prosecco Bar');
  // An unknown tint key still renders rather than throwing.
  assert.ok(custom.palette.bg);
});

// Regression: an object saved with a type the code no longer knows used to
// take the canvas down when its config lookup returned undefined.
test('resolveReferenceObject tolerates a type it has never heard of', () => {
  const resolved = resolveReferenceObject({
    type: 'photoBooth' as never,
    label: null,
    color: null,
  });
  assert.ok(resolved.label);
  assert.ok(resolved.palette.border);
});
