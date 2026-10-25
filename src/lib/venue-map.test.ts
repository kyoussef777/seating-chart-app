import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapViewBox, rotatedBounds, tableBox } from './venue-map.ts';

test('tableBox uses the size override, else the shape default', () => {
  const sized = tableBox({ id: 'a', name: '1', shape: 'oval', positionX: 10, positionY: 20, width: 74, height: 180 });
  assert.deepEqual(
    { x: sized.x, y: sized.y, w: sized.width, h: sized.height, round: sized.isCircular },
    { x: 10, y: 20, w: 74, h: 180, round: true }
  );
  const stock = tableBox({ id: 'b', name: '2', shape: 'rectangular', positionX: 0, positionY: 0 });
  assert.equal(stock.width, 180);
  assert.equal(stock.isCircular, false);
});

test('rotatedBounds swaps the sides of a quarter-turned box about its centre', () => {
  const b = rotatedBounds({ x: 0, y: 0, width: 100, height: 20, rotation: 90 });
  assert.ok(Math.abs(b.minX - 40) < 1e-9 && Math.abs(b.maxX - 60) < 1e-9);
  assert.ok(Math.abs(b.minY + 40) < 1e-9 && Math.abs(b.maxY - 60) < 1e-9);
});

test('mapViewBox frames every box with padding', () => {
  const view = mapViewBox(
    [
      { x: 100, y: 50, width: 50, height: 50, rotation: 0 },
      { x: 300, y: 400, width: 100, height: 20, rotation: 0 },
    ],
    10
  );
  assert.deepEqual(view, { x: 90, y: 40, width: 320, height: 390 });
});

test('mapViewBox of nothing is a unit box rather than NaN', () => {
  assert.deepEqual(mapViewBox([]), { x: 0, y: 0, width: 1, height: 1 });
});
