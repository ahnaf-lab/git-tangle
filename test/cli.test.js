import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../bin/git-tangle.js');

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'git-tangle-cli-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });

  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test User');

  return { dir, git };
}

test('CLI prints the strongest co-changed pair for a repo', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }

    const output = execFileSync('node', [CLI_PATH, '--repo', dir], { encoding: 'utf8' });

    assert.match(output, /^1\.00\t2\ta\.txt\tb\.txt$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI reports no pairs for a repo with no co-changes', () => {
  const { dir, git } = makeTempRepo();
  try {
    writeFileSync(join(dir, 'solo.txt'), 'one\n');
    git('add', '.');
    git('commit', '-q', '-m', 'solo commit');

    const output = execFileSync('node', [CLI_PATH, '--repo', dir], { encoding: 'utf8' });

    assert.match(output, /no co-changed file pairs found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI rejects a non-numeric --top value', () => {
  assert.throws(() => {
    execFileSync('node', [CLI_PATH, '--top', 'nope'], { encoding: 'utf8', stdio: 'pipe' });
  }, /Command failed/);
});
