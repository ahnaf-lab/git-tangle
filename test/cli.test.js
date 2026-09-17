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

test('CLI --heatmap renders a legend-indexed grid instead of the plain list', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }

    const output = execFileSync('node', [CLI_PATH, '--repo', dir, '--heatmap'], { encoding: 'utf8' });

    assert.match(output, /legend:/);
    assert.match(output, /a\.txt/);
    assert.match(output, /b\.txt/);
    assert.ok(!/^1\.00\t2\t/m.test(output));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI --heatmap --no-color never emits ANSI escape codes', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }

    const output = execFileSync(
      'node',
      [CLI_PATH, '--repo', dir, '--heatmap', '--no-color'],
      { encoding: 'utf8' },
    );

    assert.ok(!output.includes('\u001b['));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI rejects passing --color and --no-color together', () => {
  assert.throws(() => {
    execFileSync('node', [CLI_PATH, '--heatmap', '--color', '--no-color'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
  }, /Command failed/);
});

test('CLI single-file mode lists only pairs involving the given file', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 3; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }
    // c.txt only ever changes with b.txt, and only once, so a/b should
    // outrank b/c but both should appear when filtering on b.txt.
    writeFileSync(join(dir, 'b.txt'), 'rev extra\n');
    writeFileSync(join(dir, 'c.txt'), 'rev extra\n');
    git('add', '.');
    git('commit', '-q', '-m', 'commit with c');

    const output = execFileSync('node', [CLI_PATH, '--repo', dir, 'b.txt'], { encoding: 'utf8' });
    const lines = output.trim().split('\n');

    assert.equal(lines.length, 2);
    assert.ok(lines.every((line) => line.includes('b.txt')));
    assert.ok(!output.includes('a.txt\tc.txt') && !output.includes('c.txt\ta.txt'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI single-file mode reports no pairs for a file with no co-changes', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }
    writeFileSync(join(dir, 'solo.txt'), 'one\n');
    git('add', '.');
    git('commit', '-q', '-m', 'solo commit');

    const output = execFileSync('node', [CLI_PATH, '--repo', dir, 'solo.txt'], { encoding: 'utf8' });

    assert.match(output, /no co-changed pairs found for file: solo\.txt/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI single-file mode resolves a file argument given relative to cwd', () => {
  const { dir, git } = makeTempRepo();
  try {
    for (let i = 0; i < 2; i++) {
      writeFileSync(join(dir, 'a.txt'), `rev ${i}\n`);
      writeFileSync(join(dir, 'b.txt'), `rev ${i}\n`);
      git('add', '.');
      git('commit', '-q', '-m', `commit ${i}`);
    }

    // No --repo given: repo defaults to cwd, and the file argument is
    // resolved relative to that same cwd.
    const output = execFileSync('node', [CLI_PATH, 'a.txt'], { encoding: 'utf8', cwd: dir });

    assert.match(output, /^1\.00\t2\ta\.txt\tb\.txt$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
