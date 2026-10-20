# The skill

Intent: an agent given a change request writes a brief before code, asks only what it could not find, and stops on
a blocking question — success: on the evals in `evals/evals.json`, the brief names what the code already answers as a
Source, not as an Open line.
Sources: `skills/hardening-changes/SKILL.md`, `skills/hardening-changes/references/`, `evals/evals.json`, `.claude-plugin/plugin.json`,
`docs/with-genter.md`

## Red lines

* **[valid]** (manual: `claude plugin validate .` and the frontmatter rules of agentskills.io) The skill's name is
  `hardening-changes`, its description is in the third person, says what and when, and is at most 1024 characters.
* **[lean]** (manual: `wc -l`) SKILL.md stays under 500 lines; detail lives one level down in `references/`.
* **[search-before-open]** (manual: evals) The skill has the agent search once for an answer before writing an Open
  line.
* **[stops]** (manual: evals) With a blocking question open, the agent asks and does not build.
* **[genter]** (manual: evals; `claude plugin validate .`) The skill always searches with genter-cli from the shell,
  `npx -y genter-cli@<minor> ask "<question>"`, pinned to a minor version; the plugin starts no MCP server. It ranks by
  meaning only when the person sets `GENTER_SEMANTIC=1`. Genter Cloud is the person's own MCP server in their AI tool
  (`https://genter.ai/api/mcp`, signed in with OAuth): the skill searches the apps with its `search` and `read` when it
  is there, and never tells anyone to make a token or run `genter login`; a person who signed genter-cli 0.3 in before
  is told to run `logout` and remove `GENTER_TOKEN`, which 0.3 still sends with every `ask`. `grep` and `git log` are
  for exact names and history, or when `npx` cannot run, and then the brief says why (check/searched).
