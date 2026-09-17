// A NUL character separates the two file paths in a matrix key. It cannot
// appear in a valid file path, so pair keys never collide.
const KEY_SEPARATOR = '\u0000';

/**
 * Builds a pairwise co-change count matrix from a list of per-commit file
 * lists: for every commit, every unordered pair of files it touched has its
 * count incremented by one.
 *
 * @param {string[][]} commitFileLists
 * @returns {Map<string, number>} key is `a\u0000b` with a < b, value is the
 *   number of commits in which both a and b changed together
 */
export function buildCoChangeMatrix(commitFileLists) {
  const counts = new Map();

  for (const files of commitFileLists) {
    const unique = [...new Set(files)].sort();

    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = unique[i] + KEY_SEPARATOR + unique[j];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Flattens a co-change matrix into a sorted array of pair records, strongest
 * coupling first.
 *
 * @param {Map<string, number>} matrix
 * @returns {{a: string, b: string, count: number}[]}
 */
export function matrixToPairs(matrix) {
  const pairs = [];

  for (const [key, count] of matrix.entries()) {
    const [a, b] = key.split(KEY_SEPARATOR);
    pairs.push({ a, b, count });
  }

  pairs.sort((x, y) => y.count - x.count || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));

  return pairs;
}
