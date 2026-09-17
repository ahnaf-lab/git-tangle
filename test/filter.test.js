import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPairsByFile } from '../src/filter.js';

test('filterPairsByFile keeps only pairs involving the given file', () => {
  const pairs = [
    { a: 'a.js', b: 'b.js', count: 3, score: 0.9 },
    { a: 'c.js', b: 'd.js', count: 2, score: 0.5 },
    { a: 'a.js', b: 'c.js', count: 1, score: 0.2 },
  ];

  const filtered = filterPairsByFile(pairs, 'a.js');

  assert.deepEqual(
    filtered.map((p) => `${p.a}-${p.b}`),
    ['a.js-b.js', 'a.js-c.js'],
  );
});

test('filterPairsByFile matches the file whether it is in the a or b slot', () => {
  const pairs = [
    { a: 'b.js', b: 'a.js', count: 3, score: 0.9 },
    { a: 'a.js', b: 'z.js', count: 1, score: 0.1 },
  ];

  const filtered = filterPairsByFile(pairs, 'a.js');

  assert.equal(filtered.length, 2);
});

test('filterPairsByFile preserves the input order (already sorted strongest-first)', () => {
  const pairs = [
    { a: 'a.js', b: 'x.js', count: 5, score: 0.8 },
    { a: 'a.js', b: 'y.js', count: 2, score: 0.4 },
    { a: 'a.js', b: 'z.js', count: 1, score: 0.1 },
  ];

  const filtered = filterPairsByFile(pairs, 'a.js');

  assert.deepEqual(filtered.map((p) => p.score), [0.8, 0.4, 0.1]);
});

test('filterPairsByFile returns an empty array when the file has no coupled pairs', () => {
  const pairs = [{ a: 'a.js', b: 'b.js', count: 1, score: 1 }];

  const filtered = filterPairsByFile(pairs, 'solo.js');

  assert.deepEqual(filtered, []);
});
