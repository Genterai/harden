# Finding the truth before deciding

## Contents

- What to look for
- How to search
- With genter-cli: the repository, read as it is now
- With Genter Cloud: tickets, chats, mail and docs too
- Without Genter
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

[genter-cli](https://github.com/Genterai/genter) resolves a question to the place its answer is written (a file and
its lines, a page) and reads that place again at every question, so it never hands back a stale copy. That is the
same rule as a brief's Sources: reference the truth, never copy it.

```bash
claude mcp add genter -- npx -y genter-cli mcp     # Claude Code; any MCP client works the same way
npx genter-cli ask "where do we check who may see revenue?"
```

Its tools, as an MCP server named `genter`:

| Tool | Use it for |
| -- | -- |
| `genter:genter_find` | the passages that answer a question, read now, with `path:lines` |
| `genter:genter_add` | add a folder, a file or a website to search (a sibling repository, a protocol's docs) |
| `genter:genter_sources` | what is searched |
| `genter:genter_remember` | a note it finds later, with its date: a working note, never a decision (decisions go in the brief) |

A result marked "changed since the last look" was read again just now: use its new text.

## With Genter Cloud: tickets, chats, mail and docs too

Decisions rarely live only in code. [Genter Cloud](https://genter.ai) connects GitHub, Linear, Slack, Gmail, Notion
and many more, keeps them current from their own events, and serves them over one MCP URL with two tools:

| Tool | Use it for |
| -- | -- |
| `search` | anything in the connected apps by meaning: an id, a title, the app, dates, and a warning when it may be outdated |
| `read` | up to 10 results, read live from their apps |

From genter-cli: `genter login <token>`, and `genter ask` / `genter mcp` search your folders first, then your apps.

Use it to find the decision behind a behaviour ("why do invites never reach shared apps?"), the ticket a bug report
came from, the person who asked, and what was already tried.

## Without Genter

* Code: `grep -rn`, `rg`, your editor's search; `git log -S "<string>"` for when something appeared or went;
  `git blame` and the PR it came from for why.
* Red lines and briefs: `grep -rl "<path>" harden/redlines`, `grep -rl "<area>/" harden/briefs`.
* Say in the brief's Sources what you could not search (the tracker, chat), so a reviewer knows where to look.

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
