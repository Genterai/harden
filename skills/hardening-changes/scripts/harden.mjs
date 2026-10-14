#!/usr/bin/env node
// harden: checks the red lines and briefs of a repository (https://github.com/Genterai/harden).
//
//   harden init [--area <name>]     make harden/ in this repository
//   harden new "<title>"            start a brief in harden/briefs/
//   harden check [--base <ref>] [--pr-body <file>] [--fix]
//                                   format, links, sources, tags in tests, the PR's Brief line
//   harden proof <junit.xml>... [--out <file>] [--strict]
//                                   which red lines the last test run proved
//   harden list [--json]            every red line with its sources and tests
//
// No dependencies: Node 18 or later. Exit code 1 when a check fails.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "..", "assets");

export const STATUSES = ["open", "building", "shipped", "dropped"];
const FIELDS = ["Status", "Request", "Intent", "Sources", "Red lines", "Open", "Decided", "Proof"];
const ID = "[a-z0-9][a-z0-9-]*";
const ENTRY = new RegExp(`^\\s*[*-]\\s+\\*\\*\\[(${ID})\\]\\*\\*\\s*(.*)$`);
const FIELD = new RegExp(`^(${FIELDS.join("|")}):\\s*(.*)$`);

// Folders never walked, whatever the config says: they hold no tests of this repository.
const IGNORE = ["node_modules", ".git", ".next", "dist", "build", "coverage", "vendor", ".venv", "target"];
// A file is a test when its path says so in the usual ways of JS, Python, Go, Ruby and Java projects.
const TEST_FILE = /(^|\/)(test|tests|spec|__tests__|e2e)\/|\.(test|spec)\.[a-z]+$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$|Test\.java$/;

export const DEFAULTS = {
  dir: "harden",
  tags: ["rl"], // [rl:access/switch-path]; add "spec" to keep older [spec:…] tags counting
  tests: null, // glob list; null: any file TEST_FILE matches
  repos: {}, // "Owner/repo": "." maps cross-repo paths in Sources onto a local folder
  coverage: "error", // a red line with no test and no (planned)/(manual: …) mark: "error", "warn" or "off"
  requireBrief: "mapped", // a PR needs a Brief line when it changes code an area lists ("mapped"), any file outside harden/ ("always"), or never ("off")
};

// ---- small helpers -------------------------------------------------------------------------------------------------

const posix = (p) => p.split(sep).join("/");

export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      i++;
      if (glob[i + 1] === "/") {
        i++;
        re += "(?:.*/)?";
      } else re += ".*";
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function walk(root, rel = "", out = []) {
  let names;
  try {
    names = readdirSync(join(root, rel));
  } catch {
    return out;
  }
  for (const name of names) {
    if (IGNORE.includes(name)) continue;
    const p = rel ? `${rel}/${name}` : name;
    let st;
    try {
      st = statSync(join(root, p));
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(root, p, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

const read = (p) => readFileSync(p, "utf8");
const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

export function loadConfig(root) {
  const file = join(root, DEFAULTS.dir, "config.json");
  if (!existsSync(file)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(read(file)) };
  } catch (e) {
    throw new Error(`${posix(relative(root, file))}: not valid JSON (${e.message})`);
  }
}

// ---- parsing -------------------------------------------------------------------------------------------------------

// Fields ("Intent: …") with their continuation lines, until a blank line, a heading or the next field.
export function parseFields(lines) {
  const fields = {};
  let cur = null;
  lines.forEach((line, i) => {
    const m = line.match(FIELD);
    if (m) {
      cur = { name: m[1], value: m[2], line: i + 1 };
      if (!fields[m[1]]) fields[m[1]] = cur;
      return;
    }
    if (!cur) return;
    if (!line.trim() || /^#/.test(line)) cur = null;
    else cur.value += `\n${line}`;
  });
  return fields;
}

// A heading's kind: the red lines of an area, its proof cases, or anything else.
const kindOf = (heading) => (/red lines?/i.test(heading) ? "redline" : /proof|acceptance/i.test(heading) ? "proof" : "other");

export function parseArea(text, file) {
  const lines = text.split(/\r?\n/);
  const area = { file, name: file.split("/").pop().replace(/\.md$/, ""), fields: parseFields(lines), entries: [], headings: [] };
  let kind = "other";
  let last = null;
  lines.forEach((line, i) => {
    const h = line.match(/^(#{2,6})\s+(.*)$/);
    if (h) {
      if (h[1].length === 2) kind = kindOf(h[2]);
      area.headings.push(h[2]);
      last = null;
      return;
    }
    const m = line.match(ENTRY);
    if (m) {
      last = { id: m[1], text: m[2], kind, line: i + 1 };
      area.entries.push(last);
    } else if (last && /^\s{2,}\S/.test(line)) last.text += ` ${line.trim()}`;
    else last = null;
  });
  for (const e of area.entries) {
    e.planned = /\(planned\)/i.test(e.text);
    const manual = e.text.match(/\(manual(?::\s*([^)]*))?\)/i);
    e.manual = manual ? manual[1]?.trim() || "no reason given" : null;
  }
  return area;
}

export function parseBrief(text, file) {
  const lines = text.split(/\r?\n/);
  const fields = parseFields(lines);
  const title = (lines.find((l) => /^#\s/.test(l)) || "").replace(/^#\s+/, "");
  // "## Red lines after": everything under that heading, up to the next heading of the same level.
  let after = null;
  let afterLine = 0;
  lines.forEach((line, i) => {
    if (/^##\s+red lines after/i.test(line)) {
      after = [];
      afterLine = i + 1;
    } else if (after && /^##\s/.test(line)) after.done = true;
    else if (after && !after.done) after.push(line);
  });
  return { file, title, fields, status: fields.Status?.value.trim().toLowerCase(), after: after ? after.join("\n").trim() : null, afterLine };
}

// The items of an Open field: one per bullet, or the parts of a one-line field split on "; ".
export function openItems(value) {
  const v = (value || "").trim();
  if (!v || /^none\b/i.test(v)) return [];
  // A bullet goes on over its indented continuation lines.
  const bullets = [];
  for (const l of v.split("\n")) {
    if (/^\s*[*-]\s+/.test(l)) bullets.push(l.replace(/^\s*[*-]\s+/, "").trim());
    else if (bullets.length && /^\s+\S/.test(l)) bullets[bullets.length - 1] += ` ${l.trim()}`;
  }
  if (bullets.length) return bullets;
  return v.replace(/\n/g, " ").split(/;\s+/).map((s) => s.trim()).filter(Boolean);
}

const isBlocking = (item) => /\[blocking\b/i.test(item);
const isTagged = (item) => /\[(non-)?blocking\b/i.test(item);

// "area/id" references to known areas. Not part of a path: lib/access.js or app/api/x are left alone.
export function refsIn(text, areaNames) {
  const out = [];
  const re = new RegExp(`(?<![\\w./@-])(${ID})/(${ID})(?![\\w/-]|\\.[A-Za-z])`, "g");
  for (const m of text.matchAll(re)) if (areaNames.has(m[1])) out.push(`${m[1]}/${m[2]}`);
  return out;
}

// Code paths in backticks inside a Sources field.
export function pathsIn(sources) {
  const out = [];
  for (const m of (sources || "").matchAll(/`([^`\s]+)`/g)) {
    let p = m[1].replace(/[#:]L?\d.*$/, "").replace(/#.*$/, "");
    if (/^[a-z]+:\/\//i.test(p) || p.startsWith("/") || p.startsWith("[") || /[<>]/.test(p)) continue;
    if (/^[a-z][\w-]*:/i.test(p)) continue; // own:<account>, genter:lib/x.js and other prefixed tokens
    if (p.includes("/") || /\.[A-Za-z0-9]+$/.test(p)) out.push(p);
  }
  return out;
}

// A Sources path → a path in this repository, or null when it names another repository that is not mapped.
function localPath(p, config, root) {
  for (const [repo, dir] of Object.entries(config.repos || {})) {
    if (p === repo) return dir;
    if (p.startsWith(`${repo}/`)) return posix(join(dir, p.slice(repo.length + 1)));
  }
  const parts = p.split("/");
  if (parts.length >= 3 && /^[A-Z]/.test(parts[0]) && !existsSync(join(root, parts[0]))) return null; // Owner/repo/…
  return p;
}

function pathExists(root, p) {
  const star = p.search(/[*?]/);
  const base = star === -1 ? p : p.slice(0, star).replace(/[^/]*$/, "");
  return existsSync(join(root, base || "."));
}

export function matchesPath(file, p) {
  if (/[*?]/.test(p)) return globToRegExp(p).test(file);
  const dir = p.endsWith("/") ? p : `${p}/`;
  return file === p || file.startsWith(dir);
}

// ---- the repository ------------------------------------------------------------------------------------------------

export function loadRepo(root, { files } = {}) {
  const config = loadConfig(root);
  const dir = join(root, config.dir);
  const list = (sub) => {
    const d = join(dir, sub);
    if (!existsSync(d)) return [];
    return readdirSync(d)
      .filter((f) => f.endsWith(".md") && !/^(README|TEMPLATE)\.md$/i.test(f) && !f.startsWith("_"))
      .sort()
      .map((f) => `${config.dir}/${sub}/${f}`);
  };
  const areas = list("redlines").map((f) => parseArea(read(join(root, f)), f));
  const briefs = list("briefs").map((f) => parseBrief(read(join(root, f)), f));
  const retiredFile = join(dir, "retired.txt");
  const retired = existsSync(retiredFile)
    ? read(retiredFile).split("\n").map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean)
    : [];
  const all = files || walk(root);
  const testMatch = config.tests ? config.tests.map(globToRegExp) : null;
  const testFiles = all.filter((f) => !f.startsWith(`${config.dir}/`) && (testMatch ? testMatch.some((r) => r.test(f)) : TEST_FILE.test(f)));
  const tagRe = new RegExp(`\\[(?:${config.tags.map((t) => t.replace(/[^a-z0-9-]/gi, "")).join("|")}):(${ID})/(${ID})\\]`, "g");
  const tags = [];
  for (const f of testFiles) {
    let text;
    try {
      text = read(join(root, f));
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue;
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(tagRe)) tags.push({ ref: `${m[1]}/${m[2]}`, file: f, line: i + 1 });
    });
  }
  return { root, config, areas, briefs, retired, tags, testFiles, exists: existsSync(dir) };
}

const ids = (repo) => {
  const map = new Map();
  for (const a of repo.areas) for (const e of a.entries) map.set(`${a.name}/${e.id}`, { area: a, entry: e });
  return map;
};

// ---- check ---------------------------------------------------------------------------------------------------------

export function check(repo, { base = null, prBody = null } = {}) {
  const problems = [];
  const error = (file, line, msg) => problems.push({ level: "error", file, line, msg });
  const warn = (file, line, msg) => problems.push({ level: "warn", file, line, msg });
  const { root, config } = repo;

  if (!repo.exists) {
    error(config.dir, 0, `no ${config.dir}/ folder here; run "harden init" first`);
    return problems;
  }
  const areaNames = new Set(repo.areas.map((a) => a.name));
  const known = ids(repo);
  const retired = new Set(repo.retired);

  // Layer 1: the format of red lines.
  for (const a of repo.areas) {
    if (!a.fields.Intent) error(a.file, 1, 'no "Intent:" line: say what this area is for, and for whom');
    else if (!/success:/i.test(a.fields.Intent.value)) warn(a.file, a.fields.Intent.line, 'Intent has no "— success: <observable signal>"');
    if (!a.fields.Sources) error(a.file, 1, 'no "Sources:" line: name the code this area lives in, in backticks');
    if (!a.headings.some((h) => /red lines?/i.test(h))) error(a.file, 1, 'no "## Red lines" section');
    const seen = new Map();
    for (const e of a.entries) {
      const ref = `${a.name}/${e.id}`;
      if (seen.has(e.id)) error(a.file, e.line, `[${e.id}] is already used on line ${seen.get(e.id)}; an id names one line`);
      seen.set(e.id, e.line);
      if (retired.has(ref)) error(a.file, e.line, `${ref} was retired (${config.dir}/retired.txt); an id is never reused, pick a new one`);
      if (!e.text.trim()) error(a.file, e.line, `[${e.id}] has no text`);
    }
    checkSources(a.fields.Sources?.value, a.file, a.fields.Sources?.line, error, repo);
    checkRefs(read(join(root, a.file)), a.file, areaNames, known, error);
  }

  // Layer 1: the format and lifecycle of briefs.
  for (const b of repo.briefs) {
    const f = b.fields;
    if (!f.Status) error(b.file, 1, `no "Status:" line (${STATUSES.join(", ")})`);
    else if (!STATUSES.includes(b.status)) error(b.file, f.Status.line, `Status "${f.Status.value.trim()}" is not one of ${STATUSES.join(", ")}`);
    if (b.status === "dropped") continue; // kept as a record; nothing in it has to hold
    for (const name of ["Intent", "Sources", "Red lines", "Open", "Proof"]) if (!f[name]) error(b.file, 1, `no "${name}:" line`);
    if (!f.Request) warn(b.file, 1, 'no "Request:" line: keep the words as they came, and from whom');
    if (f.Intent && !/success:/i.test(f.Intent.value)) error(b.file, f.Intent.line, 'Intent has no "— success: <observable signal>"');
    const items = openItems(f.Open?.value);
    for (const item of items) if (!isTagged(item)) error(b.file, f.Open.line, `open item without [blocking] or [non-blocking]: "${item.slice(0, 80)}"`);
    if (["building", "shipped"].includes(b.status)) {
      for (const item of items.filter(isBlocking)) {
        error(b.file, f.Open.line, `Status is ${b.status} but a blocking question is open: "${item.slice(0, 80)}"; answer it and move it to "Decided:"`);
      }
    }
    if (b.status !== "shipped") checkSources(f.Sources?.value, b.file, f.Sources?.line, error, repo);
    const body = read(join(root, b.file));
    // Proposed lines are not there yet: "## Red lines after" until shipped, and what follows "new:".
    const before = (b.after === null ? body : body.split(/^##\s+red lines after.*$/im)[0]).replace(/\bnew:[^;\n]*/gi, "");
    checkRefs(before, b.file, areaNames, known, error);
    if (b.status === "shipped") {
      if (b.after === null || !b.after || /^</.test(b.after)) {
        error(b.file, b.afterLine || 1, 'shipped, but "## Red lines after" is empty: list the area/id lines it made true, or "none - why"');
      } else if (!/^none\b/i.test(b.after)) {
        const refs = refsIn(b.after, areaNames);
        if (!refs.length) error(b.file, b.afterLine, '"## Red lines after" names no area/id');
        for (const r of refs) {
          const k = known.get(r);
          if (!k) error(b.file, b.afterLine, `${r} is not in ${config.dir}/redlines/; fold it in before Status: shipped`);
          else if (k.entry.planned) error(b.file, b.afterLine, `${r} is still (planned) in ${k.area.file}; shipped means built`);
        }
      }
    }
  }

  // Layer 2: tags in tests ↔ red lines.
  const tagged = new Map();
  for (const t of repo.tags) {
    if (!tagged.has(t.ref)) tagged.set(t.ref, []);
    tagged.get(t.ref).push(t);
    if (known.has(t.ref)) continue;
    if (retired.has(t.ref)) error(t.file, t.line, `[${t.ref}] tags a retired red line; tag what the test checks now`);
    else error(t.file, t.line, `[${t.ref}] tags no red line${hint(t.ref, known)}`);
  }
  if (config.coverage !== "off") {
    const report = config.coverage === "warn" ? warn : error;
    for (const [ref, { area, entry }] of known) {
      if (entry.kind === "other" || entry.planned || entry.manual || tagged.has(ref)) continue;
      report(area.file, entry.line, `${ref} has no test: tag one [${config.tags[0]}:${ref}], or mark it (planned) or (manual: why)`);
    }
  }

  // Ids are never reused: one removed since the base must be retired.
  if (base) {
    const before = idsAt(root, base, config.dir);
    if (before) {
      for (const r of before) {
        if (!known.has(r) && !retired.has(r)) {
          error(`${config.dir}/retired.txt`, 0, `${r} was removed since ${base}; add it to ${config.dir}/retired.txt ("harden check --base ${base} --fix")`);
        }
      }
    }
  }

  // The PR's Brief line.
  if (base && config.requireBrief !== "off") checkPr(repo, base, prBody, error, warn);
  return problems;
}

function hint(ref, known) {
  const [area, id] = ref.split("/");
  const near = [...known.keys()].filter((k) => k.startsWith(`${area}/`) && (k.includes(id) || id.includes(k.split("/")[1])));
  return near.length ? `; did you mean ${near.slice(0, 3).join(", ")}?` : "";
}

function checkSources(value, file, line, error, repo) {
  for (const p of pathsIn(value)) {
    const local = localPath(p, repo.config, repo.root);
    if (local === null) continue;
    if (!pathExists(repo.root, local)) error(file, line, `Sources names \`${p}\`, which is not in this repository; fix the path or map its repository in config "repos"`);
  }
}

function checkRefs(text, file, areaNames, known, error) {
  const lines = text.split("\n");
  lines.forEach((l, i) => {
    for (const r of refsIn(l, areaNames)) if (!known.has(r)) error(file, i + 1, `${r} is not a red line${hint(r, known)}`);
  });
}

function idsAt(root, ref, dir) {
  let names;
  let prefix = "";
  try {
    prefix = git(root, ["rev-parse", "--show-prefix"]).trim(); // harden/ of a package inside the repository
  } catch {
    /* not a git repository */
  }
  dir = `${prefix}${dir}`;
  try {
    names = git(root, ["ls-tree", "--full-tree", "--name-only", `${ref}:${dir}/redlines`]).split("\n").filter((f) => f.endsWith(".md") && !/^(README|TEMPLATE)\.md$/i.test(f));
  } catch {
    return null; // no harden/ at the base yet
  }
  const out = new Set();
  for (const n of names) {
    const a = parseArea(git(root, ["show", `${ref}:${dir}/redlines/${n}`]), n);
    for (const e of a.entries) out.add(`${a.name}/${e.id}`);
  }
  return out;
}

// What changed since the branch left the base: commits, the working tree and new files, so a check run before
// committing sees the same as CI.
function changedFiles(root, base) {
  let from = base;
  try {
    from = git(root, ["merge-base", base, "HEAD"]).trim();
  } catch {
    /* no common history: compare with the base itself */
  }
  const lines = (s) => s.split("\n").filter(Boolean);
  const tracked = lines(git(root, ["diff", "--name-only", "--relative", from]));
  const untracked = lines(git(root, ["ls-files", "--others", "--exclude-standard"]));
  return [...new Set([...tracked, ...untracked])];
}

export function briefLine(body) {
  const m = (body || "").match(/^\s*Brief:\s*(.+)$/im);
  return m ? m[1].trim() : null;
}

function checkPr(repo, base, prBody, error, warn) {
  const { config, root } = repo;
  const changed = changedFiles(root, base);
  const touched = new Map(); // area → files
  for (const a of repo.areas) {
    const paths = pathsIn(a.fields.Sources?.value).map((p) => localPath(p, config, root)).filter(Boolean);
    const hit = changed.filter((f) => paths.some((p) => matchesPath(f, p)));
    if (hit.length) touched.set(a.name, hit);
  }
  const outside = changed.filter((f) => !f.startsWith(`${config.dir}/`));
  const needs = config.requireBrief === "always" ? outside.length > 0 : touched.size > 0;
  if (!needs) return;
  if (prBody === null) {
    warn("PR", 0, "this change touches mapped code but no PR body was given (--pr-body, or GITHUB_EVENT_PATH); the Brief line was not checked");
    return;
  }
  const line = briefLine(prBody);
  const areas = [...touched.keys()].join(", ") || "code";
  if (!line) {
    error("PR", 0, `the PR changes ${areas} but has no "Brief:" line: "Brief: ${config.dir}/briefs/<file>.md" or "Brief: none - <why no behaviour changes>"`);
    return;
  }
  if (/^none\b/i.test(line)) {
    if (!/^none\s*[-—:]\s*\S/i.test(line)) error("PR", 0, '"Brief: none" needs a reason: "Brief: none - <why no behaviour changes>"');
    return;
  }
  for (const p of line.split(/[,\s]+/).filter((s) => s.endsWith(".md"))) {
    const b = repo.briefs.find((x) => x.file === p || x.file.endsWith(`/${p}`));
    if (!b) {
      error("PR", 0, `Brief: ${p} is not a brief in ${config.dir}/briefs/`);
      continue;
    }
    if (b.status === "open" && openItems(b.fields.Open?.value).some(isBlocking)) {
      error(b.file, b.fields.Open.line, "the PR builds against this brief, but it has blocking open questions; get them answered first");
    }
    const text = read(join(root, b.file));
    for (const area of touched.keys()) {
      if (!new RegExp(`(?<![\\w-])${area}/`).test(text)) warn(b.file, 1, `the PR changes ${touched.get(area)[0]} (area ${area}), but the brief names no ${area}/ red line`);
    }
  }
}

// ---- proof (layer 3) -----------------------------------------------------------------------------------------------

const unxml = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function parseJunit(xml) {
  const out = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const name = unxml((m[1].match(/\bname="([^"]*)"/) || [])[1] || "");
    const body = m[3] || "";
    const state = /<(failure|error)\b/.test(body) ? "fail" : /<skipped\b/.test(body) ? "skip" : "pass";
    out.push({ name, state });
  }
  return out;
}

export function proof(repo, cases) {
  const tagRe = new RegExp(`\\[(?:${repo.config.tags.join("|")}):(${ID})/(${ID})\\]`, "g");
  const runs = new Map();
  for (const c of cases) {
    for (const m of c.name.matchAll(tagRe)) {
      const ref = `${m[1]}/${m[2]}`;
      if (!runs.has(ref)) runs.set(ref, []);
      runs.get(ref).push(c);
    }
  }
  const rows = [];
  for (const [ref, { area, entry }] of ids(repo)) {
    if (entry.kind === "other") continue;
    const r = runs.get(ref) || [];
    const state = r.some((c) => c.state === "fail")
      ? "fail"
      : r.some((c) => c.state === "pass")
        ? "pass"
        : r.length
          ? "skip"
          : entry.planned
            ? "planned"
            : entry.manual
              ? "manual"
              : "none";
    rows.push({ ref, area: area.name, kind: entry.kind, state, tests: r.length });
  }
  return rows;
}

const MARK = { pass: "proved", fail: "**failed**", skip: "skipped", none: "not run", planned: "planned", manual: "manual" };

export function proofMarkdown(rows) {
  const count = (s) => rows.filter((r) => r.state === s).length;
  const lines = [
    "# Proof",
    "",
    `${count("pass")} proved, ${count("fail")} failed, ${count("skip")} only skipped, ${count("none")} not run, ${count("planned")} planned, ${count("manual")} manual.`,
    "",
    "| Red line | Kind | Tests | State |",
    "| -- | -- | -- | -- |",
    ...rows.map((r) => `| \`${r.ref}\` | ${r.kind === "proof" ? "proof" : "red line"} | ${r.tests} | ${MARK[r.state]} |`),
  ];
  return `${lines.join("\n")}\n`;
}

// ---- init and new --------------------------------------------------------------------------------------------------

export const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "brief";

const titleCase = (s) => s.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function writeNew(file, text, made) {
  if (existsSync(file)) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  made.push(file);
}

export function init(root, { area = "product" } = {}) {
  const dir = join(root, DEFAULTS.dir);
  const made = [];
  writeNew(
    join(dir, "README.md"),
    `# harden

What this product must keep true, and how a change gets in ([the method](https://github.com/Genterai/harden)).

* \`redlines/<area>.md\`: the red lines of each area of the live product. Tests tag the line they check:
  \`[rl:<area>/<id>]\`.
* \`briefs/YYYY-MM-DD-<slug>.md\`: one brief per change request, written before the code
  (\`harden new "<title>"\`).
* \`retired.txt\`: ids that were removed; an id is never reused.

A pull request that changes code an area names under Sources carries one line:

    Brief: harden/briefs/<file>.md
    Brief: none - <why no behaviour changes>

Check it all: \`npx -y github:Genterai/harden check\`.
`,
    made,
  );
  writeNew(join(dir, "redlines", `${slug(area)}.md`), read(join(ASSETS, "redlines.md")).replace("{{title}}", titleCase(slug(area))), made);
  writeNew(join(dir, "briefs", "TEMPLATE.md"), read(join(ASSETS, "brief.md")).replace("{{title}}", "<short name>"), made);
  writeNew(join(dir, "retired.txt"), "# area/id of red lines that were removed, one per line; an id is never reused.\n", made);
  writeNew(join(dir, "config.json"), `${JSON.stringify({ tags: DEFAULTS.tags, coverage: DEFAULTS.coverage }, null, 2)}\n`, made);
  return made.map((f) => posix(relative(root, f)));
}

export function newBrief(root, title, { date = new Date() } = {}) {
  const config = loadConfig(root);
  const day = date.toISOString().slice(0, 10);
  let file = join(root, config.dir, "briefs", `${day}-${slug(title)}.md`);
  for (let n = 2; existsSync(file); n++) file = join(root, config.dir, "briefs", `${day}-${slug(title)}-${n}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, read(join(ASSETS, "brief.md")).replace("{{title}}", title));
  return posix(relative(root, file));
}

// ---- command line --------------------------------------------------------------------------------------------------

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") && !["fix", "strict", "json"].includes(k)) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

// The nearest folder up from here that holds harden/ (a package of a monorepo has its own), else the git top level.
export function repoRoot(cwd) {
  let top = cwd;
  try {
    top = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  } catch {
    /* not a git repository: stay here */
  }
  for (let d = cwd; ; d = dirname(d)) {
    if (existsSync(join(d, DEFAULTS.dir, "redlines")) || existsSync(join(d, DEFAULTS.dir, "config.json"))) return d;
    if (d === top || dirname(d) === d) break;
  }
  return top;
}

function prBodyFrom(a) {
  if (typeof a["pr-body"] === "string") return read(a["pr-body"]);
  const ev = process.env.GITHUB_EVENT_PATH;
  if (ev && existsSync(ev)) {
    try {
      const body = JSON.parse(read(ev)).pull_request?.body;
      if (typeof body === "string") return body;
      if (JSON.parse(read(ev)).pull_request) return "";
    } catch {
      /* not a pull request event */
    }
  }
  return null;
}

const USAGE = `harden: red lines and briefs (https://github.com/Genterai/harden)

  harden init [--area <name>]          make harden/ in this repository
  harden new "<title>"                 start a brief in harden/briefs/
  harden check [--base <ref>] [--pr-body <file>] [--fix]
  harden proof <junit.xml>... [--out <file>] [--strict]
  harden list [--json]
`;

export function main(argv, cwd = process.cwd()) {
  const a = args(argv);
  const cmd = a._[0];
  const root = repoRoot(cwd);
  const log = (s) => process.stdout.write(`${s}\n`);

  if (!cmd || a.help || cmd === "help") {
    log(USAGE);
    return 0;
  }
  if (cmd === "init") {
    const made = init(root, { area: typeof a.area === "string" ? a.area : "product" });
    log(made.length ? made.map((f) => `made ${f}`).join("\n") : "harden/ is already here; nothing made");
    log('next: write the red lines of an area, then "harden check"');
    return 0;
  }
  if (cmd === "new") {
    const title = a._.slice(1).join(" ").trim();
    if (!title) {
      log('give the brief a title: harden new "Share links expire"');
      return 1;
    }
    log(newBrief(root, title));
    return 0;
  }
  if (cmd === "check") {
    const repo = loadRepo(root);
    const base = typeof a.base === "string" ? a.base : null;
    const problems = check(repo, { base, prBody: base ? prBodyFrom(a) : null });
    if (a.fix && base) {
      const removed = problems.filter((p) => /was removed since/.test(p.msg)).map((p) => p.msg.split(" ")[0]);
      if (removed.length) {
        appendFileSync(join(root, repo.config.dir, "retired.txt"), `${removed.map((r) => `${r}  # ${new Date().toISOString().slice(0, 10)}`).join("\n")}\n`);
        log(`retired ${removed.join(", ")}`);
        return main(argv.filter((x) => x !== "--fix"), cwd);
      }
    }
    for (const p of problems) log(`${p.level === "error" ? "error" : "warn "}  ${p.file}${p.line ? `:${p.line}` : ""}  ${p.msg}`);
    const errors = problems.filter((p) => p.level === "error").length;
    const lines = repo.areas.reduce((n, x) => n + x.entries.length, 0);
    log(
      `harden: ${errors} error${errors === 1 ? "" : "s"}, ${problems.length - errors} warning${problems.length - errors === 1 ? "" : "s"} · ${repo.areas.length} areas, ${lines} lines, ${repo.tags.length} tags in ${new Set(repo.tags.map((t) => t.file)).size} test files, ${repo.briefs.length} briefs`,
    );
    return errors ? 1 : 0;
  }
  if (cmd === "proof") {
    const files = a._.slice(1);
    if (!files.length) {
      log("give the junit reports: node --test --test-reporter=junit --test-reporter-destination=junit.xml, then harden proof junit.xml");
      return 1;
    }
    const repo = loadRepo(root);
    const rows = proof(repo, files.flatMap((f) => parseJunit(read(f))));
    const md = proofMarkdown(rows);
    if (typeof a.out === "string") writeFileSync(a.out, md);
    else log(md);
    const failed = rows.filter((r) => r.state === "fail" || (a.strict && ["skip", "none"].includes(r.state)));
    for (const r of failed) log(`error  ${r.ref}  ${MARK[r.state]}`);
    return failed.length ? 1 : 0;
  }
  if (cmd === "list") {
    const repo = loadRepo(root);
    const tagged = new Map();
    for (const t of repo.tags) tagged.set(t.ref, [...(tagged.get(t.ref) || []), `${t.file}:${t.line}`]);
    const rows = [...ids(repo)].map(([ref, { area, entry }]) => ({
      ref,
      kind: entry.kind,
      text: entry.text,
      planned: entry.planned,
      manual: entry.manual,
      file: `${area.file}:${entry.line}`,
      sources: pathsIn(area.fields.Sources?.value),
      tests: tagged.get(ref) || [],
    }));
    if (a.json) log(JSON.stringify(rows, null, 2));
    else for (const r of rows) log(`${r.ref.padEnd(36)} ${String(r.tests.length).padStart(2)} tests  ${r.text.slice(0, 80)}`);
    return 0;
  }
  log(`unknown command "${cmd}"\n\n${USAGE}`);
  return 1;
}

// Run as a command (also through npx's symlinked bin), not when imported by the tests.
const invoked = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (invoked) process.exitCode = main(process.argv.slice(2));
