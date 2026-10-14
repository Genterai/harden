# Proof

Intent: `harden proof` says which red lines the last test run proved — success: a red line whose only tests were
skipped reads "skipped", never "proved".
Sources: `skills/hardening-changes/scripts/harden.mjs`

## Red lines

* **[junit]** A junit report is read case by case: a red line with a failed test is failed, one with a passing test and
  no failure is proved, one whose tests were all skipped is skipped, one with none is "not run", planned or manual.
* **[strict]** (manual: run by hand on a report with skips) `--strict` also fails on skipped and not run lines.
