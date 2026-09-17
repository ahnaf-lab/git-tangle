#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve, relative, sep } from 'node:path';
import { getCommitFileLists } from '../src/gitlog.js';
import { buildCoChangeMatrix, matrixToPairs } from '../src/matrix.js';
import { countFileAppearances, scoreCoupling } from '../src/score.js';
import { renderHeatmap } from '../src/heatmap.js';
import { filterPairsByFile } from '../src/filter.js';

function printHelp() {
  console.log(`git-tangle - mine commit history for files that change together

Usage:
  git-tangle [<file>] [--repo <path>] [--top <n>] [--limit <n>]
  git-tangle [<file>] --heatmap [--repo <path>] [--top <n>] [--limit <n>] [--color|--no-color]

Arguments:
  <file>          if given, only show pairs involving this file, sorted by
                  score (default: show pairs across the whole repo)

Options:
  --repo <path>   path to the git repository to analyse (default: cwd)
  --top <n>       number of strongest pairs to print (default: 20)
  --limit <n>     only look at the last <n> commits (default: all)
  --heatmap       render the top pairs as an ASCII coupling grid instead of
                  a plain list
  --color         force colored heatmap output, even when not a TTY
  --no-color      disable colored heatmap output, even when a TTY
  --help          show this help text

Output is one line per pair: score<TAB>count<TAB>fileA<TAB>fileB, sorted by
score (0-1 coupling strength) with count as a tiebreak. With --heatmap, the
top pairs are rendered instead as an indexed grid; see the legend it prints
for which index maps to which file.
`);
}

/**
 * Resolves a user-supplied file argument into the repo-root-relative form
 * that pair records use, since that is what `git log --name-only` prints.
 * A relative argument is taken as relative to the repository being
 * analysed (which defaults to the current directory, so the common case of
 * running `git-tangle <file>` from inside the repo just works); an absolute
 * path is accepted as-is.
 *
 * @param {string} repoPath - absolute path to the repository being analysed
 * @param {string} fileArg - the raw positional argument from argv
 * @returns {string}
 */
function normalizeFileArg(repoPath, fileArg) {
  const absolute = resolve(repoPath, fileArg);
  const rel = relative(repoPath, absolute);
  return rel.split(sep).join('/');
}

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      repo: { type: 'string', default: process.cwd() },
      top: { type: 'string', default: '20' },
      limit: { type: 'string' },
      heatmap: { type: 'boolean', default: false },
      color: { type: 'boolean', default: false },
      'no-color': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (positionals.length > 1) {
    throw new Error(`expected at most one file argument, got: ${positionals.join(' ')}`);
  }

  const repoPath = resolve(values.repo);
  const top = Number.parseInt(values.top, 10);
  if (!Number.isInteger(top) || top <= 0) {
    throw new Error(`--top must be a positive integer, got: ${values.top}`);
  }

  const options = {};
  if (values.limit !== undefined) {
    const limit = Number.parseInt(values.limit, 10);
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error(`--limit must be a positive integer, got: ${values.limit}`);
    }
    options.maxCount = limit;
  }

  if (values.color && values['no-color']) {
    throw new Error('--color and --no-color cannot both be set');
  }

  const commitFileLists = getCommitFileLists(repoPath, options);
  const matrix = buildCoChangeMatrix(commitFileLists);
  const fileCounts = countFileAppearances(commitFileLists);
  let scored = scoreCoupling(matrixToPairs(matrix), fileCounts);

  const fileArg = positionals[0];
  const targetFile = fileArg === undefined ? undefined : normalizeFileArg(repoPath, fileArg);
  if (targetFile !== undefined) {
    scored = filterPairsByFile(scored, targetFile);
  }

  if (values.heatmap) {
    const useColor = values.color || (!values['no-color'] && Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
    console.log(renderHeatmap(scored, { top, color: useColor }));
    return;
  }

  const pairs = scored.slice(0, top);
  if (pairs.length === 0) {
    console.log(
      targetFile === undefined
        ? 'no co-changed file pairs found'
        : `no co-changed pairs found for file: ${targetFile}`,
    );
    return;
  }

  for (const { a, b, count, score } of pairs) {
    console.log(`${score.toFixed(2)}\t${count}\t${a}\t${b}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`git-tangle: ${err.message}`);
  process.exitCode = 1;
}
