# Genter Cloud as its own MCP server

Status: shipped
Request: Genter's product owner, 2026-10-20, accepting Genter's open-source plan as proposed ("по всему что
предлагаешь", on everything you propose). Its decision D3 makes Genter Cloud a second MCP server in the person's AI tool
(`https://genter.ai/api/mcp`, OAuth) instead of a token in genter-cli. Its step 1.4 lists harden in the Genter
marketplace and moves harden's skill to the two tools, `search` and `read`. The docs here still told people to run
`genter-cli@0.3 login gnt_...` and to set `GENTER_TOKEN`.

Intent: nobody following harden's docs is sent down the dead token bridge to Genter Cloud — success: the skill, its
reference, the README and docs/with-genter.md say to add Genter Cloud to the AI tool as its own MCP server at
`https://genter.ai/api/mcp` (the tool signs in with OAuth) and to search the apps with its `search` and `read`; no file
outside the dated briefs mentions `genter login`, `GENTER_TOKEN` or API tokens; the skill still runs
`npx -y genter-cli@0.3 ask`, a pin that moves with 0.4; the README names the Genter marketplace, which lists harden.
Searched: genter-cli: "how does the skill reach Genter Cloud: login, GENTER_TOKEN or its own MCP URL?" (README.md
"Genter Cloud: the decisions behind the code", finding-truth.md "With Genter Cloud", docs/with-genter.md "Set it up",
and both briefs of 2026-10-14), "where is genter-cli pinned to a minor version and what red line says so?"
(skill/genter, docs/with-genter.md, check/searched); both with `npx -y genter-cli@0.3 ask` in this repository.
Sources: `skills/hardening-changes/SKILL.md` (step 2), `skills/hardening-changes/references/finding-truth.md`,
`README.md`, `docs/with-genter.md`, `.claude-plugin/plugin.json`, `harden/redlines/skill.md`, the briefs
`harden/briefs/2026-10-14-genter-cli-always-from-npx.md` and `harden/briefs/2026-10-14-genter-cli-comes-with-the-plugin.md`;
genter-cli's own README and red lines (`Genterai/genter/README.md`, "Genter Cloud: your team's apps";
`Genterai/genter/harden/redlines/cli.md` [cloud-own-server]: genter-cli never calls Genter Cloud and keeps no token
for it, and `genter login` exits 1 naming the address); `Genterai/genter/.claude-plugin/marketplace.json`, which lists
`harden` from this repository (Genterai/genter pull request 85). On 2026-10-20 genter.ai answers 404 at
`/api/v1/me`, `/api/v1/cli/find` and `/dashboard/settings`, the addresses the bridge used, and its MCP server answers
at `https://genter.ai/api/mcp`. npm has genter-cli `0.0.0-stage` and `0.3.0` (`npm view genter-cli versions`).
Red lines: skill/genter changes (Genter Cloud is the person's own MCP server; the skill never sends anyone to a token or
`genter login`); skill/valid, skill/lean, skill/search-before-open, skill/stops and check/searched stay true.
Decided:
* Genter Cloud is reached as its own MCP server in the person's AI tool, `https://genter.ai/api/mcp`, signed in with
  OAuth; the skill searches the apps with its `search` and `read` when it is there. genter-cli 0.3's `login` and
  `GENTER_TOKEN` are named once, as gone, so a person who set them up knows why they stopped working (the plan's D3;
  the owner's task, 2026-10-20)
* The skill keeps `npx -y genter-cli@0.3 ask` for the repository: 0.4 is not on npm yet, and the pin moves to `@0.4`
  in the plugin version that follows 0.4's release. The README, docs/with-genter.md and finding-truth.md say so (the
  owner's task, 2026-10-20)
* The skill itself names no MCP tool of genter-cli: it runs genter-cli from the shell, as skill/genter says, so moving
  to the two tools here means Genter Cloud's `search` and `read`, which is what the docs now name (plan step 1.4)
* `Searched:` may name what Genter Cloud was asked beside genter-cli; check/searched already accepts any line that
  names Genter (this brief)
* The README and docs/with-genter.md say that the Genter marketplace (`/plugin marketplace add Genterai/genter`) lists
  harden too, as `harden@genter`, next to `genter@genter` (plan step 1.4)
* The plugin version goes from 0.3.0 to 0.3.1: Claude Code keeps an installed plugin at its version until the version
  changes, so without it people who installed harden keep the docs that send them to the dead `login` (this brief)
Open: none
Proof: by hand: `grep -rn "login\|GENTER_TOKEN\|API tokens"` over README.md, docs/, skills/, examples/ and evals/ finds
only the two lines that say 0.3's `login` and `GENTER_TOKEN` no longer reach Genter Cloud; `claude plugin validate .`
passes (Claude Code 2.1.304); SKILL.md stays at 159 lines with its front matter unchanged (skill/valid, skill/lean);
from the Genter marketplace in an empty home, `claude plugin install harden@genter` installs the harden plugin with its
`hardening-changes` skill / `npm test` passes unchanged, `harden check` 0 errors, and CI's quickstart example and
`harden proof --strict` pass.

## Red lines after

* skill/genter (changed: Genter Cloud is the person's own MCP server at `https://genter.ai/api/mcp`, signed in with
  OAuth; the skill searches it with `search` and `read` and never sends anyone to a token or `genter login`)
