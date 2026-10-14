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
* **[genter]** (manual: `claude plugin validate .`, then `/mcp` lists genter) The plugin brings genter-cli's MCP server,
  pinned to a minor version. It ranks by meaning only when the person sets `GENTER_SEMANTIC=1`, and finds in Genter
  Cloud only when they signed in. The skill searches with Genter first, and with `grep` and `git log` when Genter is
  not there.
