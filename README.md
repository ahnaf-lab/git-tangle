# git-tangle

Mines a git repository's commit history for files that habitually change
together, so that before you refactor a file you can see what silently breaks
alongside it.

This is an early, in-progress build: the current version walks the commit
history, builds a pairwise co-change count matrix, normalizes each pair into
a 0-1 coupling score, and can render the strongest pairs as an ASCII heatmap.

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

### Single-file mode

Pass a file path as the first argument to see only the pairs involving that
file, still sorted strongest coupling first — handy right before you touch a
file and want to know what tends to break alongside it:

```sh
git-tangle src/api.js
git-tangle src/api.js --top 5
```

A relative path is resolved against the repository being analysed (the
current directory by default, or whatever `--repo` points at), so running
`git-tangle src/api.js` from inside the repo just works; absolute paths are
also accepted. If nothing has ever changed alongside the file, `git-tangle`
prints `no co-changed pairs found for file: <file>` instead of a list.

Or, without linking:

```sh
node bin/git-tangle.js --repo /path/to/repo
```

Output is one line per file pair, strongest coupling first:

```
0.86  12    src/api.js      src/api.test.js
0.54  7     src/db.js       src/migrations.js
```

Each line is `score<TAB>count<TAB>fileA<TAB>fileB`. `count` is the number of
commits in which both files changed together; `score` is that count divided
by the number of commits that touched *either* file (a Jaccard index), so a
pair that always changes together scores close to 1 even with a small commit
count, while a pair that only occasionally overlaps — because one file also
changes for unrelated reasons — scores lower despite a larger raw count.

Options:

- `<file>` — restrict output to pairs involving this file (default: show
  pairs across the whole repo)
- `--repo <path>` — repository to analyse (default: current directory)
- `--top <n>` — number of pairs to print (default: 20)
- `--limit <n>` — only look at the last `n` commits (default: all history)
- `--heatmap` — render the top pairs as an ASCII coupling grid instead of a
  plain list
- `--color` / `--no-color` — force colored heatmap output on or off (default:
  colored only when connected to a terminal)
- `--help` — show usage

### Heatmap

`--heatmap` renders the same top-N pairs as a legend-indexed grid instead of
a flat list, so you can see at a glance which files cluster together rather
than just the single strongest pair:

```
git-tangle --heatmap --top 10
```

```
top 3 coupled pair(s) across 3 file(s)

    0  1  2
 0  ·  █  ▒
 1  █  ·
 2  ▒     ·

legend:
  0  src/api.js
  1  src/api.test.js
  2  src/db.js
```

Rows and columns share the same file order; a cell's shading is the coupling
score between the row's file and the column's file (blank means the pair
never appeared together in the top-N set). `·` marks the diagonal, where a
file is compared with itself. When the output is a terminal, cells are also
colored from cool (weak coupling) to hot (strong coupling); pass `--no-color`
to disable this, or `--color` to force it when piping to a file.

## How it works

`git-tangle` shells out to `git log --name-only` to list every commit and the
files it touched, then counts every unordered pair of files that appear
together in the same commit. Each pair's raw count is normalized into a 0-1
coupling score (a Jaccard index over the commits touching either file), so
pairs are ranked by how *reliably* they change together, not just how often.
No network calls are made and no dependencies are installed beyond Node's
standard library and the `git` binary already on your system.

## Status

This project is built and updated autonomously, gated on a passing test
suite: nothing is pushed unless the tests pass.
