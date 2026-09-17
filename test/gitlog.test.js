import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCommitFileLists } from '../src/gitlog.js';
import { buildCoChangeMatrix } from '../src/matrix.js';

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'git-tangle-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });

  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test User');

  return { dir, git };
}

test('getCommitFileLists returns one file list per commit, newest first', () => {
  const { dir, git } = makeTempRepo();
  try {
    writeFileSync(join(dir, 'a.txt'), 'one\n');
    writeFileSync(join(dir, 'b.txt'), 'one\n');
    git('add', '.');
    git('commit', '-q', '-m', 'first commit');

    writeFileSync(join(dir, 'a.txt'), 'two\n');
    writeFileSync(join(dir, 'c.txt'), 'one\n');
    git('add', '.');
    git('commit', '-q', '-m', 'second commit');

    const commits = getCommitFileLists(dir);

    assert.equal(commits.length, 2);
    assert.deepEqual(commits[0].sort(), ['a.txt', 'c.txt']);
    assert.deepEqual(commits[1].sort(), ['a.txt', 'b.txt']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('getCommitFileLists feeds directly into a matrix that finds the coupled pair', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 3; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }
    writeFileSync(join(dir, 'unrelated.txt'), 'solo\n');
    git('add', '.');
    git('commit', '-q', '-m', 'unrelated change');

    const commits = getCommitFileLists(dir);
    const matrix = buildCoChangeMatrix(commits);

    assert.equal(matrix.get('a.txt\u0000b.txt'), 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('getCommitFileLists throws a clear error for a non-existent path', () => {
  assert.throws(
    () => getCommitFileLists(join(tmpdir(), 'git-tangle-does-not-exist')),
    /not a directory/,
  );
});
