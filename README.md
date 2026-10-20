<h1 align="center">harden</h1>

<p align="center">
  Harden a change request before anyone writes code.<br>
  A brief for each change, red lines that tests name, and one check that keeps them in step.
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#add-it-to-your-workflow">Add it to your workflow</a> ·
  <a href="#find-what-exists-with-genter">With Genter</a> ·
  <a href="#genter-cloud-the-decisions-behind-the-code">Genter Cloud</a> ·
  <a href="#the-method">The method</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="dependencies: 0">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-339933" alt="node >= 18">
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/Agent%20Skill-hardening--changes-8A2BE2" alt="Agent Skill"></a>
</p>

**A Claude Code plugin.** Install it, then ask for a change the way you always do. Before writing code, the agent
writes a **brief**: what the change is for, what already exists (found with [genter-cli](https://github.com/Genterai/genter),
which it runs with `npx`), what must not break, and what it has to ask you. Then it builds, and one check in CI
keeps the product's **red lines** and the tests that prove them in step, change after change.

"Make share links expire." A coding agent will happily write that in ten minutes. It guesses the duration, breaks
revoke and leaves no trace of why. A request is a hypothesis written by someone who doesn't see the system. harden makes
the agent find out first, and ask only what it could not find.

```bash
claude plugin marketplace add Genterai/harden
claude plugin install harden@harden
```

```
your-repo/
├── harden/
│   ├── redlines/<area>.md        what must stay true, one line per id; tests name them [rl:area/id]
│   ├── briefs/<date>-<slug>.md   one brief per change, written before the code
│   └── retired.txt               removed ids, never reused
├── AGENTS.md                     the loop, for every agent on the team
└── .github/
    ├── pull_request_template.md  "Brief: harden/briefs/<file>.md" on every PR
    └── workflows/harden.yml      harden check: red lines, briefs and test tags agree
```

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
$ harden check --base origin/main
error  harden/briefs/2026-10-14-share-links-expire.md:9  Status is building but a blocking question is open: "how long? → 7 days, the shortest support asked for [blocking]"; answer it and move it to "Decided:"
error  test/share.test.js:20  [sharing/revoked] tags no red line; did you mean sharing/revoke?
error  harden/redlines/sharing.md:10  sharing/revoke has no test: tag one [rl:sharing/revoke], or mark it (planned) or (manual: why)
harden: 3 errors, 0 warnings · 2 areas, 5 lines, 5 tags in 1 test files, 1 briefs
```

When it ships, the brief's new red line is folded into `harden/redlines/sharing.md`, and the next change starts from
there.

## Quickstart

**1. Install the plugin.** It brings the skill and the `harden` check. The skill runs genter-cli with `npx`: nothing
else to install.

```bash
claude plugin marketplace add Genterai/harden
claude plugin install harden@harden
```

(Or, inside a session, `/plugin marketplace add Genterai/harden` and `/plugin install harden@harden`.)

The [Genter](https://github.com/Genterai/genter) marketplace lists harden too: `/plugin marketplace add Genterai/genter`,
then `/plugin install harden@genter`, next to Genter's own plugin (`genter@genter`).

Any other agent that reads [Agent Skills](https://agentskills.io): copy [`skills/hardening-changes/`](skills/hardening-changes)
into its skills folder; it needs a shell with `npx` for genter-cli. On claude.ai, upload that folder
as a ZIP in your skills settings.

**2. Turn on ranking by meaning** (recommended): the agent finds what exists from its own words, not only the code's.

```bash
export GENTER_SEMANTIC=1
export OPENAI_API_KEY=sk-...    # or OPENROUTER_API_KEY, AI_GATEWAY_API_KEY; or Ollama, and nothing leaves the computer
```

**3. Start `harden/` in your repository.**

```bash
cd your-repo
npm install -g github:Genterai/harden
harden init --area sharing
harden check
```

Edit `harden/redlines/sharing.md`. Set its `Sources:` (the code of the area, in backticks) and write three to ten red
lines that people rely on there. Don't write the whole product down: red lines grow with each change.

**4. Ask for a change, the way you always do.**

```
> make share links expire
```

The skill starts on its own. The agent reads the red lines, searches what exists with `npx -y genter-cli ask`, writes the brief (its `Searched:` line says what it asked),
asks its blocking questions with a proposal for each, and only then builds. To start a brief yourself:
`harden new "Share links expire"`.

## Add it to your workflow

### What a change looks like

| | Without harden | With harden |
| -- | -- | -- |
| A request arrives | the agent starts coding | the agent reads the red lines of the areas it touches |
| What exists | it greps the names it guesses | `genter-cli ask` returns the code, tests and earlier briefs that answer, with `path:lines` |
| A gap | filled silently with a guess | a blocking question with a proposal, and the work waits; you answer "yes" |
| The code | matches the request | matches the brief; when reality disagrees, the brief changes first |
| The tests | whatever was written | the ones the brief's Proof names, tagged `[rl:area/id]` |
| The pull request | a diff | a diff plus `Brief: harden/briefs/…`, and red lines folded into `harden/redlines/` |
| Six months later | "why does it do this?" | the brief says why, and the check fails if a red line loses its test |

### An existing repository

[`examples/workflow/`](examples/workflow) holds the three files to copy:

1. **Install the plugin** and run `harden init --area <area>` for the area of your next change. Leave the rest of the
   product for later: each change adds the red lines of the areas it touches.
2. **Tell every agent the loop**: append [`AGENTS.md`](examples/workflow/AGENTS.md) to your `AGENTS.md` or
   `CLAUDE.md`. Agents without the plugin (Cursor, Codex, a teammate's setup) follow it too.
3. **Every PR names its brief**: [`pull_request_template.md`](examples/workflow/pull_request_template.md) goes to
   `.github/`.

   ```
   Brief: harden/briefs/2026-10-14-share-links-expire.md
   Brief: none - a rename, no behaviour changes
   ```

4. **CI keeps it honest**: [`harden.yml`](examples/workflow/harden.yml) goes to `.github/workflows/`. It runs
   `harden check --base`, which reads the PR's `Brief:` line.
5. **Already have specs?** Keep their ids and their test tags:
   [adopting.md](skills/hardening-changes/references/adopting.md) maps every part of a spec to a red line or a brief.

### A new project

Run `harden init` on the first day, before there is much code. Write the red lines as the first features land: one
area per part of the product, a few lines each. Every later change starts from what is already true, and the check
fails the day a red line loses its test.

## Find what exists, with Genter

Most of the cost of a brief is finding what already exists and what was already decided. The skill runs
[genter-cli](https://github.com/Genterai/genter) for that, always, with `npx -y genter-cli@0.3 ask "<question>"`: no
keys, no install, no server to set up (the pin moves to `@0.4` once genter-cli 0.4 is on npm). It resolves a question
to the place its answer is written (a
file and its lines) and reads that place again at every question, so a brief never cites a stale copy. The principle is
the same as a brief's Sources: reference the truth, never copy it.

| Step | With `grep` | With genter-cli |
| -- | -- | -- |
| 2. What exists | guess the names, read every hit | "where do we check who may see revenue?" returns the passages that answer, with `path:lines` |
| 2. Each Open line | often skipped | one search per question before it is written, so a question the code answers never reaches you |
| 3. Sources | the paths you happened to find | `path:lines` that were just read |
| A question in other words | no hit | with meaning on: "is a skipped test counted as proof?" finds the section on proof |

With `GENTER_SEMANTIC=1` and an embeddings key, Genter ranks by meaning as well as by words. On genter-cli's
[DriftBench](https://github.com/Genterai/genter#benchmarks), that raises current answers from 77% to 88%. Without a key
it ranks by words and nothing leaves your computer. A brief from 2026-10-15 on says in `Searched:` what genter-cli was
asked, and `harden check` fails without it; only where `npx` cannot run (no network) does it say `none - why` and fall
back to `grep` and `git log`. More: [docs/with-genter.md](docs/with-genter.md).

## Genter Cloud: the decisions behind the code

Why the code does what it does is usually written in a ticket, a Slack thread or an email. [Genter Cloud](https://genter.ai)
connects GitHub, Linear, Slack, Gmail, Notion and 500 more apps and keeps them current from their own events. It is
optional, and it is its own MCP server in your AI tool: genter-cli searches your repository, and Genter Cloud's
`search` and `read` search your apps.

1. Sign up at [genter.ai](https://genter.ai) and connect the apps where your team decides things.
2. Add Genter Cloud to your AI tool as its own MCP server at `https://genter.ai/api/mcp`. The tool signs you in with
   OAuth the first time, and no token is kept on your disk. In Claude Code:

   ```bash
   claude mcp add --transport http genter-cloud https://genter.ai/api/mcp
   ```

   Claude, ChatGPT, Cursor, VS Code and other clients that take a remote MCP server add the same address.
3. Ask for a change as before. A brief's Sources now cite the ticket and the thread a rule came from. A question that
   was already answered in chat becomes `Decided:` with who decided it and when, instead of reaching you again.

genter-cli 0.3's `login` and `GENTER_TOKEN` no longer reach Genter Cloud (genter.ai answers 404 where they pointed),
and genter-cli 0.4 removes them.

## Try it on the example

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

## Commands

| Command | Does |
| -- | -- |
| `harden init [--area <name>]` | makes `harden/` |
| `harden new "<title>"` | starts a brief, prints its path |
| `harden check [--base <ref>] [--pr-body <file>] [--fix]` | layers 1 and 2; `--fix` retires removed ids |
| `harden proof <junit.xml>... [--strict] [--out <file>]` | layer 3 |
| `harden list [--json]` | every red line with its sources and tests, for an audit agent |

Install with `npm install -g github:Genterai/harden` (pin a commit with `#<sha>`), or run
`node skills/hardening-changes/scripts/harden.mjs` from a clone. `npx github:…` is not recommended: npm 10.9 fails
on it with "GitFetcher requires an Arborist constructor". Node 18 or later, no dependencies. The file format: [format.md](skills/hardening-changes/references/format.md).

## In this repository

| Path | What |
| -- | -- |
| [`skills/hardening-changes/`](skills/hardening-changes) | the skill: `SKILL.md`, its references, templates and the `harden` script |
| [`docs/`](docs) | the method, and working with Genter |
| [`examples/notes/`](examples/notes) | a tiny app to try it on |
| [`examples/workflow/`](examples/workflow) | the files that put harden into a repository's workflow |
| [`evals/evals.json`](evals/evals.json) | prompts and assertions to test the skill, with and without it |
| [`harden/`](harden) | this repository's own red lines: the check is its own first user |
| [`.claude-plugin/`](.claude-plugin) | the Claude Code plugin (the skill) and marketplace |

## Questions

**Isn't this just specs again?** No. Specs describe the whole product and drift; red lines are only what must stay
true, a few lines per area, and the check fails when they drift from the tests or the code. The detail stays in the
code, where Sources point.

**Does it need Claude?** No. The check is plain Node and the files are Markdown. The skill follows the Agent Skills
format, so any agent that reads skills can use it, and people can follow the method by hand.

**Does it need Genter?** No. genter-cli comes with the plugin because it makes step 2 fast, and Genter Cloud is
optional. Without either, the agent searches with `grep` and `git log`: slower, not different.

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
