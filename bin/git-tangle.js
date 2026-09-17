#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { getCommitFileLists } from '../src/gitlog.js';
import { buildCoChangeMatrix, matrixToPairs } from '../src/matrix.js';
import { countFileAppearances, scoreCoupling } from '../src/score.js';

function printHelp() {
  console.log(`git-tangle - mine commit history for files that change together

Usage:
  git-tangle [--repo <path>] [--top <n>] [--limit <n>]

Options:
  --repo <path>   path to the git repository to analyse (default: cwd)
  --top <n>       number of strongest pairs to print (default: 20)
  --limit <n>     only look at the last <n> commits (default: all)
  --help          show this help text

Output is one line per pair: score<TAB>count<TAB>fileA<TAB>fileB, sorted by
score (0-1 coupling strength) with count as a tiebreak.
`);
}

function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      repo: { type: 'string', default: process.cwd() },
      top: { type: 'string', default: '20' },
      limit: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    printHelp();
    return;
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

  const commitFileLists = getCommitFileLists(repoPath, options);
  const matrix = buildCoChangeMatrix(commitFileLists);
  const fileCounts = countFileAppearances(commitFileLists);
  const pairs = scoreCoupling(matrixToPairs(matrix), fileCounts).slice(0, top);

  if (pairs.length === 0) {
    console.log('no co-changed file pairs found');
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
