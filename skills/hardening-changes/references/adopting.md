# Adopting

## Contents

- A product with nothing written down
- A product with specs
- Code in several repositories
- Keeping it alive

## A product with nothing written down

Do not write the whole product down first. Red lines grow with the changes:

1. `npm install -g github:Genterai/harden`, then `harden init --area <the area of your next change>`.
2. For the next request, write the red lines of the areas it touches, and only those: what users rely on there,
   the access boundaries, the meaning of its data, its contracts. Ten good lines beat a hundred guessed ones.
3. Find the tests that already check those lines and tag them. Mark a line with no test `(manual: how it is
   checked)` or write the test.
4. Write the brief, ship it, fold it in. The next change adds the next area.

Start `coverage` at `"warn"` if the first areas have many untested lines; turn it to `"error"` once the debt is
paid, so a new untested line fails the PR.

## A product with specs

Specs and red lines say the same things in a different shape. Map them, keep every id, and lose no test tag:

| In the specs | Becomes |
| -- | -- |
| a spec of one area | `harden/redlines/<area>.md` |
| its purpose, its "why" | `Intent:` with a success signal |
| its `code:` paths | `Sources:` in backticks |
| a statement with an id | a red line with the same id |
| an acceptance case | a line under `## Proof` |
| a `(planned)` statement | a red line marked `(planned)`, and a brief for it |
| a "Not decided" line | a brief with the question as a blocking Open line, or the area's `## Open` |
| a superseded statement | gone: add its `area/id` to `retired.txt` if tests ever tagged it |
| the old spec repository | an archive: cite it as `Owner/specs/<path>` in Sources while useful, never as authority |

Steps:

1. Copy each spec into its area file and condense: one rule per line, the words a test would check. Detail that only
   describes the look goes to the design source; detail the code already shows can go, and the code becomes the Source.
2. Keep the old tag prefix counting: `"tags": ["rl", "spec"]` in `config.json`. Old tags keep working; new tests use
   `rl`. Retag at leisure.
3. Run `harden check`. It lists every tag that names no line (often old ids the specs dropped while the tests stayed)
   and every line no test checks. Fix the first list now: each is a test claiming to check a rule that no longer
   exists.
4. Freeze the spec repository with a pointer to `harden/`.

On Genter's own product: a specs repository of 2,435 lines of Markdown (eight specs and their governance) became six
area files and three briefs, 578 lines with the process notes. All 119 tag ids in the tests kept resolving; tracing
them found four that named no statement, and the first check found 45 built lines that no test checked.

## Code in several repositories

Keep `harden/` in the repository where most of the behaviour lives, and point at the others with full paths:

```json
{ "repos": { "Acme/web": ".", "Acme/api": "../api" } }
```

`Acme/api/routes/share.js` in Sources is checked when `../api` is checked out next to this repository (as in a
workspace or a CI job that checks out both); otherwise it is skipped. A brief that spans repositories names its PRs in
each repository's body: `Brief: Acme/web/harden/briefs/<file>.md` is fine for a reader, while the check runs where the
brief lives.

A separate repository only for red lines works, but a brief, its code and its red lines then merge in two queues and
the checks race. Prefer the code's own repository.

## Keeping it alive

* Every PR that changes behaviour folds its red lines in; the check enforces it.
* A weekly agent compares the words with the code (layer 4 in [red-line-tests.md](red-line-tests.md)) and opens
  questions, never fixes.
* An area that grows past a screen or two splits in two; retire nothing, move lines with their ids (a move keeps the
  id; only the `area/` part changes, so retag the tests in the same PR and retire the old `area/id`).
