<h1 align="center">harden</h1>

<p align="center">
  Harden a change request before anyone writes code.<br>
  A brief for each change, red lines that tests name, and one check that keeps them in step.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="dependencies: 0">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-339933" alt="node >= 18">
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/Agent%20Skill-hardening--changes-8A2BE2" alt="Agent Skill"></a>
</p>

"Make share links expire." A coding agent will happily write that in ten minutes, guessing the duration, breaking
revoke, and leaving no trace of why. A request is a hypothesis written by someone who doesn't see the system. harden
turns it into a **brief** first: what the change is for, where the truth lives, what must not break, what is still
open, and how it will be proved. Then it keeps the product's **red lines** and the tests that check them in step,
change after change.

It is three things: a method, an [Agent Skill](skills/hardening-changes/SKILL.md) that walks Claude (or any agent
that reads skills) through it, and `harden`, a zero-dependency check for CI.

## What it looks like

A request comes in. Before code, the agent writes `harden/briefs/2026-10-14-share-links-expire.md`:

```markdown
Status: open
Request: Anna (support), 2026-10-01: "customers ask why a link from last year still works"

Intent: a shared link stops working after a while — success: an 8-day-old link answers 404
Sources: sharing/revoke, `src/share.js`, https://linear.app/acme/issue/SUP-412
Red lines: sharing/read-only, sharing/revoke; new: sharing/expiry
Open: how long? → 7 days, the shortest support asked for [blocking]
Proof: an 8-day-old link answers 404; a 6-day-old one works / sharing/ac-share passes unchanged
```

The question is blocking, so the agent asks and waits. The red lines it must not break live with the code, in
`harden/redlines/sharing.md`:

```markdown
* **[read-only]** A link shows copies of its notes; nothing can change a note through it.
* **[revoke]** A revoked link answers 404 at once.
```

Tests name the line they check. Here someone started building before the answer came, and mistyped a tag:

```js
test("[rl:sharing/revoke] a revoked link answers 404 at once", () => { /* … */ });
```

```
$ npx -y github:Genterai/harden check --base origin/main
error  harden/briefs/2026-10-14-share-links-expire.md:9  Status is building but a blocking question is open: "how long? → 7 days, the shortest support asked for [blocking]"; answer it and move it to "Decided:"
error  test/share.test.js:20  [sharing/revoked] tags no red line; did you mean sharing/revoke?
error  harden/redlines/sharing.md:10  sharing/revoke has no test: tag one [rl:sharing/revoke], or mark it (planned) or (manual: why)
harden: 3 errors, 0 warnings · 2 areas, 5 lines, 5 tags in 1 test files, 1 briefs
```

When it ships, the brief's new red line is folded into `harden/redlines/sharing.md`, and the next change starts from
there.

## Quickstart

**1. Give your agent the skill.**

Claude Code:

```bash
claude plugin marketplace add Genterai/harden
claude plugin install harden@harden
```

(or, inside a session, `/plugin marketplace add Genterai/harden` and `/plugin install harden@harden`.)

Any other agent that reads [Agent Skills](https://agentskills.io): copy
[`skills/hardening-changes/`](skills/hardening-changes) into its skills folder (for Claude Code without the plugin:
`.claude/skills/` in your repository, or `~/.claude/skills/`). On claude.ai, upload that folder as a ZIP in your
skills settings.

**2. Start `harden/` in your repository.**

```bash
cd your-repo
npx -y github:Genterai/harden init --area sharing
npx -y github:Genterai/harden check
```

`init` makes `harden/` with one area, the brief template, `retired.txt` and `config.json`. Edit
`harden/redlines/sharing.md`: its `Sources:` (the code of the area, in backticks) and three to ten red lines that
people rely on there. Don't write the whole product down; red lines grow with each change.

**3. Ask for a change, the way you always do.**

```
> make share links expire
```

The skill triggers on its own. The agent reads the red lines, searches what exists, writes the brief, asks its
blocking questions with a proposal each, and only then builds. Prefer to start one yourself:
`npx -y github:Genterai/harden new "Share links expire"`.

**4. Put the check in CI.**

```yaml
# .github/workflows/harden.yml
name: harden
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx -y github:Genterai/harden#v0.1.0 check --base origin/${{ github.base_ref }}
```

Every PR that changes code an area names now carries one line, which the check reads from the PR:

```
Brief: harden/briefs/2026-10-14-share-links-expire.md
Brief: none - a rename, no behaviour changes
```

**5. Optional: give the agent [Genter](docs/with-genter.md)**, so step 2 reads your code, tickets and docs as they are
now:

```bash
claude mcp add genter -- npx -y genter-cli mcp
```

### Try it first on the example

```bash
git clone https://github.com/Genterai/harden && cd harden/examples/notes
npm test && npm run check
claude "support keeps asking: share links live forever. make them expire"
```

[`examples/notes`](examples/notes) is a tiny notes app with share links, two areas of red lines and tagged tests. The
same prompts are the skill's [evals](evals/evals.json).

## The method

1. **Read the red lines** of the areas the request touches.
2. **Find what exists and what was decided.** Search for the answer of every question before asking it.
3. **Write the brief**: Intent with a success signal, Sources referenced and never copied, Red lines by id, Open
   with a proposal each, Proof.
4. **A blocking question is open: ask, and stop.** Blocking means it changes what people see, the data model, a
   contract, access, privacy, money, or anything hard to reverse. In doubt, it is blocking.
5. **Build against the brief.** When reality contradicts it, change the brief first.
6. **Prove it**: tests tagged `[rl:area/id]`; `harden check`.
7. **Fold it in**: the red lines it made true go into `harden/redlines/`; the brief is shipped.

Depth scales with risk: a rename needs one PR line; money, permissions and data get the full pass. Why it works, what
it costs, and how it compares with specs and tickets: [docs/methodology.md](docs/methodology.md).

## Red line tests

Specs drift from code because nothing checks them. harden checks in four layers, and only the deterministic ones
block a merge:

| Layer | Catches | Command |
| -- | -- | -- |
| 1. Format | broken briefs, reused ids, Sources pointing at code that moved | `harden check` |
| 2. Agreement | a test tag that names no rule, a rule no test checks, code changed without a brief | `harden check --base <ref>` |
| 3. Proof | a rule whose only tests were skipped or did not run | `harden proof junit.xml` |
| 4. Meaning | a rule whose words no longer match what the code does | a weekly agent, never blocking |

Layer 3 matters more than it looks: on [Genter](docs/methodology.md#case-genter), unit tests alone proved 52 of 188
lines, while layer 2 counted every one of them as covered. Setup for CI and for each test runner:
[red-line-tests.md](skills/hardening-changes/references/red-line-tests.md).

## Faster with Genter

Most of the cost of a brief is finding what exists and what was decided. [genter-cli](https://github.com/Genterai/genter)
reads your folders, files and websites as they are at each question, never a stale copy; [Genter Cloud](https://genter.ai)
adds your tickets, chats, mail and docs. With either connected, the skill searches there first, and questions the
code already answers never reach the owner. What we saw, and how to measure it on your team:
[docs/with-genter.md](docs/with-genter.md).

## Commands

| Command | Does |
| -- | -- |
| `harden init [--area <name>]` | makes `harden/` |
| `harden new "<title>"` | starts a brief, prints its path |
| `harden check [--base <ref>] [--pr-body <file>] [--fix]` | layers 1 and 2; `--fix` retires removed ids |
| `harden proof <junit.xml>... [--strict] [--out <file>]` | layer 3 |
| `harden list [--json]` | every red line with its sources and tests, for an audit agent |

Run with `npx -y github:Genterai/harden <command>`, or `node skills/hardening-changes/scripts/harden.mjs` from a
clone. Node 18 or later, no dependencies. The file format: [format.md](skills/hardening-changes/references/format.md).

## In this repository

| Path | What |
| -- | -- |
| [`skills/hardening-changes/`](skills/hardening-changes) | the skill: `SKILL.md`, its references, templates and the `harden` script |
| [`docs/`](docs) | the method, and working with Genter |
| [`examples/notes/`](examples/notes) | the quickstart's example app |
| [`evals/evals.json`](evals/evals.json) | prompts and assertions to test the skill, with and without it |
| [`harden/`](harden) | this repository's own red lines: the check is its own first user |
| [`.claude-plugin/`](.claude-plugin) | the Claude Code plugin and marketplace |

## Questions

**Isn't this just specs again?** No. Specs describe the whole product and drift; red lines are only what must stay
true, a few lines per area, and the check fails when they drift from the tests or the code. The detail stays in the
code, where Sources point.

**Does it need Claude?** No. The check is plain Node and the files are Markdown. The skill follows the Agent Skills
format, so any agent that reads skills can use it, and people can follow the method by hand.

**We already have specs.** Keep their ids and their test tags: [adopting.md](skills/hardening-changes/references/adopting.md)
maps every part of a spec to a red line or a brief.

**Where do the files live?** In the product's own repository, so a brief, its code, its tests and its red lines
merge in one pull request. Code in several repositories: see adopting.md.

## Contributing

Issues and pull requests are welcome. This repository uses harden on itself: a PR that changes the check or the skill
carries a `Brief:` line, and `npm test` and `npm run check` pass. A change to the skill should keep the
[evals](evals/evals.json) passing; say in the PR how you ran them.

## License

[Apache-2.0](LICENSE).
