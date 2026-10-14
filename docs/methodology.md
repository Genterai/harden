# The method

## Contents

- The problem
- Two kinds of files
- Words
- The loop
- Principles
- Who decides what
- Compared with specs and tickets
- What harden does not do
- Case: Genter

## The problem

A change request is written by someone who does not see the system: a customer, a support agent, a founder in a
hurry, or an AI agent relaying them. It names a solution; the need is often different. The product is live, so people
rely on behaviour nobody wrote down, and most damage from a change happens outside the lines it meant to touch.

Teams answer this in two ways, and each fails in its own way:

* **Specs** describe the whole product. They are complete on the day they are written and drift from the code after
  that, because nothing forces them to move with it. Changing one means a document process separate from the code.
* **Tickets** describe one change. They are close to the work, but they vanish when the change ships: what the
  change made true is nowhere but in the code.

harden keeps the useful half of each. A **brief** per change, written before the code and kept as a record. And a
small set of **red lines** per area, the rules that must stay true, which every change folds into and every test
names.

## Two kinds of files

| | Red lines (`harden/redlines/<area>.md`) | Briefs (`harden/briefs/<date>-<slug>.md`) |
| -- | -- | -- |
| Says | what holds now | what one change needs, and what it must not break |
| Lives | as long as the product | written once; shipped or dropped |
| Changes when | a brief ships | it is written, or reality contradicts it |
| Read by | every brief, every test, every reviewer | the people working on that change |

## Words

| Word | Means |
| -- | -- |
| change request | anything that asks for a change: an idea, a ticket, a bug report, a client's spec, a line in chat |
| area | a part of the product a person would name: sharing, billing, access |
| red line | one rule of an area that must stay true, with an id: `sharing/revoke` |
| proof case | an acceptance case of an area: given, when, then; an id like `sharing/ac-share` |
| brief | the hardened form of one request: Intent, Sources, Red lines, Open, Proof |
| Open | a question or an assumption the brief cannot settle alone, `[blocking]` or `[non-blocking]` |
| Decided | an Open line that was answered, with who and when |
| tag | `[rl:area/id]` in a test's name: the red line it checks |
| retired | an id that was removed and is never used again |

## The loop

1. Read the red lines of the areas the request touches.
2. Find what exists and what was decided, and search for the answer of every question before asking it.
3. Write the brief.
4. A blocking question is open: ask, with a proposal, and stop.
5. Build against the brief; when reality contradicts it, change the brief first.
6. Prove it: tests tagged with the red lines they check; `harden check`.
7. Fold it in: the red lines the change made true go into `harden/redlines/`, the brief is shipped.

The skill ([SKILL.md](../skills/hardening-changes/SKILL.md)) walks an agent through it; the check
([red line tests](../skills/hardening-changes/references/red-line-tests.md)) makes the mechanical parts hold.

## Principles

* **A request is a hypothesis.** Find the intent behind it and an observable signal of success.
* **Learn the system before deciding.** Existing patterns beat new ones; a second implementation is a defect.
* **Reference, never copy.** A brief points at the code, a ticket, a red line by id. A copy drifts from its source
  the day it is made.
* **Name what must not change.** The behaviour people rely on, access boundaries, the meaning of data, contracts.
* **Refuse silent guesses.** Every gap becomes a question or a stated assumption. A confident wrong guess costs more
  than a question, and a question the code already answers costs the owner's time: search first.
* **Decide the proof first.** Before code, know which cases show it works and which checks show nothing broke.
* **Depth scales with risk.** A rename needs one PR line; money, access and data get the full pass.
* **Fold in or it did not happen.** A change is done when its red lines are in `harden/redlines/` and its tests
  name them.

## Who decides what

| Who | Decides |
| -- | -- |
| the owner of the product (a product owner, a founder, a lead) | blocking questions; which red lines exist |
| the person or agent doing the change | the brief, non-blocking assumptions, how to build it |
| the reviewer | that the PR's Brief line is right and its red lines hold |
| `harden check` | everything mechanical: format, links, sources, tags, ids |

An agent never answers its own blocking question, and never changes a red line on its own initiative: it proposes,
and the owner decides.

## Compared with specs and tickets

What gets better:

* Every change starts from the need and what it must not break, not from a document to update.
* What must not break is listed per area, so access and safety rules get looked at first.
* Less process: no separate spec pull request, no layers, no headers. A rename is one line in the PR.
* Proof is decided before the code, and tests name the rule they check.
* Sources point at the code and the tickets, so they do not drift the way copied text does.

What gets harder, and how harden answers it:

| Risk | Answer |
| -- | -- |
| Detail that lived in a spec's prose is no longer written down | it is in the code and its tests; Sources point there, and a search tool reads it live |
| The truth spreads over many briefs | step 7: each shipped brief folds its red lines into `harden/redlines/`; the check refuses a shipped brief that did not |
| Nobody checks the documents mechanically | `harden check` in CI: format, links, dead sources, tags, coverage, retired ids, the PR line |
| An agent decides on its own what is "non-blocking" | a fixed list of what is always blocking, "when in doubt, blocking", and the check refuses to build with a blocking question open |
| Tests claim lines they never run | `harden proof` on the junit report: skipped is not proved |

## What harden does not do

* Design: how a page looks lives in your design source. A red line can say a behaviour ("the share dialog shows the
  link with a copy button") and mark itself `(manual: checked on the canvas)`.
* Priorities and estimates: a brief says what and why, not when.
* Replace review: the check finds what a machine can; whether a red line is the right rule is a person's call.

## Case: Genter

Genter moved its product from a layered specs repository to harden in one session, with an agent:

* A specs repository of 2,435 lines of Markdown (eight specs and their governance) became six area files and three
  briefs.
* All 119 tag ids in the tests kept resolving (`"tags": ["rl", "spec"]` kept the old prefix counting).
* Tracing the tags found four that named no statement: tests claiming rules the specs had dropped.
* The first `harden check` found 45 built lines that no test checked, and the first `harden proof` showed the unit
  tests alone prove 52 of 188 lines: the rest wait on database and browser tests that need secrets.
* The only open question carried over from the specs ("do we need a chat over several sources?") was answered by
  one search: the code already took up to 20 sources per chat.

Its red lines move into [Genterai/app](https://github.com/Genterai/app), under `harden/`.
