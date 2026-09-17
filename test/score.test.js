import test from 'node:test';
import assert from 'node:assert/strict';
import { countFileAppearances, scoreCoupling } from '../src/score.js';
import { buildCoChangeMatrix, matrixToPairs } from '../src/matrix.js';

test('countFileAppearances counts one per commit even with duplicate entries', () => {
  const commits = [
    ['a.js', 'a.js', 'b.js'],
    ['a.js'],
    ['b.js', 'c.js'],
  ];

  const counts = countFileAppearances(commits);

  assert.equal(counts.get('a.js'), 2);
  assert.equal(counts.get('b.js'), 2);
  assert.equal(counts.get('c.js'), 1);
});

test('scoreCoupling gives a pair that always changes together a score of 1', () => {
  const commits = [
    ['a.js', 'b.js'],
    ['a.js', 'b.js'],
  ];
  const matrix = buildCoChangeMatrix(commits);
  const fileCounts = countFileAppearances(commits);

  const [pair] = scoreCoupling(matrixToPairs(matrix), fileCounts);

  assert.equal(pair.score, 1);
});

test('scoreCoupling penalizes a pair where one file changes constantly alone', () => {
  const commits = [
    ['a.js', 'b.js'],
    ['a.js'],
    ['a.js'],
    ['a.js'],
  ];
  const matrix = buildCoChangeMatrix(commits);
  const fileCounts = countFileAppearances(commits);

  const [pair] = scoreCoupling(matrixToPairs(matrix), fileCounts);

  // 1 co-change / (4 commits touching a.js + 1 touching b.js - 1) = 1/4
  assert.equal(pair.score, 0.25);
});

test('scoreCoupling sorts by score first, falling back to count and file name', () => {
  const pairs = [
    { a: 'x.js', b: 'y.js', count: 2 },
    { a: 'm.js', b: 'n.js', count: 2 },
  ];
  const fileCounts = new Map([
    ['x.js', 2],
    ['y.js', 2],
    ['m.js', 4],
    ['n.js', 4],
  ]);

  const scored = scoreCoupling(pairs, fileCounts);

  // x/y: 2 / (2+2-2) = 1.0, m/n: 2 / (4+4-2) = 0.333...
  assert.deepEqual(
    scored.map((p) => `${p.a}-${p.b}`),
    ['x.js-y.js', 'm.js-n.js'],
  );
  assert.equal(scored[0].score, 1);
});

test('scoreCoupling stays within 0 and 1 for every pair', () => {
  const commits = [
    ['a.js', 'b.js', 'c.js'],
    ['a.js', 'c.js'],
    ['b.js'],
    ['c.js'],
  ];
  const matrix = buildCoChangeMatrix(commits);
  const fileCounts = countFileAppearances(commits);

  const scored = scoreCoupling(matrixToPairs(matrix), fileCounts);

  assert.ok(scored.length > 0);
  for (const { score } of scored) {
    assert.ok(score >= 0 && score <= 1, `score ${score} out of range`);
  }
});
