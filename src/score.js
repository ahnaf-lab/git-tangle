/**
 * Counts how many commits touched each file at least once.
 *
 * Used as the denominator for a coupling score: a pair that always changes
 * together should score high even if the absolute co-change count is small,
 * as long as both files rarely change without each other.
 *
 * @param {string[][]} commitFileLists
 * @returns {Map<string, number>} file path -> number of commits touching it
 */
export function countFileAppearances(commitFileLists) {
  const counts = new Map();

  for (const files of commitFileLists) {
    const unique = new Set(files);
    for (const file of unique) {
      counts.set(file, (counts.get(file) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Normalizes co-change counts into a 0-1 coupling score per file pair using
 * the Jaccard index: commits touching both files, divided by commits
 * touching either one. This punishes pairs that co-change often only
 * because one of the files changes constantly for unrelated reasons.
 *
 * @param {{a: string, b: string, count: number}[]} pairs - from matrixToPairs
 * @param {Map<string, number>} fileCounts - from countFileAppearances
 * @returns {{a: string, b: string, count: number, score: number}[]} sorted
 *   strongest coupling first; ties broken by count, then file name
 */
export function scoreCoupling(pairs, fileCounts) {
  const scored = pairs.map(({ a, b, count }) => {
    const countA = fileCounts.get(a) || 0;
    const countB = fileCounts.get(b) || 0;
    const union = countA + countB - count;

    if (union <= 0) {
      return { a, b, count, score: 0 };
    }

    // Clamp against floating point drift; union >= count always holds
    // mathematically, but this keeps the contract exact regardless.
    const score = Math.min(1, Math.max(0, count / union));
    return { a, b, count, score };
  });

  scored.sort(
    (x, y) =>
      y.score - x.score ||
      y.count - x.count ||
      x.a.localeCompare(y.a) ||
      x.b.localeCompare(y.b),
  );

  return scored;
}
