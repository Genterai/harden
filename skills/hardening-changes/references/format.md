# Format

## Contents

- The folder
- An area file
- A red line
- A brief
- Open and Decided
- Statuses
- Red lines after
- Ids and retired ids
- Tags in tests
- The PR line
- config.json
- What the check says

## The folder

```
harden/
  README.md            what this folder is (made by init)
  config.json          optional settings
  retired.txt          removed ids, one area/id per line
  redlines/<area>.md   one file per area of the product
  briefs/TEMPLATE.md   the brief template (made by init)
  briefs/YYYY-MM-DD-<slug>.md
```

An area is a part of the product a person would name: `access`, `billing`, `sharing`, `mcp`. Split by what people rely
on, not by code folders; one area can name code in many folders. Files named `README.md`, `TEMPLATE.md` or starting
with `_` are not read as areas or briefs.

## An area file

```markdown
# Sharing

Intent: a person shares a list by link — success: someone with the link sees the list, read-only.
Sources: `src/share.js`, `src/links/`, `Acme/api/routes/share.js`

## Red lines

### Links

* **[read-only]** A shared list can be read, never changed, through its link.
* **[revoke]** Revoking a link makes it answer 404 at once.
* **[expiry]** (planned) A link expires after 7 days → [briefs/2026-10-01-expiry.md](../briefs/2026-10-01-expiry.md).
* **[look]** (manual: checked on the design canvas) The share dialog shows the link with a copy button.

## Proof

* **[ac-share]** Given a list shared by Anna, when Dan opens the link, then he sees it and cannot edit it.

## Open

* Whether a link can be limited to one email: no brief yet.
```

* `Intent:` and `Sources:` are required. Fields run on over their indented or wrapped lines until a blank line.
* `Sources:` names code in backticks. A folder ends with `/`; a glob (`app/api/**`) is fine. `Owner/repo/path` is
  another repository's path: skipped by the check unless `repos` in `config.json` maps it to a local folder.
* `## Red lines` is required. `###` subsections group lines; their names are free.
* `## Proof` holds acceptance cases. They are lines too: ids, tags, coverage.
* `## Open` holds what is not decided about the area, without ids. A question that blocks work belongs in a brief.
* Any other `##` section (history, notes) is free text; its lines are not counted for coverage.

## A red line

`* **[id]** text`, one rule per line. A red line names one of:

* a behaviour someone relies on ("Revoking a link makes it answer 404 at once"),
* an access boundary ("A barista never sees revenue"),
* the meaning of data ("A price is in cents, tax included"),
* a contract ("The MCP server has exactly two tools, search and read").

How a page looks belongs to the design source (a canvas, a design system), how code is laid out to the code. Write
the rule so a test can check it: concrete numbers, named states, the observable result.

Marks right after the id:

| Mark | Means | Coverage |
| -- | -- | -- |
| `(planned)` | accepted, not built; it has or gets a brief | not required |
| `(manual: why)` | proved by a person or an eval, not a test; say how | not required |
| none | built | a test must tag it |

## A brief

```markdown
# Share links expire

Status: open
Request: Anna (support), 2026-10-01: "customers ask why a link from last year still works"

Intent: a shared link stops working after a while — success: an 8-day-old link answers 404
Sources: sharing/revoke, `src/share.js`, https://linear.app/acme/issue/SUP-412
Red lines: sharing/read-only, sharing/revoke; new: sharing/expiry
Open:
* how long? → 7 days, the shortest that support asked for [blocking]
* can the owner extend a link? → no, they share again [non-blocking]
Proof: an 8-day-old link answers 404; a 6-day-old one works / sharing/ac-share passes unchanged

## Red lines after

<before Status: shipped>
```

| Field | Required | Rule |
| -- | -- | -- |
| `Status:` | yes | `open`, `building`, `shipped` or `dropped` |
| `Request:` | warned | the words as they came, from whom, when |
| `Intent:` | yes | one line, then `— success:` and an observable signal |
| `Sources:` | yes | code paths in backticks, `area/id`, links; referenced, never copied |
| `Red lines:` | yes | `area/id` that must stay true; `new:` for lines this change adds |
| `Open:` | yes | `none`, or items tagged `[blocking]` / `[non-blocking]` |
| `Decided:` | no | answered questions: `<answer> (who, date)` |
| `Proof:` | yes | cases for done `/` checks for not broken |

## Open and Decided

An Open item is a question or an assumption, with your proposal, and a tag:

```
Open:
* how long? → 7 days [blocking]
* can the owner extend it? → no, assume they share again [non-blocking]
```

On one line, items are split on `; `: `Open: how long? → 7 days [blocking]; extend? → no [non-blocking]`. In a bullet
list an item may hold `;` and run over indented lines. The tag can carry a reason: `[blocking: data model]`.

When a question is answered, move it out of Open:

```
Decided: 7 days (Anna, 2026-10-02); no extension (Anna, 2026-10-02)
```

`Open: none` when nothing is left.

## Statuses

| Status | Means | The check requires |
| -- | -- | -- |
| `open` | written, questions may be open | the fields; tagged open items |
| `building` | code is being written | no blocking item in Open |
| `shipped` | merged | no blocking item; `## Red lines after` filled and true |
| `dropped` | not doing it | nothing: kept as a record of why |

Sources of `open` and `building` briefs must exist; a `shipped` brief's Sources may have moved since.

## Red lines after

Under `## Red lines after`, a shipped brief lists the lines it made true, as `area/id`:

```
## Red lines after

* sharing/expiry: built (was planned)
* sharing/revoke: text changed, an expired link answers 404 like a revoked one
```

Each must exist in `redlines/` and not be `(planned)`. A change that adds or changes no line says
`none - <why>`: "none - a fix inside sharing/revoke, its text still holds".

## Ids and retired ids

* An id is lowercase letters, digits and hyphens, unique within its area: `read-only`, `ac-share`. It is addressed as
  `area/id` everywhere.
* Proof cases start with `ac-` by convention.
* An id is never reused. When a line goes, add `area/id` to `retired.txt` (`harden check --base <ref> --fix` does it).
  A test tag that names a retired id is an error, so an old test cannot silently pass for a new rule.
* Renaming an id is retiring the old one and adding a new one; retag the tests in the same PR.

## Tags in tests

A test names the red lines it checks in its name, as `[rl:area/id]`, several if it checks several:

```js
test("[rl:sharing/revoke] [rl:sharing/ac-share] a revoked link answers 404", ...)
```
```python
def test_revoked_link_404():  # [rl:sharing/revoke]
```

The check reads tags anywhere in test files (by default: files under `test/`, `tests/`, `spec/`, `__tests__/`, `e2e/`,
and `*.test.*`, `*.spec.*`, `*_test.go`, `test_*.py`). Put the tag in the name, where the junit report carries it, so
`harden proof` can tell whether it passed; a tag in a comment counts for coverage only.

## The PR line

A pull request that changes code an area names under Sources carries one line in its body:

```
Brief: harden/briefs/2026-10-01-share-links-expire.md
Brief: none - <why no behaviour changes>
```

The check (with `--base`) reads the body from `--pr-body <file>` or, in GitHub Actions, from the event. It fails when
the line is missing, names no brief, or names a brief whose blocking questions are still open. It warns when the PR
changes an area the brief never names.

## config.json

```json
{
  "tags": ["rl"],
  "tests": ["test/**", "lib/*.test.js"],
  "repos": { "Acme/web": "." },
  "coverage": "error",
  "requireBrief": "mapped"
}
```

| Key | Default | Means |
| -- | -- | -- |
| `tags` | `["rl"]` | tag prefixes that count; add an older one (`"spec"`) while tests move over |
| `tests` | the usual test paths | globs of test files, when the defaults miss yours |
| `repos` | `{}` | `"Owner/repo": "<local folder>"` so Sources paths of that repository are checked |
| `coverage` | `"error"` | a built line with no test: `"error"`, `"warn"` or `"off"` |
| `requireBrief` | `"mapped"` | when a PR needs a Brief line: `"mapped"` (it touches code an area names), `"always"` (any file outside `harden/`), `"off"` |
| `dir` | `"harden"` | the folder's name |

## What the check says

| Message | Do |
| -- | -- |
| `Sources names \`x\`, which is not in this repository` | the code moved: fix the path; another repository: write `Owner/repo/x` or map it in `repos` |
| `[area/id] tags no red line; did you mean …` | fix the tag, or add the line it means |
| `area/id has no test` | tag the test that checks it; or mark it `(planned)` or `(manual: how it is checked)` |
| `Status is building but a blocking question is open` | get the answer, move it to `Decided:` |
| `shipped, but "## Red lines after" is empty` | list the lines it made true, or `none - why` |
| `area/id was removed since <base>` | `harden check --base <base> --fix`, then retag any test that named it |
| `the PR changes … but has no "Brief:" line` | add the line to the PR body |
