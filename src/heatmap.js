// Separator used only for building a lookup key inside this module; it
// mirrors the approach in matrix.js but is kept local so this module has no
// dependency on the matrix's internal representation.
const KEY_SEPARATOR = '\u0000';

// Five buckets of visual density, driven purely by score so a non-color
// terminal (or a --no-color run) still conveys strength through shading.
const INTENSITY_CHARS = [' ', '\u2591', '\u2592', '\u2593', '\u2588'];
const DIAGONAL_CHAR = '\u00b7';

// ANSI 8-color codes, cool (low coupling) to hot (high coupling). 0 is
// rendered with no color at all so an empty cell reads as empty, not blue.
const COLOR_CODES = ['', '34', '36', '33', '31'];
const RESET = '\u001b[0m';

/**
 * Picks a 0-4 bucket index for a 0-1 score. A score of exactly 0 always maps
 * to bucket 0 (no shading); everything else is split into four equal bands.
 *
 * @param {number} score
 * @returns {number} 0-4
 */
export function intensityBucket(score) {
  if (!(score > 0)) return 0;
  const bucket = Math.ceil(score / 0.25);
  return Math.min(4, Math.max(1, bucket));
}

function pairKey(a, b) {
  return a < b ? a + KEY_SEPARATOR + b : b + KEY_SEPARATOR + a;
}

/**
 * Selects the distinct files referenced by the top N pairs, sorted
 * alphabetically so grid axes are stable and independent of score order.
 *
 * @param {{a: string, b: string}[]} pairs
 * @returns {string[]}
 */
export function collectFiles(pairs) {
  const files = new Set();
  for (const { a, b } of pairs) {
    files.add(a);
    files.add(b);
  }
  return [...files].sort();
}

/**
 * Builds a file-pair -> score lookup so the grid can answer "what is the
 * coupling between row i and column j" in constant time.
 *
 * @param {{a: string, b: string, score: number}[]} pairs
 * @returns {Map<string, number>}
 */
export function scoreLookup(pairs) {
  const lookup = new Map();
  for (const { a, b, score } of pairs) {
    lookup.set(pairKey(a, b), score);
  }
  return lookup;
}

// Pads the plain character first, then wraps the padded (still
// fixed-width) string in color codes. Coloring before padding would let the
// escape sequence's own characters count toward padStart's width and throw
// off column alignment.
function cell(score, useColor, pad) {
  const bucket = intensityBucket(score);
  const padded = pad(INTENSITY_CHARS[bucket]);
  if (!useColor || bucket === 0) return padded;
  return `\u001b[${COLOR_CODES[bucket]}m${padded}${RESET}`;
}

/**
 * Renders the top N coupled pairs as an ASCII heatmap: a legend-indexed grid
 * where each cell's shading (and, optionally, color) reflects the coupling
 * score between the row and column file.
 *
 * @param {{a: string, b: string, count: number, score: number}[]} pairs -
 *   already sorted strongest-first, e.g. the output of scoreCoupling
 * @param {{top?: number, color?: boolean}} [options]
 * @returns {string} multi-line heatmap, or an explanatory message if there
 *   is nothing to render
 */
export function renderHeatmap(pairs, options = {}) {
  const { top = 20, color = false } = options;

  if (!Number.isInteger(top) || top <= 0) {
    throw new Error('top must be a positive integer');
  }

  const topPairs = pairs.slice(0, top);
  if (topPairs.length === 0) {
    return 'no co-changed file pairs found';
  }

  const files = collectFiles(topPairs);
  const lookup = scoreLookup(topPairs);
  const width = Math.max(2, String(files.length - 1).length);
  const pad = (s) => String(s).padStart(width, ' ');

  const lines = [];
  lines.push(`top ${topPairs.length} coupled pair(s) across ${files.length} file(s)`);
  lines.push('');

  const headerCells = files.map((_, j) => pad(j)).join(' ');
  lines.push(`${' '.repeat(width)} ${headerCells}`);

  for (let i = 0; i < files.length; i++) {
    const rowCells = files.map((_, j) => {
      if (i === j) return pad(DIAGONAL_CHAR);
      const score = lookup.get(pairKey(files[i], files[j])) || 0;
      return cell(score, color, pad);
    });
    lines.push(`${pad(i)} ${rowCells.join(' ')}`);
  }

  lines.push('');
  lines.push('legend:');
  files.forEach((file, i) => {
    lines.push(`  ${pad(i)}  ${file}`);
  });

  return lines.join('\n');
}
