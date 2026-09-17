/**
 * Filters coupling pairs down to only those involving a given file.
 *
 * Pairs are unordered (`a`/`b` do not mean "this file" / "the other file"),
 * so a file can show up in either slot; this checks both.
 *
 * @param {{a: string, b: string, count: number, score: number}[]} pairs -
 *   already sorted, e.g. the output of scoreCoupling
 * @param {string} file - path as it appears in the pair records (relative
 *   to the repository root, matching what `git log --name-only` prints)
 * @returns {{a: string, b: string, count: number, score: number}[]} the
 *   subset of pairs where `file` is one of the two files, in the same order
 *   as the input (already sorted strongest-first)
 */
export function filterPairsByFile(pairs, file) {
  return pairs.filter(({ a, b }) => a === file || b === file);
}
