# Check

Intent: `harden check` tells a team, before merge, where the red lines, the briefs, the tests and the code disagree —
success: each disagreement is one line naming the file, the line and what to do, and the run exits 1.
Sources: `skills/hardening-changes/scripts/harden.mjs`, `test/harden.test.mjs`

Most weight: [no-reuse] and [coverage] keep test tags meaningful; [blocking-stops] is the method's stop rule.

## Red lines

### Red lines

* **[area-format]** An area file has an `Intent:` line, a `Sources:` line and a `## Red lines` section.
* **[unique-ids]** An id names one line within its area.
* **[dead-sources]** A path in backticks under Sources that is not in the repository is an error; paths of other
  repositories are skipped unless config `repos` maps them.
* **[foreign-sources]** `Owner/repo/path` in Sources is another repository's path.
* **[refs]** Every `area/id` in red lines and briefs names an existing line; code paths are never read as references.
* **[no-reuse]** An id removed since `--base` must be in `harden/retired.txt`, and a retired id never comes back.

### Briefs

* **[brief-fields]** A brief has Status, Intent with "— success:", Sources, Red lines, Open and Proof; each open item
  carries `[blocking]` or `[non-blocking]`.
* **[blocking-stops]** A brief in `building` or `shipped` with a blocking question open is an error.
* **[shipped-folds]** A `shipped` brief lists under "## Red lines after" the lines it made true, each in
  `redlines/` and no longer (planned), or says "none - why".

### Tests and pull requests

* **[dangling-tags]** A tag in a test names an existing red line, with a hint when one is close.
* **[coverage]** A red line with no test is an error unless it is (planned) or (manual: why); config `coverage`
  lowers it to a warning or turns it off.
* **[legacy-tags]** Tag prefixes listed in config `tags` count, so a team keeps its older tags.
* **[pr-line]** With `--base`, a change to code an area names needs a `Brief:` line in the PR body: a brief that
  exists, or "none - why".
* **[pr-unmapped]** A change to code no area names needs no Brief line.
* **[parsing]** Globs, open items over several lines, paths in backticks and the (planned) and (manual) marks are read
  as written.
* **[package-root]** The check runs on the nearest `harden/` up from where it is started, so a package of a
  monorepo has its own; `--base` reads that package's ids and changes.
* **[exit-code]** The command exits 1 when there is an error and 0 otherwise.
* **[clean]** A repository that follows the format has no errors.
