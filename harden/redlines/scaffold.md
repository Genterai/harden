# Scaffold

Intent: a team starts the method in one command — success: right after `harden init`, `harden check` passes.
Sources: `skills/hardening-changes/scripts/harden.mjs`, `skills/hardening-changes/assets/`

## Red lines

* **[init]** `harden init` makes `harden/` (a README, one area, the brief template, `retired.txt`, `config.json`),
  checks clean, and never overwrites a file; `harden new` names a brief by date and title and never overwrites one.
