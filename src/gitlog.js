import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

// A control character that cannot appear in a commit hash or a normal file
// path, used to split `git log` output back into per-commit chunks. Chosen
// over a literal string marker because it can never collide with a commit
// message or file name.
const RECORD_SEPARATOR = '\x01';

/**
 * Runs `git log --name-only` against a repository and returns, for each
 * commit, the list of files that changed in it.
 *
 * @param {string} [repoPath] - path to a git working tree (defaults to cwd)
 * @param {{maxCount?: number, maxFilesPerCommit?: number}} [options]
 * @returns {string[][]} one array of changed file paths per commit
 */
export function getCommitFileLists(repoPath = process.cwd(), options = {}) {
  const { maxCount, maxFilesPerCommit = 400 } = options;

  if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
    throw new Error(`not a directory: ${repoPath}`);
  }

  const args = ['log', '--name-only', `--pretty=format:${RECORD_SEPARATOR}%H`];
  if (maxCount !== undefined) {
    if (!Number.isInteger(maxCount) || maxCount <= 0) {
      throw new Error('maxCount must be a positive integer');
    }
    args.push('-n', String(maxCount));
  }

  let output;
  try {
    // Arguments are passed as an argv array (no shell), so nothing here is
    // subject to shell interpretation regardless of repoPath's contents.
    output = execFileSync('git', args, {
      cwd: repoPath,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 64,
    });
  } catch (err) {
    throw new Error(`git log failed in ${repoPath}: ${err.message}`);
  }

  const chunks = output.split(RECORD_SEPARATOR).filter((chunk) => chunk.trim().length > 0);

  const commits = [];
  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    // lines[0] is the commit hash printed by --pretty=format; the rest,
    // until the trailing blank line, are the changed file paths.
    const files = lines
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (files.length > maxFilesPerCommit) {
      // Huge commits (vendored dependency bumps, initial imports) blow up
      // the pairwise combination count without adding real coupling signal.
      continue;
    }
    commits.push(files);
  }

  return commits;
}
