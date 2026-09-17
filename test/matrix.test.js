import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoChangeMatrix, matrixToPairs } from '../src/matrix.js';

test('buildCoChangeMatrix counts each unordered pair once per commit', () => {
  const commits = [
    ['a.js', 'b.js'],
    ['a.js', 'b.js', 'c.js'],
    ['b.js', 'c.js'],
  ];

  const matrix = buildCoChangeMatrix(commits);

  assert.equal(matrix.get('a.js\u0000b.js'), 2);
  assert.equal(matrix.get('a.js\u0000c.js'), 1);
  assert.equal(matrix.get('b.js\u0000c.js'), 2);
});

test('buildCoChangeMatrix ignores duplicate file entries within one commit', () => {
  const commits = [['a.js', 'a.js', 'b.js']];

  const matrix = buildCoChangeMatrix(commits);

  assert.equal(matrix.get('a.js\u0000b.js'), 1);
  assert.equal(matrix.size, 1);
});

test('buildCoChangeMatrix produces no pairs for single-file commits', () => {
  const commits = [['a.js'], ['b.js'], ['a.js']];

  const matrix = buildCoChangeMatrix(commits);

  assert.equal(matrix.size, 0);
});

test('matrixToPairs sorts strongest coupling first', () => {
  const matrix = new Map([
    ['a.js\u0000b.js', 1],
    ['x.js\u0000y.js', 5],
    ['m.js\u0000n.js', 3],
  ]);

  const pairs = matrixToPairs(matrix);

  assert.deepEqual(
    pairs.map((p) => p.count),
    [5, 3, 1],
  );
  assert.deepEqual(pairs[0], { a: 'x.js', b: 'y.js', count: 5 });
});

test('matrixToPairs breaks ties deterministically by file name', () => {
  const matrix = new Map([
    ['b.js\u0000c.js', 2],
    ['a.js\u0000d.js', 2],
  ]);

  const pairs = matrixToPairs(matrix);

  assert.deepEqual(
    pairs.map((p) => `${p.a}-${p.b}`),
    ['a.js-d.js', 'b.js-c.js'],
  );
});
