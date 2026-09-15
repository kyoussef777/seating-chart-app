import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignBoxes,
  angleFromCentre,
  arrangeTables,
  clampGroupDelta,
  clampItemsIntoBounds,
  computeSnapGuides,
  distributeBoxes,
  duplicateName,
  estimateLabelSize,
  itemsInMarquee,
  normalizeAngle,
  rectFromPoints,
  rectsIntersect,
  resizeBox,
  rotateVector,
  snapAngle,
  snapValue,
} from './floorplan.ts';

const close = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );

/* ---- snapping -------------------------------------------------------- */

test('snapValue rounds to the grid only when snapping is on', () => {
  assert.equal(snapValue(63, 50, true), 50);
  assert.equal(snapValue(76, 50, true), 100);
  assert.equal(snapValue(63, 50, false), 63);
  // A zero grid would divide by zero; it passes the value through instead.
  assert.equal(snapValue(63, 0, true), 63);
});

test('angles normalise and snap into [0, 360)', () => {
  assert.equal(normalizeAngle(-90), 270);
  assert.equal(normalizeAngle(450), 90);
  assert.equal(snapAngle(97), 90); // nearer 90 than 105
  assert.equal(snapAngle(98), 105);
  assert.equal(snapAngle(-7), 0);
  assert.equal(snapAngle(44, 90), 0);
  assert.equal(snapAngle(46, 90), 90);
});

test('angleFromCentre treats straight up as zero', () => {
  const centre = { x: 100, y: 100 };
  assert.equal(angleFromCentre(centre, 100, 0), 0); // pointer above
  assert.equal(angleFromCentre(centre, 200, 100), 90); // pointer to the right
  assert.equal(angleFromCentre(centre, 100, 200), 180); // pointer below
});

test('rotateVector turns a vector by the given angle', () => {
  const turned = rotateVector(10, 0, 90);
  close(turned.x, 0);
  close(turned.y, 10);
});

/* ---- resize ---------------------------------------------------------- */

test('resizing from the south-east grip grows away from the fixed corner', () => {
  const next = resizeBox({ x: 100, y: 100, width: 200, height: 100 }, 'se', 50, 20);
  assert.deepEqual(next, { x: 100, y: 100, width: 250, height: 120 });
});

test('resizing from the north-west grip moves the origin and keeps the far corner still', () => {
  const box = { x: 100, y: 100, width: 200, height: 100 };
  const next = resizeBox(box, 'nw', -50, -20);
  assert.deepEqual(next, { x: 50, y: 80, width: 250, height: 120 });
  // The south-east corner is exactly where it started.
  assert.equal(next.x + next.width, box.x + box.width);
  assert.equal(next.y + next.height, box.y + box.height);
});

test('an edge grip only touches its own axis', () => {
  const next = resizeBox({ x: 0, y: 0, width: 100, height: 100 }, 'e', 40, 999);
  assert.equal(next.width, 140);
  assert.equal(next.height, 100);
});

// Regression: resize used to add the raw screen delta to width/height, so a
// rotated object grew along the wrong axis and slid away from the pointer.
test('resize interprets the drag in the rotated box own frame', () => {
  const box = { x: 100, y: 100, width: 200, height: 100, rotation: 90 };
  // At 90° the box's local +x points down the screen, so a downward drag on
  // the east grip is what widens it.
  const next = resizeBox(box, 'e', 0, 50);
  close(next.width, 250);
  close(next.height, 100);
  // The centre slides along the rotated axis, keeping the west edge anchored.
  close(next.x + next.width / 2, 200);
  close(next.y + next.height / 2, 175);
});

test('resize honours min and max limits', () => {
  const box = { x: 0, y: 0, width: 100, height: 100 };
  assert.equal(resizeBox(box, 'se', -500, -500, { minWidth: 60, minHeight: 60 }).width, 60);
  assert.equal(resizeBox(box, 'se', 5000, 5000, { maxWidth: 600, maxHeight: 600 }).height, 600);
});

test('keepAspect scales both sides together', () => {
  const next = resizeBox({ x: 0, y: 0, width: 200, height: 100 }, 'se', 100, 0, { keepAspect: true });
  close(next.width, 300);
  close(next.height, 150);
});

test('an unrotated resize is held inside the floor plan', () => {
  const next = resizeBox({ x: 900, y: 400, width: 100, height: 100 }, 'se', 500, 500, {
    bounds: { width: 1000, height: 500 },
    maxWidth: 400,
    maxHeight: 400,
  });
  assert.ok(next.x + next.width <= 1000);
  assert.ok(next.y + next.height <= 500);
});

/* ---- marquee selection ------------------------------------------------ */

test('rectFromPoints normalises a drag in any direction', () => {
  assert.deepEqual(rectFromPoints({ x: 100, y: 100 }, { x: 40, y: 60 }), {
    x: 40,
    y: 60,
    width: 60,
    height: 40,
  });
});

test('rectsIntersect is true for overlap and false for touching or apart', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(rectsIntersect(a, { x: 5, y: 5, width: 10, height: 10 }), true);
  assert.equal(rectsIntersect(a, { x: 10, y: 0, width: 10, height: 10 }), false);
  assert.equal(rectsIntersect(a, { x: 50, y: 50, width: 1, height: 1 }), false);
});

test('itemsInMarquee returns every item the band touches', () => {
  const items = [
    { id: 'a', x: 0, y: 0, width: 50, height: 50 },
    { id: 'b', x: 200, y: 200, width: 50, height: 50 },
    { id: 'c', x: 40, y: 40, width: 50, height: 50 },
  ];
  assert.deepEqual(itemsInMarquee(items, { x: 0, y: 0, width: 100, height: 100 }), ['a', 'c']);
});

/* ---- align and distribute --------------------------------------------- */

test('alignBoxes lines a selection up and reports only what moved', () => {
  const items = [
    { id: 'a', x: 10, y: 0, width: 100, height: 40 },
    { id: 'b', x: 80, y: 90, width: 60, height: 40 },
  ];
  assert.deepEqual(alignBoxes(items, 'left'), [{ id: 'b', x: 10, y: 90 }]);
  // Right alignment uses each item's own width, not a shared one: the
  // rightmost edge here is b's (140), so a is the one that has to move.
  assert.deepEqual(alignBoxes(items, 'right'), [{ id: 'a', x: 40, y: 0 }]);
});

test('alignBoxes works on the vertical axis too', () => {
  const items = [
    { id: 'a', x: 0, y: 0, width: 40, height: 40 },
    { id: 'b', x: 100, y: 200, width: 40, height: 80 },
  ];
  assert.deepEqual(alignBoxes(items, 'top'), [{ id: 'b', x: 100, y: 0 }]);
  assert.deepEqual(alignBoxes(items, 'bottom'), [{ id: 'a', x: 0, y: 240 }]);
});

test('alignBoxes needs at least two items', () => {
  assert.deepEqual(alignBoxes([{ id: 'a', x: 0, y: 0, width: 10, height: 10 }], 'left'), []);
});

test('distributeBoxes equalises the gaps, not the centres', () => {
  const items = [
    { id: 'a', x: 0, y: 0, width: 100, height: 10 },
    { id: 'b', x: 150, y: 0, width: 20, height: 10 },
    { id: 'c', x: 400, y: 0, width: 100, height: 10 },
  ];
  const moves = distributeBoxes(items, 'horizontal');
  const byId = new Map(moves.map((m) => [m.id, m]));
  // Total width 220 across a 500 span leaves 280 for two gaps: 140 each.
  close(byId.get('b')!.x, 240);
  // The outer two already sit at the extremes, so they do not move.
  assert.equal(byId.has('a'), false);
  assert.equal(byId.has('c'), false);
});

test('distributeBoxes needs at least three items', () => {
  const items = [
    { id: 'a', x: 0, y: 0, width: 10, height: 10 },
    { id: 'b', x: 90, y: 0, width: 10, height: 10 },
  ];
  assert.deepEqual(distributeBoxes(items, 'horizontal'), []);
});

/* ---- auto arrange ------------------------------------------------------ */

const sized = (id: string, width = 140, height = 140) => ({ id, width, height });

test('every arrange layout leaves tables inside the floor plan', () => {
  const bounds = { width: 1200, height: 900 };
  const tables = Array.from({ length: 9 }, (_, i) => sized(`t${i}`, 180, 120));
  for (const layout of ['grid', 'circle', 'rows', 'horseshoe'] as const) {
    for (const placed of arrangeTables(tables, bounds, layout)) {
      assert.ok(placed.x >= 0 && placed.y >= 0, `${layout} placed ${placed.id} at a negative offset`);
      assert.ok(placed.x + 180 <= bounds.width, `${layout} pushed ${placed.id} off the right edge`);
      assert.ok(placed.y + 120 <= bounds.height, `${layout} pushed ${placed.id} off the bottom edge`);
    }
  }
});

// Regression: the circle layout assumed a 100px table and subtracted a flat
// 50, so wide tables were arranged partly off the plan.
test('the circle layout measures each table rather than assuming 100px', () => {
  const bounds = { width: 1000, height: 1000 };
  const placed = arrangeTables([sized('a', 400, 300), sized('b', 400, 300)], bounds, 'circle');
  for (const table of placed) {
    assert.ok(table.x >= 0 && table.x + 400 <= 1000);
    assert.ok(table.y >= 0 && table.y + 300 <= 1000);
  }
});

test('a single table is centred', () => {
  const placed = arrangeTables([sized('only', 100, 50)], { width: 1000, height: 500 }, 'grid');
  assert.deepEqual(placed, [{ id: 'only', x: 450, y: 225 }]);
});

test('arrange applies the caller snap function', () => {
  const placed = arrangeTables([sized('a'), sized('b'), sized('c')], { width: 1000, height: 1000 }, 'grid', (v) =>
    Math.round(v / 50) * 50
  );
  for (const table of placed) {
    assert.equal(table.x % 50, 0);
    assert.equal(table.y % 50, 0);
  }
});

test('arrange returns nothing for an empty floor', () => {
  assert.deepEqual(arrangeTables([], { width: 500, height: 500 }, 'grid'), []);
});

/* ---- alignment guides -------------------------------------------------- */

test('computeSnapGuides pulls a near-miss into line and reports the guide', () => {
  const moving = { x: 104, y: 300, width: 100, height: 100 };
  const others = [{ x: 100, y: 0, width: 100, height: 100 }];
  const result = computeSnapGuides(moving, others, 6);
  assert.equal(result.x, -4);
  assert.equal(result.y, 0);
  assert.deepEqual(result.guides, [{ axis: 'x', position: 100 }]);
});

test('computeSnapGuides ignores anything beyond the threshold', () => {
  const result = computeSnapGuides({ x: 400, y: 400, width: 10, height: 10 }, [
    { x: 0, y: 0, width: 10, height: 10 },
  ]);
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
  assert.deepEqual(result.guides, []);
});

test('computeSnapGuides also snaps to the floor plan centre line', () => {
  const bounds = { width: 1000, height: 1000 };
  const result = computeSnapGuides({ x: 448, y: 10, width: 100, height: 100 }, [], 6, bounds);
  // Centre of the box (498) pulls to the centre of the plan (500).
  assert.equal(result.x, 2);
  assert.deepEqual(result.guides, [{ axis: 'x', position: 500 }]);
});

/* ---- bounds ------------------------------------------------------------ */

// Regression: shrinking the edit zone stranded items outside it, where they
// were invisible and could not be selected to be dragged back.
test('clampItemsIntoBounds rescues items left outside a shrunken floor', () => {
  const items = [
    { id: 'in', x: 10, y: 10, width: 50, height: 50 },
    { id: 'out', x: 900, y: 900, width: 100, height: 100 },
  ];
  assert.deepEqual(clampItemsIntoBounds(items, { width: 500, height: 500 }), [
    { id: 'out', x: 400, y: 400 },
  ]);
});

test('clampGroupDelta stops a whole selection at the floor edge', () => {
  const items = [
    { x: 0, y: 100, width: 100, height: 100 },
    { x: 200, y: 100, width: 100, height: 100 },
  ];
  const bounds = { width: 1000, height: 1000 };
  // Leftward past the edge is trimmed to exactly the space available.
  assert.deepEqual(clampGroupDelta(items, -50, 0, bounds), { x: 0, y: 0 });
  // Rightward is allowed up to the far edge of the rightmost item.
  assert.deepEqual(clampGroupDelta(items, 5000, 0, bounds), { x: 700, y: 0 });
  // A move that fits passes through untouched.
  assert.deepEqual(clampGroupDelta(items, 100, 50, bounds), { x: 100, y: 50 });
});

/* ---- misc -------------------------------------------------------------- */

test('duplicateName avoids names already in use', () => {
  assert.equal(duplicateName('Table 4', ['Table 4']), 'Table 4 copy');
  assert.equal(duplicateName('Table 4', ['Table 4', 'table 4 copy']), 'Table 4 copy 2');
  assert.ok(duplicateName('x'.repeat(60), []).length <= 50);
});

test('estimateLabelSize grows with the text and the font', () => {
  const small = estimateLabelSize('Bar', 16);
  const large = estimateLabelSize('Bar', 32);
  assert.ok(large.width > small.width);
  assert.ok(large.height > small.height);
  assert.ok(estimateLabelSize('', 16).width > 0);
});
