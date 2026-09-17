#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { getCommitFileLists } from '../src/gitlog.js';
import { buildCoChangeMatrix, matrixToPairs } from '../src/matrix.js';
import { countFileAppearances, scoreCoupling } from '../src/score.js';
import { renderHeatmap } from '../src/heatmap.js';

function printHelp() {
  console.log(`git-tangle - mine commit history for files that change together

Usage:
  git-tangle [--repo <path>] [--top <n>] [--limit <n>]
  git-tangle --heatmap [--repo <path>] [--top <n>] [--limit <n>] [--color|--no-color]

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

function main(argv) {
  const { values } = parseArgs({
    args: argv,
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
  const scored = scoreCoupling(matrixToPairs(matrix), fileCounts);

  if (values.heatmap) {
    const useColor = values.color || (!values['no-color'] && Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
    console.log(renderHeatmap(scored, { top, color: useColor }));
    return;
  }

  const pairs = scored.slice(0, top);
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
