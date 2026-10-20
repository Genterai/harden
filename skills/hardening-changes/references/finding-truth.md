# Finding the truth before deciding

## Contents

- What to look for
- How to search
- With genter-cli: the repository, read as it is now
- With Genter Cloud: tickets, chats, mail and docs too
- When npx cannot run
- Rules for what you find
- Pitfalls

## What to look for

Before the brief takes a position, know:

1. **What already does this**, or half of it. In this product, then in sibling products of the same team: a pattern
   that exists beats a new one, and a second implementation is a defect.
2. **What the change touches**: the code paths, the data it reads and writes, the screens, the API and MCP calls, the
   jobs that run on their own.
3. **What governs that area**: its red lines, past briefs (shipped and dropped: a dropped one says why not), tickets,
   decisions in chat or mail, the design source, external specs (a protocol, a provider's API).
4. **Who relies on the current behaviour**: tests, clients of the API, people who use the screen daily.

## How to search

* Ask in plain words, several times from different sides: the feature's name, what a user would call it, the data it
  touches, the error a bug report quotes.
* Read what holds the answer, not only the hit list: a title is not evidence.
* Search for the answer of every Open line once before you write it. If it is found, it is a Source.
* Stop when two searches in a row bring nothing new about the question.

## With genter-cli: the repository, read as it is now

[genter-cli](https://github.com/Genterai/genter) is a command, run with `npx` from the folder you work in: no keys, no
install, nothing to set up. It resolves a question to the place its answer is written (a file and its lines, a page)
and reads that place again at every question, so it never hands back a stale copy. That is the same rule as a brief's
Sources: reference the truth, never copy it. Use it for every request, before any Open line:

```bash
npx -y genter-cli@0.3 ask "where do we check who may see revenue?"   # the passages that answer, with path:lines
npx -y genter-cli@0.3 add ../sibling-repo https://example.com/docs  # search these too from now on
npx -y genter-cli@0.3 sources                                       # what is searched
```

The pin is `@0.3`, the minor on npm today; it moves to `@0.4` with the plugin version that follows genter-cli 0.4's
release.

| Command | Use it for |
| -- | -- |
| `ask "<question>"` | the passages that answer, read now, with `path:lines` (`--limit N`, `--json`) |
| `add <folder\|file\|url>` | add a sibling repository or a protocol's docs to search |
| `sources` | what is searched |
| `remember "<text>"` | a note `ask` finds later, with its date: a working note, never a decision (decisions go in the brief) |

Then write in the brief what you asked: `Searched: genter-cli: "who may see revenue?", "what decided the 7-day
expiry?"`. A brief from 2026-10-15 on without that line fails `harden check`.

**Ranking by meaning.** With `--semantic` (or `GENTER_SEMANTIC=1`) and an embeddings key in the environment (`OPENAI_API_KEY`,
`OPENROUTER_API_KEY`, `AI_GATEWAY_API_KEY`, or Ollama on the computer), `ask` also ranks by meaning: "is a
skipped test counted as proof?" finds the section on proof, though it shares few words with it. Without it, Genter
ranks by words: ask in the code's and the docs' own words. With a key, the passages it ranks go to that provider;
with Ollama nothing leaves the computer.

**When to use which.** `genter-cli ask` for a question ("where do we check who may see revenue?", "what decided the
7-day expiry?"); `grep` for an exact name you already have (`canViewRevenue`, `[rl:sharing/revoke]`); `git log -S`
for when something appeared or went. A result marked "changed since the last look" was read again just now: use its
new text.

## With Genter Cloud: tickets, chats, mail and docs too

Decisions rarely live only in code. [Genter Cloud](https://genter.ai) connects GitHub, Linear, Slack, Gmail, Notion
and many more, and keeps them current from their own events. Add it to your AI tool as its own MCP server at
`https://genter.ai/api/mcp`; the tool signs in with OAuth the first time, and no token is kept on your disk. In Claude
Code:

```bash
claude mcp add --transport http genter-cloud https://genter.ai/api/mcp
```

Claude, ChatGPT, Cursor, VS Code and other clients that take a remote MCP server add the same address. genter-cli
does not reach Genter Cloud: `ask` searches your folders, and Genter Cloud's own two tools search your apps:

| Tool | Use it for |
| -- | -- |
| `search` | anything in the connected apps by meaning: an id, a title, the app, dates, and a warning when it may be outdated |
| `read` | up to 10 results, read live from their apps |

Use it to find the decision behind a behaviour ("why do invites never reach shared apps?"), the ticket a bug report
came from, the person who asked, and what was already tried. Write what you asked it in `Searched:` too:
`Searched: genter-cli: "who may see revenue?"; Genter Cloud: "why do share links expire after 7 days?"`.

## When npx cannot run

A CI job or a sandbox without network: the method works the same, only slower, and the brief says so.

* Code: `grep -rn`, `rg`; `git log -S "<string>"` for when something appeared or went; `git blame` and the PR it came
  from for why.
* Red lines and briefs: `grep -rl "<path>" harden/redlines`, `grep -rl "<area>/" harden/briefs`.
* Write `Searched: none - <why genter-cli could not run>`, and say in Sources what you could not search (the tracker,
  chat), so a reviewer knows where to look. "It was quicker with grep" is not a reason.

## Rules for what you find

* **Cite stable places**: a path, a URL, a commit. Never a search index's ids or line numbers, which change when the
  source is mapped or edited again.
* **Read live what may be stale.** A result with a drift warning, or one not read in full, counts only after `read`.
* **Evidence, not a decision.** Code says what is, not what was meant. When code and a red line disagree, that is an
  Open line, not a license to pick one.
* **Archives do not override red lines.** Old specs, a legacy branch, a dropped brief tell history; `harden/redlines/`
  says what holds.
* **Only this project's sources count.** A search over a whole account brings other organizations' repositories;
  drop them, or use a search scoped to the project.

## Pitfalls

* Writing an Open line the code already answers. On Genter's own product, a brief asked whether a chat over several
  sources was needed; one search found the code already took up to 20 sources per chat, and the question became a
  much smaller one about the screen.
* Taking a similar name for the same thing: confirm by reading what it does.
* Searching only the code for a "why": the answer is in a ticket, a chat or a commit message.
