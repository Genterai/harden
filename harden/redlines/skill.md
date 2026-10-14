# The skill

Intent: an agent given a change request writes a brief before code, asks only what it could not find, and stops on
a blocking question — success: on the evals in `evals/evals.json`, the brief names what the code already answers as a
Source, not as an Open line.
Sources: `skills/hardening-changes/SKILL.md`, `skills/hardening-changes/references/`, `evals/evals.json`

## Red lines

* **[valid]** (manual: `claude plugin validate .` and the frontmatter rules of agentskills.io) The skill's name is
  `hardening-changes`, its description is in the third person, says what and when, and is at most 1024 characters.
* **[lean]** (manual: `wc -l`) SKILL.md stays under 500 lines; detail lives one level down in `references/`.
* **[search-before-open]** (manual: evals) The skill has the agent search once for an answer before writing an Open
  line.
* **[stops]** (manual: evals) With a blocking question open, the agent asks and does not build.
