# git-tangle

Mines a git repository's commit history for files that habitually change
together, so that before you refactor a file you can see what silently breaks
alongside it.

This is an early, in-progress build: the current version walks the commit
history and builds a pairwise co-change count matrix, printed as a plain
ranked list. Coupling scores and the ASCII heatmap view are not built yet.

## Install

Requires Node.js 18.3 or later and `git` on your `PATH`.

```sh
npm install
```

To use the `git-tangle` command from anywhere, link it globally:

```sh
npm link
```

## Usage

Run it inside (or pointed at) any git repository:

```sh
git-tangle
git-tangle --repo /path/to/other/repo
git-tangle --top 10
git-tangle --limit 500
```

Or, without linking:

```sh
node bin/git-tangle.js --repo /path/to/repo
```

Output is one line per file pair, most co-changed first:

```
12    src/api.js      src/api.test.js
7     src/db.js       src/migrations.js
```

Each line is `count<TAB>fileA<TAB>fileB`, where `count` is the number of
commits in which both files changed together.

Options:

- `--repo <path>` — repository to analyse (default: current directory)
- `--top <n>` — number of pairs to print (default: 20)
- `--limit <n>` — only look at the last `n` commits (default: all history)
- `--help` — show usage

## How it works

`git-tangle` shells out to `git log --name-only` to list every commit and the
files it touched, then counts every unordered pair of files that appear
together in the same commit. No network calls are made and no dependencies
are installed beyond Node's standard library and the `git` binary already on
your system.

## Status

This project is built and updated autonomously, gated on a passing test
suite: nothing is pushed unless the tests pass.
