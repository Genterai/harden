# genter-cli always, from npx

Status: shipped
Request: product owner, 2026-10-14, after an agent hardened a change in Genterai/app with `grep` only while Genter was
reachable: "пусть тогда не как мсп будет а как npm cli всегда"; "harden check должен быть строгим"

Intent: every brief is written after a search with genter-cli, and the brief shows it — success: the skill runs
`npx -y genter-cli@0.3 ask` in step 2 with nothing to install or connect; a brief dated 2026-10-15 or later without a
`Searched:` line naming genter-cli (or "none - why") fails `harden check`
Searched: genter-cli: "where does the plugin start the genter MCP server", "when may the agent search with grep instead
  of Genter", "which brief fields does harden check require"
Sources: `.claude-plugin/plugin.json`, `skills/hardening-changes/SKILL.md`,
  `skills/hardening-changes/references/finding-truth.md`, `skills/hardening-changes/scripts/harden.mjs`,
  `docs/with-genter.md`, `README.md`; the brief before this one, `harden/briefs/2026-10-14-genter-cli-comes-with-the-plugin.md`;
  Genterai/genter/bin/local.js (`ask` needs no keys; `GENTER_SEMANTIC=1` or `--semantic`; signed in, it also finds in
  Genter Cloud)
Red lines: skill/genter (changes: CLI from npx, no MCP server), skill/search-before-open; new: check/searched
Open: none
Decided:
* genter-cli runs as a command (`npx -y genter-cli@0.3 ask`), never as the plugin's MCP server; Genter Cloud is reached
  through `genter-cli login`, its own MCP URL stays for a person's own client (product owner, 2026-10-14)
* `harden check` is strict: a missing or empty-handed `Searched:` line is an error (product owner, 2026-10-14); briefs
  dated before 2026-10-15 are records and are left as they are, so repositories that take harden from `main` do not
  break on old briefs
Proof: [rl:check/searched] covers missing, "grep", bare "none", genter-cli, "none - why" and an older brief / the
  other check tests pass unchanged; `claude plugin validate .`

## Red lines after

* check/searched (new)
* skill/genter (changed)
