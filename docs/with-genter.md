# Faster with Genter

## Contents

- Where the time goes
- What Genter changes
- What we saw
- Set it up
- Measure it on your team
- Caveats

## Where the time goes

Most of the cost of hardening a request is step 2: finding what already exists and what was already decided. Done
badly it costs twice. An agent that does not look asks the owner questions the code already answers. An agent that
looks in a stale copy cites a rule that no longer holds, and the brief is wrong before the code starts.

Two tools from the same team make step 2 fast and current. The skill always runs the first, with `npx`:

* **[genter-cli](https://github.com/Genterai/genter)** (Apache-2.0, no dependencies) resolves a question to the place
  its answer is written in your folders, files and websites, and reads that place again every time.
* **[Genter Cloud](https://genter.ai)** does the same over your apps: GitHub, Linear, Slack, Gmail, Notion and many
  more, kept current from their own events, behind one MCP URL with `search` and `read`.

## What Genter changes

| Step | Without | With genter-cli | With Genter Cloud |
| -- | -- | -- | -- |
| 1. Red lines | `grep` in `harden/redlines` | the same, plus "which red line is about revoking links?" by meaning | the same |
| 2. What exists | `grep`, guessing names | `npx genter-cli ask` over this and sibling repositories, read now, with `path:lines` | also tickets, chats, mail, docs: the decision behind the code |
| 2. Each Open line | often skipped | one search per question before it is written | the same, across the team's apps |
| 3. Sources | paths you happened to find | `path:lines` that were just read | links to the ticket and the thread |
| 6. Proof | the tests you know | the tests that tag a line (`harden list`) and the code they cover | the same |
| Layer 4 audit | not done | a weekly agent reads each red line's code live | the same, plus the tickets it came from |

The principle is the same on both sides. A brief references its sources and never copies them; Genter keeps where an
answer is written and reads it again at every question. Neither holds a copy that can go stale.

## What we saw

On Genter's own product, hardening two requests with Genter Cloud connected (one session, not a benchmark):

* An open question carried over from the old specs, whether to build a chat over several sources, was answered by
  the first search: the code already took up to 20 sources per chat. The question shrank to one about the screen.
* For "let a coding agent see only this project", three searches found that scoping already existed for chat modes,
  that a sibling product already limited agents to some sites (an empty list lifts the limit), and that the data held
  no unit finer than a connected account. The last one became a blocking question that would otherwise have surfaced
  in code review.
* The same searches also returned other organizations' repositories from the same account. That is why the skill
  says to count only the project's sources.

On staleness, genter-cli's own benchmark ([DriftBench](https://github.com/Genterai/genter/tree/main/bench/drift): the
docs of a 40-person company, 61 edits over two months, the same 65 questions before and after) reports, after the
edits, 0% stale answers when sources are read at each question, against 42% for an index built once with the same
ranking. A brief written from such an index would cite the old rule in about two answers out of five.

## Set it up

**The skill runs genter-cli, always.** Step 2 runs `npx -y genter-cli@0.3 ask "<question>"` in the folder Claude Code
works in: no keys, no install, no MCP server to set up, and the minor version is pinned so a new one reaches people
only with a new plugin version (`@0.3` today; it moves to `@0.4` once genter-cli 0.4 is on npm). The brief's `Searched:` line says what was asked, and `harden check` fails a brief from
2026-10-15 on without it.

**Turn on ranking by meaning** (recommended). Put this in your shell profile and restart Claude Code:

```bash
export GENTER_SEMANTIC=1
export OPENAI_API_KEY=sk-...    # or OPENROUTER_API_KEY, AI_GATEWAY_API_KEY; or run Ollama: ollama pull nomic-embed-text
```

The agent can then ask in its own words ("is a skipped test counted as proof?") and still find the section that
answers. On genter-cli's DriftBench, current answers go from 77% to 88% with meaning. It is opt-in because with a key
the passages Genter ranks go to that provider; with Ollama nothing leaves the computer.

**Add your team's apps** (optional). Sign up at [genter.ai](https://genter.ai) and connect GitHub, Linear, Slack,
Gmail, Notion or any of 500 more. Then add Genter Cloud to your AI tool as its own MCP server at
`https://genter.ai/api/mcp`; the tool signs you in with OAuth the first time, and no token is kept on your disk. In
Claude Code:

```bash
claude mcp add --transport http genter-cloud https://genter.ai/api/mcp
```

The agent then searches your folders with `genter-cli ask` and your apps with Genter Cloud's `search` and `read`: the
ticket a request came from, the thread where the rule was decided. genter-cli 0.3's `login` and `GENTER_TOKEN` no
longer reach Genter Cloud, and genter-cli 0.4 removes them.

**From the Genter marketplace.** `/plugin marketplace add Genterai/genter` lists harden too (`/plugin install
harden@genter`), next to Genter's own plugin (`genter@genter`).

**Without the plugin**, any agent with a shell does the same: `npx -y genter-cli@0.3 ask "<question>"`
([finding-truth.md](../skills/hardening-changes/references/finding-truth.md)).

## Measure it on your team

Count, per brief, for a few weeks with and without Genter:

* Open lines written, and how many the owner answered with "it's already there" (questions that search would have
  answered);
* briefs sent back to `open` from `building` (reality contradicted the brief);
* time from the request to the first commit.

The evals in [evals/evals.json](../evals/evals.json) include one built for this: a request whose answer is already in
the code.

## Caveats

* **Scope.** A search over a whole account returns other projects. Drop them, or give the agent a search scoped to
  the project.
* **Archives.** Old specs and legacy branches show up next to the code. They are history; `harden/redlines/` says what
  holds.
* **Evidence, not decisions.** Genter finds what is written. Whether it is still meant is a question for the owner.
* **No network.** Where `npx` cannot run (a sandbox, a CI job), the brief says `Searched: none - <why>` and the agent
  falls back to `grep` and `git log`: slower, not different. "Quicker with grep" is not a reason.
