---
name: hardening-changes
description: Hardens a change request (an idea, a ticket, a bug report, a client's spec, a one-line ask in chat) into a brief with intent, sources, red lines, open questions and proof before any code is written, then keeps the product's red lines and their tests in step as the change ships. Use it whenever a feature, fix or behaviour change is asked for in an existing product, above all when the ask is informal, vague or secondhand, or touches access, data, money, secrets or a public contract; also when writing or reviewing files in harden/redlines or harden/briefs, tagging tests [rl:area/id], moving old specs to red lines, or answering "what must not break". Not for typos, pure refactors, or questions that change nothing.
license: Apache-2.0
metadata:
  author: Genterai
  homepage: https://github.com/Genterai/harden
---

# Hardening changes

A change request is a hypothesis about what someone needs, written by a person who does not see the system. Treat it as
input to judgment, not as an order. The product is live: people rely on behaviour nobody wrote down, and most damage
from a change happens outside the lines it meant to touch.

## The files

Everything lives in the product's own repository, under `harden/`, so a brief, its code, its tests and the red lines
it changes go in one pull request.

| File | What it holds |
| -- | -- |
| `harden/redlines/<area>.md` | The red lines of one area of the live product: what must stay true, one line per id. |
| `harden/briefs/YYYY-MM-DD-<slug>.md` | One brief per change request, written before the code. |
| `harden/retired.txt` | Ids that were removed. An id is never reused, so an old test tag can never point at a new rule. |

`<skill>` below is this skill's own folder (its base directory); run every command from the repository's root.

No `harden/` yet: run `node <skill>/scripts/harden.mjs init` (or `harden init` after `npm install -g github:Genterai/harden`) in the
repository, then write the red lines of the areas the request touches, and only those. The full format is in
[references/format.md](references/format.md).

## Workflow

Copy this checklist into your answer and keep it current:

```
Hardening:
- [ ] 1. Read the red lines of the areas this touches
- [ ] 2. Find what exists and what was decided
- [ ] 3. Write the brief
- [ ] 4. Blocking question open? Ask, and stop
- [ ] 5. Build against the brief
- [ ] 6. Prove it: tagged tests, harden check
- [ ] 7. Fold it in: Red lines after, Status: shipped, harden check
```

**1. Read the red lines.** Find the areas whose Sources name the code you will change:
`grep -rl "lib/access.js" harden/redlines`. Their red lines are what must not break; read them before the request
shapes your view.

**2. Find what exists and what was decided.** Look for what already does this, what the change touches, and which
decisions, contracts and conventions govern it, in the code, the tests, earlier briefs, tickets and docs. Existing
patterns beat new ones, including a sibling product's: a second implementation of something that exists is a defect.

Before you write any Open line, search once for its answer. A question the code or a past decision already answers
costs the owner's time and hides that nobody looked; an answer found is a Source. With Genter connected, search it
first: `genter:genter_find` (genter-cli) reads the repository's files as they are now, and Genter Cloud's `search` and
`read` reach tickets, chats, mail and docs. How to search well, with Genter and without:
[references/finding-truth.md](references/finding-truth.md).

**3. Write the brief.** `node <skill>/scripts/harden.mjs new "<short name>"` makes the file. Fill it:

```
Status: open
Request: <the words as they came, from whom, when>

Intent: <one line> — success: <what someone can observe when it is done>
Sources: <code paths in backticks, area/id, ticket links: referenced, never copied>
Red lines: <area/id that must stay true, and new lines this change needs>
Open: <question> → <your proposal> [blocking | non-blocking]
Proof: <cases that show it is done> / <checks that show nothing else broke>
```

* **Request** keeps the original words. Without them nobody can tell later whether the Intent read them right.
* **Intent** names the need, not the solution the request proposed, and an observable success signal.
* **Sources** cite stable places (a path, a link, a commit), never a search index's ids or line numbers that drift.
* **Red lines** name existing lines by `area/id` instead of restating them; a restated rule drifts from its source.
* **Open** carries a proposal with each question, so the owner can answer "yes" instead of designing on the spot.
  Every gap you would fill on your own is an Open line, blocking or stated as an assumption: a confident wrong guess
  costs more than a question.
* **Proof** names the cases for "done" and the existing tests that show "not broken". For access or data, include
  the case that must be refused.

**4. Blocking question open? Ask, and stop.** A question is blocking when its answer changes what a person sees, the
data model, an API or MCP contract, access, privacy, secrets, money, or anything hard to reverse. When in doubt, it is
blocking. Ask all blocking questions in one message, each with its proposal and why; do not build the part that waits
on them. Write a non-blocking one as an assumption ("assume no") and go on. An answer moves the line to
`Decided: <answer> (who, date)`.

**5. Build against the brief.** Set `Status: building`. When reality contradicts the brief, update the brief first,
then the code; never work around it. A new gap found while building goes back to step 4.

**6. Prove it.** Write the tests Proof names and tag each with the red line it checks, in its name:
`test("[rl:access/switch-path] a source that is off answers nothing")`. Run `node <skill>/scripts/harden.mjs check`; with a
base branch, `--base origin/main` also checks the PR's Brief line and retired ids. Fix every error before you push.

**7. Fold it in.** In the same pull request, write the red lines the change made true into `harden/redlines/` (new
ids, changed text, a removed line moved to `retired.txt`), list them under `## Red lines after` in the brief, set
`Status: shipped`, and run the check again. The PR body carries `Brief: harden/briefs/<file>.md`. Without this step
the truth spreads over a hundred briefs and nobody can say what holds now.

## How deep to go

Depth scales with risk. Choose the lightest level that fits:

* **No brief.** A typo, copy within a screen's meaning, a refactor that changes no behaviour: the PR says
  `Brief: none - <why no behaviour changes>`.
* **A short brief.** A contained feature or fix: the five fields, a line each, a few Open lines at most.
* **The full pass.** Money, permissions, data, secrets, shared components or a public contract: every field, the
  refused case in Proof, and a search for every Open line.

## Example

Request: "Give baristas a shift stats screen."

```
Status: open
Request: Maria (owner, café on Main St), 2026-03-02: "baristas want to see how their shift went"

Intent: baristas see their own shift performance — success: a barista sees today's drinks and points issued on their shift
Sources: roles/barista, stats/daily-queries, `src/stats/queries.js`; design tokens in `src/ui/tokens.css`
Red lines: roles/no-revenue-for-staff, stats/owner-dashboard; new: no chart library beyond the one in use
Open: own shift or the whole store? → own shift, as the request says "their" [blocking]; show other baristas' names? → no [non-blocking]
Proof: a barista sees only their shift; a barista's request for revenue is refused; the owner dashboard renders unchanged
```

More, from a bug report to an access change with sources found by search: [references/examples.md](references/examples.md).

## Reference

* [references/format.md](references/format.md): every field, the area file, ids and retired ids, statuses, the PR
  line, `config.json`, and what each check message means.
* [references/finding-truth.md](references/finding-truth.md): learning the system before deciding, with genter-cli,
  Genter Cloud, or plain `grep` and `git log`.
* [references/red-line-tests.md](references/red-line-tests.md): the four layers of red line tests and how to put
  them in CI, for any test runner.
* [references/adopting.md](references/adopting.md): starting on a product with no specs, or moving existing specs to
  red lines without losing a test tag.
* [references/examples.md](references/examples.md): briefs for a bug, an access change and a no-brief PR.

## The script

Run `<skill>/scripts/harden.mjs` from the repository's root; there is no need to read it. Node 18 or later, no dependencies.

| Command | Does |
| -- | -- |
| `node <skill>/scripts/harden.mjs init [--area <name>]` | makes `harden/` |
| `node <skill>/scripts/harden.mjs new "<title>"` | starts a brief, prints its path |
| `node <skill>/scripts/harden.mjs check [--base <ref>] [--pr-body <file>] [--fix]` | format, links, sources, test tags, the PR's Brief line; `--fix` retires removed ids |
| `node <skill>/scripts/harden.mjs proof <junit.xml>... [--strict]` | which red lines the last test run proved |
| `node <skill>/scripts/harden.mjs list [--json]` | every red line with its sources and tests |

Each error names the file, the line and what to do; fix it and run the check again until it passes.
