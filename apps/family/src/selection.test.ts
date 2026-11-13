import test from 'node:test';
import assert from 'node:assert/strict';
import { addVisibleSelection } from './selection';

test('Batch selection adds visible questions without duplicates and respects the 12-question cap', () => {
  const result = addVisibleSelection([1, 2, 3], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  assert.deepEqual(result.ids.slice(0, 3), [1, 2, 3]);
  assert.equal(result.ids.length, 12);
  assert.equal(result.added, 9);
  assert.equal(result.skipped, 3);
  assert.equal(result.full, true);
});

test('Batch selection reports no additions when already full or everything is selected', () => {
  const full = addVisibleSelection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [13, 14]);
  assert.equal(full.added, 0);
  assert.equal(full.skipped, 2);
  assert.equal(full.full, true);
  const already = addVisibleSelection([1, 2], [1, 2]);
  assert.deepEqual(already.ids, [1, 2]);
  assert.equal(already.added, 0);
  assert.equal(already.skipped, 0);
  assert.equal(already.full, false);
});
