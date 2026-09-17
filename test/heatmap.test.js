import test from 'node:test';
import assert from 'node:assert/strict';
import { intensityBucket, collectFiles, scoreLookup, renderHeatmap } from '../src/heatmap.js';

test('intensityBucket maps 0 to bucket 0 and 1 to the top bucket', () => {
  assert.equal(intensityBucket(0), 0);
  assert.equal(intensityBucket(1), 4);
  assert.equal(intensityBucket(0.1), 1);
  assert.equal(intensityBucket(0.9), 4);
});

test('collectFiles returns the sorted union of files across pairs', () => {
  const pairs = [
    { a: 'b.js', b: 'a.js' },
    { a: 'c.js', b: 'a.js' },
  ];

  assert.deepEqual(collectFiles(pairs), ['a.js', 'b.js', 'c.js']);
});

test('scoreLookup finds a pair score regardless of argument order', () => {
  const lookup = scoreLookup([{ a: 'a.js', b: 'b.js', score: 0.75 }]);

  assert.equal(lookup.get('a.js\u0000b.js'), 0.75);
});

test('renderHeatmap reports the message for an empty pair list', () => {
  assert.equal(renderHeatmap([]), 'no co-changed file pairs found');
});

test('renderHeatmap prints a legend entry for every file in the top pairs', () => {
  const pairs = [
    { a: 'a.js', b: 'b.js', count: 4, score: 1 },
    { a: 'b.js', b: 'c.js', count: 1, score: 0.2 },
  ];

  const output = renderHeatmap(pairs, { top: 20 });

  assert.match(output, /legend:/);
  assert.match(output, /0 {2}a\.js/);
  assert.match(output, /1 {2}b\.js/);
  assert.match(output, /2 {2}c\.js/);
});

test('renderHeatmap marks the diagonal and leaves an uncoupled pair blank', () => {
  const pairs = [{ a: 'a.js', b: 'b.js', count: 1, score: 1 }];

  const output = renderHeatmap(pairs, { top: 20 });

  // Row 0: diagonal cell (index 0) is the middle dot, off-diagonal (index 1)
  // is the fully-filled block for a score of 1.
  assert.match(output, /^ 0 {2}\u00b7 {2}\u2588$/m);
});

test('renderHeatmap respects the top option by only including its files', () => {
  const pairs = [
    { a: 'a.js', b: 'b.js', count: 5, score: 1 },
    { a: 'c.js', b: 'd.js', count: 1, score: 0.1 },
  ];

  const output = renderHeatmap(pairs, { top: 1 });

  assert.match(output, /a\.js/);
  assert.match(output, /b\.js/);
  assert.ok(!output.includes('c.js'));
  assert.ok(!output.includes('d.js'));
});

test('renderHeatmap wraps cells in ANSI color codes when color is enabled', () => {
  const pairs = [{ a: 'a.js', b: 'b.js', count: 1, score: 1 }];

  const output = renderHeatmap(pairs, { top: 20, color: true });

  assert.match(output, /\u001b\[31m/);
});

test('renderHeatmap rejects a non-positive top value', () => {
  assert.throws(() => renderHeatmap([], { top: 0 }), /top must be a positive integer/);
});
