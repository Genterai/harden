import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  check,
  globToRegExp,
  init,
  loadRepo,
  newBrief,
  openItems,
  parseArea,
  parseJunit,
  pathsIn,
  proof,
  refsIn,
  repoRoot,
} from "../skills/hardening-changes/scripts/harden.mjs";

// Tags in fixtures are built, so this file holds no literal tag of a fixture repository.
const rl = (...refs) => refs.map((r) => `[rl:${r}]`).join(" ");

// A repository on disk: { "path": "text" }, committed when git is asked for.
function repo(files, { commit = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "harden-"));
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), text);
  }
  if (commit) {
    const g = (...a) => execFileSync("git", a, { cwd: root, stdio: "ignore" });
    g("init", "-q", "-b", "main");
    g("-c", "user.email=t@t", "-c", "user.name=t", "add", "-A");
    g("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base");
  }
  return root;
}

const errors = (root, opts) => check(loadRepo(root), opts).filter((p) => p.level === "error").map((p) => p.msg);

const AREA = `# Sharing

Intent: a person shares a list by link — success: someone with the link sees the list, read-only.
Sources: \`src/share.js\`, \`src/links/\`

## Red lines

* **[read-only]** A shared list can be read, never changed, through its link.
* **[revoke]** Revoking a link makes it answer 404 at once.
* **[expiry]** (planned) A link expires after 7 days.
* **[look]** (manual: checked by eye on the canvas) The share dialog shows the link with a copy button.

## Proof

* **[ac-share]** Given a list shared by Anna, when Dan opens the link, then he sees it and cannot edit it.
`;

const BASE = {
  "harden/redlines/sharing.md": AREA,
  "src/share.js": "export {};\n",
  "src/links/index.js": "export {};\n",
  "test/share.test.js": `test("${rl("sharing/read-only", "sharing/ac-share")} read only", () => {});\ntest("${rl("sharing/revoke")} revoke", () => {});\n`,
};

const BRIEF = (over = {}) => {
  const f = {
    Status: "open",
    Request: "Anna in support, 2026-10-01: links should not live forever",
    Intent: "a shared link stops working after a while — success: a 8-day-old link answers 404",
    Sources: "sharing/revoke, `src/share.js`",
    "Red lines": "sharing/read-only, sharing/revoke",
    Open: "how long? → 7 days [blocking]; can the owner extend it? → no [non-blocking]",
    Proof: "a 8-day-old link answers 404 / sharing/ac-share still passes",
    ...over,
  };
  return `# Share links expire\n\n${Object.entries(f)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n\n## Red lines after\n\n${over.after ?? "<before shipped>"}\n`;
};

test("[rl:check/clean] a well-formed repository has no errors", () => {
  assert.deepEqual(errors(repo(BASE)), []);
});

test("[rl:check/area-format] an area needs Intent, Sources and a Red lines section", () => {
  const root = repo({ ...BASE, "harden/redlines/sharing.md": "# Sharing\n\n* **[x]** a line\n" });
  const e = errors(root);
  assert.ok(e.some((m) => m.includes('"Intent:"')));
  assert.ok(e.some((m) => m.includes('"Sources:"')));
  assert.ok(e.some((m) => m.includes("## Red lines")));
});

test("[rl:check/unique-ids] an id names one line", () => {
  const root = repo({ ...BASE, "harden/redlines/sharing.md": AREA.replace("**[revoke]**", "**[read-only]**") });
  assert.ok(errors(root).some((m) => m.includes("already used")));
});

test("[rl:check/dead-sources] a Sources path that is not in the repository is an error", () => {
  const root = repo({ ...BASE, "harden/redlines/sharing.md": AREA.replace("`src/links/`", "`src/gone/`") });
  assert.ok(errors(root).some((m) => m.includes("`src/gone/`")));
});

test("[rl:check/foreign-sources] paths of other repositories are skipped unless mapped", () => {
  const foreign = AREA.replace("`src/links/`", "`Acme/api/lib/x.js`");
  assert.deepEqual(errors(repo({ ...BASE, "harden/redlines/sharing.md": foreign })), []);
  const mapped = repo({ ...BASE, "harden/redlines/sharing.md": foreign, "harden/config.json": '{"repos": {"Acme/api": "."}}' });
  assert.ok(errors(mapped).some((m) => m.includes("Acme/api/lib/x.js")));
});

test("[rl:check/dangling-tags] a tag in a test must name a red line", () => {
  const root = repo({ ...BASE, "test/more.test.js": `test("${rl("sharing/revoked")} x", () => {});\n` });
  const e = errors(root);
  assert.ok(e.some((m) => m.includes("[sharing/revoked] tags no red line") && m.includes("sharing/revoke")));
});

test("[rl:check/coverage] a red line with no test, not planned or manual, is an error", () => {
  const root = repo({ ...BASE, "test/share.test.js": `test("${rl("sharing/read-only", "sharing/ac-share")} x", () => {});\n` });
  const e = errors(root);
  assert.deepEqual(e.filter((m) => m.includes("has no test")).length, 1);
  assert.ok(e[0].includes("sharing/revoke"));
  const warnOnly = repo({ ...BASE, "test/share.test.js": "", "harden/config.json": '{"coverage": "warn"}' });
  assert.deepEqual(errors(warnOnly), []);
});

test("[rl:check/legacy-tags] older tag prefixes count when listed in config", () => {
  const files = { ...BASE, "test/share.test.js": 'test("[spec:sharing/read-only] [spec:sharing/ac-share] [spec:sharing/revoke] x", () => {});\n' };
  assert.ok(errors(repo(files)).some((m) => m.includes("has no test")));
  assert.deepEqual(errors(repo({ ...files, "harden/config.json": '{"tags": ["rl", "spec"]}' })), []);
});

test("[rl:check/refs] an area/id reference must resolve; paths are not references", () => {
  assert.deepEqual(refsIn("see sharing/revoke and src/share.js and lib/sharing/x", new Set(["sharing"])), ["sharing/revoke"]);
  const root = repo({ ...BASE, "harden/briefs/2026-10-01-expiry.md": BRIEF({ "Red lines": "sharing/revok" }) });
  assert.ok(errors(root).some((m) => m.includes("sharing/revok is not a red line")));
  const proposed = repo({ ...BASE, "harden/briefs/2026-10-01-expiry.md": BRIEF({ "Red lines": "sharing/revoke; new: sharing/expires-soon" }) });
  assert.deepEqual(errors(proposed), []);
});

test("[rl:check/brief-fields] a brief needs its fields, a success signal and tagged open items", () => {
  const root = repo({
    ...BASE,
    "harden/briefs/2026-10-01-expiry.md": BRIEF({ Intent: "links expire", Open: "how long?", Proof: null }),
  });
  const e = errors(root);
  assert.ok(e.some((m) => m.includes("success:")));
  assert.ok(e.some((m) => m.includes("without [blocking]")));
  assert.ok(e.some((m) => m.includes('"Proof:"')));
});

test("[rl:check/searched] a brief from 2026-10-15 on says how it was searched: genter-cli, or none with a reason", () => {
  const at = (file, over) => errors(repo({ ...BASE, [`harden/briefs/${file}`]: BRIEF(over) }));
  assert.ok(at("2026-10-15-expiry.md", {}).some((m) => m.includes('no "Searched:" line')));
  assert.ok(at("2026-10-15-expiry.md", { Searched: "grep" }).some((m) => m.includes("names neither genter-cli")));
  assert.ok(at("2026-10-15-expiry.md", { Searched: "none" }).some((m) => m.includes("names neither genter-cli")));
  assert.deepEqual(at("2026-10-15-expiry.md", { Searched: 'genter-cli: "how long do links live?"' }), []);
  assert.deepEqual(at("2026-10-15-expiry.md", { Searched: "none - no network in CI" }), []);
  assert.deepEqual(at("2026-10-14-expiry.md", {}), [], "older briefs are records");
});

test("[rl:check/blocking-stops] building or shipped with a blocking question open is an error", () => {
  const root = repo({ ...BASE, "harden/briefs/2026-10-01-expiry.md": BRIEF({ Status: "building" }) });
  assert.ok(errors(root).some((m) => m.includes("blocking question is open")));
  const decided = repo({
    ...BASE,
    "harden/briefs/2026-10-01-expiry.md": BRIEF({ Status: "building", Open: "can the owner extend it? → no [non-blocking]", Decided: "7 days (Anna, 2026-10-02)" }),
  });
  assert.deepEqual(errors(decided), []);
});

test("[rl:check/shipped-folds] a shipped brief names the red lines it made true, built and in redlines/", () => {
  const shipped = (after) => repo({ ...BASE, "harden/briefs/2026-10-01-expiry.md": BRIEF({ Status: "shipped", Open: "none", after }) });
  assert.ok(errors(shipped(undefined)).some((m) => m.includes("is empty")));
  assert.ok(errors(shipped("* sharing/expiry")).some((m) => m.includes("still (planned)")));
  assert.ok(errors(shipped("* sharing/expires")).some((m) => m.includes("not in harden/redlines/")));
  assert.deepEqual(errors(shipped("none - a fix inside sharing/revoke")), []);
});

test("[rl:check/no-reuse] an id removed since the base must be retired, and a retired id never comes back", () => {
  const root = repo(BASE, { commit: true });
  writeFileSync(join(root, "harden/redlines/sharing.md"), AREA.replace(/^\* \*\*\[revoke\]\*\*.*$/m, ""));
  writeFileSync(join(root, "test/share.test.js"), `test("${rl("sharing/read-only", "sharing/ac-share")} x", () => {});\n`);
  assert.ok(errors(root, { base: "main" }).some((m) => m.includes("sharing/revoke was removed")));
  writeFileSync(join(root, "harden/retired.txt"), "sharing/revoke\n");
  assert.deepEqual(errors(root, { base: "main", prBody: "Brief: none - removing a line" }), []);
  writeFileSync(join(root, "harden/redlines/sharing.md"), AREA);
  assert.ok(errors(root).some((m) => m.includes("was retired")));
});

test("[rl:check/pr-line] a PR that changes mapped code needs a Brief line", () => {
  const root = repo({ ...BASE, "harden/briefs/2026-10-01-expiry.md": BRIEF({ Status: "building", Open: "none" }) }, { commit: true });
  writeFileSync(join(root, "src/share.js"), "export const x = 1;\n");
  assert.ok(errors(root, { base: "main", prBody: "Adds expiry" }).some((m) => m.includes('no "Brief:" line')));
  assert.ok(errors(root, { base: "main", prBody: "Brief: none" }).some((m) => m.includes("needs a reason")));
  assert.ok(errors(root, { base: "main", prBody: "Brief: harden/briefs/nope.md" }).some((m) => m.includes("is not a brief")));
  assert.deepEqual(errors(root, { base: "main", prBody: "Brief: harden/briefs/2026-10-01-expiry.md" }), []);
  assert.deepEqual(errors(root, { base: "main", prBody: "Brief: none - a rename" }), []);
});

test("[rl:check/pr-unmapped] a PR that changes no mapped code needs no Brief line", () => {
  const root = repo({ ...BASE, "README.md": "x\n" }, { commit: true });
  writeFileSync(join(root, "README.md"), "y\n");
  assert.deepEqual(errors(root, { base: "main", prBody: "" }), []);
});

test("[rl:proof/junit] a junit report proves, fails or only skips each red line", () => {
  const root = repo(BASE);
  const cases = parseJunit(`<testsuites>
    <testcase name="${rl("sharing/read-only", "sharing/ac-share")} read only" time="0.1"/>
    <testcase name="${rl("sharing/revoke")} revoke &amp; 404"><skipped type="skipped"/></testcase>
  </testsuites>`);
  assert.deepEqual(cases.map((c) => c.state), ["pass", "skip"]);
  const rows = Object.fromEntries(proof(loadRepo(root), cases).map((r) => [r.ref, r.state]));
  assert.deepEqual(rows, { "sharing/read-only": "pass", "sharing/revoke": "skip", "sharing/expiry": "planned", "sharing/look": "manual", "sharing/ac-share": "pass" });
  const failed = parseJunit(`<testcase name="${rl("sharing/revoke")} r"><failure message="x"/></testcase>`);
  assert.equal(proof(loadRepo(root), failed).find((r) => r.ref === "sharing/revoke").state, "fail");
});

test("[rl:scaffold/init] init makes a harden/ that checks clean, and never overwrites", () => {
  const root = repo({});
  const made = init(root, { area: "Sharing" });
  assert.ok(made.includes("harden/redlines/sharing.md"));
  assert.deepEqual(errors(root), []);
  assert.deepEqual(init(root), ["harden/redlines/product.md"]);
  const brief = newBrief(root, "Share links expire", { date: new Date("2026-10-14T10:00:00Z") });
  assert.equal(brief, "harden/briefs/2026-10-14-share-links-expire.md");
  assert.equal(newBrief(root, "Share links expire", { date: new Date("2026-10-14T10:00:00Z") }), "harden/briefs/2026-10-14-share-links-expire-2.md");
  assert.deepEqual(errors(root), []);
});

test("[rl:check/parsing] globs, open items, paths and markers", () => {
  assert.ok(globToRegExp("app/api/**").test("app/api/a/b.js"));
  assert.ok(globToRegExp("lib/*.test.js").test("lib/x.test.js"));
  assert.ok(!globToRegExp("lib/*.test.js").test("lib/a/x.test.js"));
  assert.deepEqual(openItems("none"), []);
  assert.deepEqual(openItems("a [blocking]; b [non-blocking]"), ["a [blocking]", "b [non-blocking]"]);
  assert.deepEqual(openItems("x\n* a; still a [blocking]\n* b, which goes on\n  to here [non-blocking]"), ["a; still a [blocking]", "b, which goes on to here [non-blocking]"]);
  assert.deepEqual(pathsIn("`src/a.js`, `own:<account>`, `/api/mcp`, `https://x.y/z`, `a089caf`, `lib/x.js:12`"), ["src/a.js", "lib/x.js"]);
  const a = parseArea(AREA, "harden/redlines/sharing.md");
  assert.deepEqual(a.entries.map((e) => [e.id, e.kind, e.planned, Boolean(e.manual)]), [
    ["read-only", "redline", false, false],
    ["revoke", "redline", false, false],
    ["expiry", "redline", true, false],
    ["look", "redline", false, true],
    ["ac-share", "proof", false, false],
  ]);
});

test("[rl:check/exit-code] the command exits 1 on errors and 0 when clean", () => {
  const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "skills/hardening-changes/scripts/harden.mjs");
  const root = repo(BASE, { commit: true });
  assert.equal(execFileSync("node", [cli, "check"], { cwd: root, encoding: "utf8" }).includes("0 errors"), true);
  writeFileSync(join(root, "test/x.test.js"), `test("${rl("sharing/nope")} x", () => {});\n`);
  assert.throws(() => execFileSync("node", [cli, "check"], { cwd: root, stdio: "pipe" }), (e) => e.status === 1);
  rmSync(root, { recursive: true, force: true });
});

test("[rl:check/package-root] a package with its own harden/ is checked on its own, --base included", () => {
  const files = Object.fromEntries(Object.entries(BASE).map(([p, t]) => [`packages/app/${p}`, t]));
  const top = repo({ ...files, "README.md": "x\n" }, { commit: true });
  const app = join(top, "packages/app");
  assert.equal(repoRoot(join(app, "src")), app);
  writeFileSync(join(app, "harden/redlines/sharing.md"), AREA.replace(/^\* \*\*\[revoke\]\*\*.*$/m, ""));
  writeFileSync(join(app, "test/share.test.js"), `test("${rl("sharing/read-only", "sharing/ac-share")} x", () => {});\n`);
  writeFileSync(join(app, "src/share.js"), "export const changed = 1;\n");
  const e = errors(app, { base: "main", prBody: "no line" });
  assert.ok(e.some((m) => m.includes("sharing/revoke was removed")));
  assert.ok(e.some((m) => m.includes('no "Brief:" line')));
});
