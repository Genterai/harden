# genter-cli comes with the plugin

Status: shipped
Request: product owner, 2026-10-14: "make genter-cli the main dependency, Genter Cloud optional, and show everywhere how
it makes the work simpler, with guides for Genter Cloud"

Intent: an agent that hardens a change finds what exists by meaning, with the place to cite, without anyone setting
Genter up first — success: right after `claude plugin install harden@harden`, `/mcp` lists `genter`, and step 2 of the
skill searches with `genter_find` before it writes an Open line
Sources: `skills/hardening-changes/SKILL.md`, `skills/hardening-changes/references/finding-truth.md`,
  `docs/with-genter.md`, `.claude-plugin/plugin.json`, skill/search-before-open,
  Genterai/genter/src/local.js (`embeddingProvider`: the first key set, else Ollama), Genterai/genter/src/cloud.js
  (`GENTER_TOKEN`, else what `genter login` kept), Genterai/genter/examples/project/.mcp.json
Red lines: skill/search-before-open, skill/stops; new: skill/genter
Open: none
Decided:
* the plugin starts `genter-cli` from npm, pinned to its minor version (`genter-cli@0.3`), so a new minor reaches
  people only with a new plugin version (product owner, 2026-10-14: genter-cli is the main dependency)
* ranking by meaning is on only when the person sets `GENTER_SEMANTIC=1`: with it, passages of their code go to the
  embeddings provider whose key is set, which nobody should get by installing a plugin; the README and the guide lead
  with turning it on (product owner, 2026-10-14: embeddings are the main case; privacy kept as an explicit opt-in)
* Genter Cloud stays optional: its apps are searched only with `GENTER_TOKEN` set or after `genter login`
  (product owner, 2026-10-14)
Proof: with the plugin installed, `/mcp` lists `genter` and `genter_find` answers with `path:lines`; with
  `GENTER_SEMANTIC=1` and a key, a question in other words than the docs' finds the section that answers / the skill
  still works without Genter (grep, git log); `npm test` and `harden check` pass unchanged

## Red lines after

* skill/genter (new)
