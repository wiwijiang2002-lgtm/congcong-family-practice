import test from 'node:test';
import assert from 'node:assert/strict';
import { addRangeSelection } from './selection';

test('Range selection can pick an arbitrary later block instead of the first 12', () => {
  const visible = Array.from({ length: 20 }, (_, index) => index + 1);
  const result = addRangeSelection([], visible, 13, 18);
  assert.equal(result.error, null);
  assert.deepEqual(result.ids, [13, 14, 15, 16, 17, 18]);
  assert.equal(result.added, 6);
  const tail = addRangeSelection([], visible, 9, 20);
  assert.equal(tail.error, null);
  assert.deepEqual(tail.ids, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(tail.added, 12);
});

test('Range selection rejects invalid ranges and going over 12; already-selected items are not duplicated', () => {
  const visible = Array.from({ length: 20 }, (_, index) => index + 1);
  assert.match(addRangeSelection([], visible, 21, 22).error!, /有效范围/);
  assert.match(addRangeSelection([], visible, 10, 9).error!, /有效范围/);
  assert.match(addRangeSelection(Array.from({ length: 10 }, (_, index) => index + 1), visible, 11, 20).error!, /超过/);
  const overlap = addRangeSelection([13, 14], visible, 13, 16);
  assert.equal(overlap.error, null);
  assert.deepEqual(overlap.ids, [13, 14, 15, 16]);
  assert.equal(overlap.added, 2);
});
