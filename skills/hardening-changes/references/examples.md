# Examples

## Contents

- A bug report
- An access change, with sources found by search
- A change that needs no brief
- A brief that reality contradicted

## A bug report

Request, in a support ticket: "CSV export is broken for some customers, the columns are shifted."

The request names a symptom, not a cause. Searching the export code and the ticket's attachments shows the shifted
rows hold commas in the customer's company name.

```
Status: building
Request: SUP-881 (Dmitri, support), 2026-05-12: "CSV export is broken for some customers, the columns are shifted"

Intent: an export opens with every value in its column, whatever the text holds — success: a company named "Acme, Inc." exports into one cell
Sources: export/columns, `src/export/csv.js`; the ticket's file https://linear.app/acme/issue/SUP-881
Red lines: export/columns, export/utf8-bom (Excel opens Cyrillic correctly), export/order
Open: also quote newlines inside a value? → yes, the same RFC 4180 rule [non-blocking]
Decided: none
Proof: values with commas, quotes and newlines round-trip through a CSV parser / [rl:export/utf8-bom] and [rl:export/order] pass unchanged

## Red lines after

* export/columns: text now says "values are quoted as RFC 4180 says"
```

## An access change, with sources found by search

Request, from the product owner: "I want to use Genter on Genter itself, and only see this project."

Three searches before any Open line changed the brief: scoping already existed for chat modes, a sibling product had
an optional per-agent limit, and the data had no unit finer than a connected account.

```
Status: open
Request: product owner, 2026-10-14: work on Genter through Genter, and see only this project

Intent: a coding agent gets an MCP URL that searches and reads only the sources a person chose, down to a GitHub organization — success: search "access switch" over it returns only Genterai/* results
Sources:
* access/agent-sources, access/switch-path, mcp/two-tools
* `lib/access.js` (chat modes already narrow search by scope keys), `lib/agents.js` (agents have no sources of their own)
* `Genterai/book/lib/services/me.js`: agents limited to some sites; an empty list lifts the limit
Red lines: access/agent-sources unchanged for agents with nothing chosen; a choice only narrows, never past access/switch-path or access/owner-rules; mcp/two-tools of the person's own URL unchanged; new: access/agent-scope
Open:
* raw search and read on an agent's URL, or ask only? → search and read only for agents with chosen sources; the prompt then shapes ask alone [blocking: MCP contract]
* how fine a choice: an account, or an organization inside it? → a scope key own:<account>:<prefix> matched on the result's path [blocking: data model]
* new repositories of a chosen organization join on their own? → yes [non-blocking]
Proof: an agent scoped to Genterai/ finds only Genterai/*; a read of another organization's id answers "not found" (not "forbidden": its existence is not told); GitHub off → nothing / [rl:access/ac-agent-ask], [rl:mcp/two-tools] pass unchanged
```

The two blocking questions went to the owner in one message, each with its proposal. Nothing was built until they were
answered.

## A change that needs no brief

A PR renames `formatDate` to `formatDay` across the code and changes no output. Its body:

```
Brief: none - a rename; no output changes, every tagged test passes unchanged
```

## A brief that reality contradicted

Building "share links expire after 7 days", the developer finds that links are cached at the CDN for 30 days. The
brief said "an 8-day-old link answers 404". Do not work around it; update the brief, and ask:

```
Status: open        (was building)
Open: links are cached at the CDN for 30 days; purge on expiry, or shorten the cache to 1 hour? → shorten to 1 hour, purging needs a provider API key we do not hold [blocking: hard to reverse for cached links]
```

The code waits for the answer; the parts that do not depend on it go on.
