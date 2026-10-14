# Red line tests

## Contents

- Four layers
- Layer 1: the format
- Layer 2: red lines, tests and code agree
- Layer 3: the last run proved it
- Layer 4: the words still match the behaviour
- In CI
- Test runners and junit

## Four layers

Each layer catches a different way the written rules and the product drift apart. Only the deterministic ones block a
merge.

| Layer | Catches | Runs | Blocks |
| -- | -- | -- | -- |
| 1. Format | broken briefs, reused ids, Sources that point at code that moved | every PR, seconds | yes |
| 2. Agreement | a tag that names no line, a built line no test checks, code changed without a brief | every PR, seconds | yes |
| 3. Proof | a line whose only tests failed, were skipped or did not run | after the tests | on the main branch |
| 4. Meaning | a line whose words no longer match what the code does | weekly, by an agent | no |

Layers 1 and 2 are `harden check`; layer 3 is `harden proof`; layer 4 is an agent with search.

## Layer 1: the format

`harden check` reads `harden/redlines/` and `harden/briefs/`:

* an area has `Intent:`, `Sources:` and `## Red lines`; an id is unique in its area;
* every `area/id` in red lines and briefs names a line that exists;
* every path in backticks under Sources exists in the repository (or names another repository);
* a brief has its fields, a success signal, and a tag on every Open item;
* a `building` or `shipped` brief has no blocking question open;
* a `shipped` brief lists the lines it made true, and they are built;
* a retired id is never used again.

A dead Source is the cheapest sign that a written rule has fallen behind the code: a file it names was moved or
deleted, and nobody looked at the rule.

## Layer 2: red lines, tests and code agree

Also `harden check`:

* every `[rl:area/id]` in a test names a line; a near miss gets a "did you mean";
* every built red line and proof case is tagged by at least one test, or marked `(planned)` or `(manual: how)`;
* with `--base <ref>`, a line removed since the base must be in `retired.txt`;
* with `--base <ref>`, a PR that changes code an area names carries a `Brief:` line naming a real brief (or
  `none - why`), and that brief has no blocking question open.

Coverage here means "some test claims to check it", not "it passed": that is layer 3.

## Layer 3: the last run proved it

A tag that exists does not mean the test ran. Database and browser tests are often skipped without their secrets, and
then a line covered only by them is not proved at all. `harden proof` reads the junit report of a real run:

```bash
node --test --test-reporter=spec --test-reporter-destination=stdout \
  --test-reporter=junit --test-reporter-destination=junit.xml
npx -y github:Genterai/harden proof junit.xml --out proof.md
```

| State | Means |
| -- | -- |
| proved | a test tagged with it passed, and none failed |
| failed | a test tagged with it failed |
| skipped | every test tagged with it was skipped |
| not run | no test tagged with it is in the report |
| planned, manual | marked so in the area file |

`harden proof` exits 1 when a line failed; with `--strict`, also when one was only skipped or not run. Use `--strict`
on the main branch, where every secret is present, and publish `proof.md` as the run's artifact.

On Genter's own product, the unit tests alone proved 52 of 188 lines; the other 135 were covered only by database and
browser tests that need a test database. Layer 2 counted all of them as covered. Layer 3 is what showed the gap.

## Layer 4: the words still match the behaviour

No script can tell whether "Revoking a link makes it answer 404 at once" is still what the code does. An agent can,
and must not block a merge, because its answers vary. Run it weekly (a scheduled agent, a CI cron with Claude Code):

```
For each red line in `harden list --json`:
1. Read the line and its area's Sources.
2. Find the code that does it and the tests tagged with it (with Genter: genter_find; else grep), and read them.
3. Judge: holds, contradicts or unclear, quoting the code.
For each "contradicts", open an issue (or a brief with Status: open) quoting the line and the code. Change no code
and no red line yourself.
```

Its output is a list of questions for the owner, never a fix.

## In CI

```yaml
# .github/workflows/harden.yml
name: harden
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # --base needs the history
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - if: github.event_name == 'pull_request'
        run: npx -y github:Genterai/harden#v0.1.0 check --base origin/${{ github.base_ref }}
      - if: github.event_name == 'push'
        run: npx -y github:Genterai/harden#v0.1.0 check
```

The PR body is read from the event; nothing else to pass. Pin a tag or a commit so a new release never turns your CI
red on its own. For layer 3, add `harden proof` after the test job that has every secret.

## Test runners and junit

`harden proof` needs the tag in the test's name, because the name is what a junit report keeps.

| Runner | Report | Tag goes in |
| -- | -- | -- |
| `node --test` | `--test-reporter=junit --test-reporter-destination=junit.xml` | `test("[rl:a/b] …")` |
| Vitest | `--reporter=junit --outputFile=junit.xml` | `it("[rl:a/b] …")` |
| Jest | the `jest-junit` reporter | `it("[rl:a/b] …")` |
| Playwright | `--reporter=junit` (`PLAYWRIGHT_JUNIT_OUTPUT_NAME=junit.xml`) | `test("[rl:a/b] …")` |
| Go | `gotestsum --junitfile junit.xml` | `t.Run("[rl:a/b] …", …)` |
| pytest | `--junitxml=junit.xml` | names come from function names: tag in a comment counts for layer 2 only |

A tag in a comment, a docstring or a fixture string still counts for layer 2. A fixture that holds tag-like text for
another repository (as in tests of a checker) should build the tag at runtime, so the file holds no literal tag.
