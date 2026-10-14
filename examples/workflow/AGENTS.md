<!-- Paste into your AGENTS.md or CLAUDE.md. -->

## Red lines come first

What the product must keep true lives in `harden/`: `harden/redlines/<area>.md` (every area names its code under
`Sources:`) and one brief per change in `harden/briefs/`. Before changing anything a person, an API or a client could
observe:

1. Find the areas of what you touch: `grep -rl "<path you touch>" harden/redlines`, and read their red lines.
2. Find what exists and what was decided with Genter (`genter_find`): the code, tests, earlier briefs, docs; with
   Genter Cloud, tickets and chats too. An answer found is a Source, not a question.
3. Write the brief (`harden new "<title>"`). A blocking question (what a person sees, the data model, a contract,
   access, privacy, anything hard to reverse; in doubt, blocking) goes to the owner with a proposal, and that part of
   the work waits. Never fill a gap silently in code.
4. Tag a test that verifies a red line with its id in its name: `[rl:<area>/<id>]`.
5. In the same PR, fold the red lines the change made true into `harden/redlines/`, list them under the brief's
   `## Red lines after`, set `Status: shipped`, and run `harden check`.

Every PR that changes code an area names carries one line:

    Brief: harden/briefs/<file>.md
    Brief: none - <why no behaviour changes>
