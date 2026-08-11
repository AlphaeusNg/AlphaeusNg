import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

check(/^### Hi, I'm Alphaeus Ng 👋$/m.test(readme), "profile keeps its identity heading");
check(/\*\*AI Research Engineer\*\*/.test(readme), "profile states the current professional role");
check(
  readme.includes("https://www.linkedin.com/in/alphaeus-ng"),
  "profile keeps the stable LinkedIn URL",
);
check(readme.includes("mailto:alphaolivegreen@gmail.com"), "profile keeps the public email link");
check(!/\]\(http:\/\//.test(readme), "Markdown links do not use insecure HTTP");

const expectedProjects = new Map([
  ["alphaeusng.github.io", ["https://github.com/AlphaeusNg/alphaeusng.github.io", "https://alphaeusng.github.io/"]],
  ["AIly", ["https://github.com/AlphaeusNg/AIly", "https://alphaeusng.github.io/AIly/"]],
  ["KoboForge", ["https://github.com/AlphaeusNg/KoboForge", "https://alphaeusng.github.io/KoboForge/"]],
  ["AlpArcade", ["https://github.com/AlphaeusNg/AlpArcade", "https://alphaeusng.github.io/AlpArcade/"]],
  ["VerseKeep", ["https://github.com/AlphaeusNg/VerseKeep", "https://alphaeusng.github.io/VerseKeep/"]],
  ["ChristoDay", ["https://github.com/AlphaeusNg/ChristoDay", "https://alphaeusng.github.io/ChristoDay/"]],
  ["CardFitSG", ["https://github.com/AlphaeusNg/CardFitSG", "https://alphaeusng.github.io/CardFitSG/"]],
  ["Seeking-Biblical-Truth", ["https://github.com/AlphaeusNg/Seeking-Biblical-Truth", "https://alphaeusng.github.io/pages/seeking-biblical-truth/"]],
  ["Car-Type-Classification-Service", ["https://github.com/AlphaeusNg/Car-Type-Classification-Service", null]],
]);

const section = readme.split("### On this GitHub")[1]?.split("⚡ Fun fact:")[0] || "";
const rows = section
  .split("\n")
  .map((line) => /^\| \[([^\]]+)\]\(([^)]+)\) \| [^|]+ \| (.+) \|$/.exec(line))
  .filter(Boolean);
check(rows.length === expectedProjects.size, "featured table has every expected project exactly once");

const seen = new Set();
for (const [, label, repoUrl, liveCell] of rows) {
  check(!seen.has(label), `featured project ${label} is not duplicated`);
  seen.add(label);
  const expected = expectedProjects.get(label);
  check(!!expected, `featured project ${label} is recognized`);
  if (!expected) continue;
  check(repoUrl === expected[0], `${label} uses its canonical GitHub URL`);
  if (expected[1]) {
    check(liveCell.includes(`(${expected[1]})`), `${label} uses its canonical live URL`);
  } else {
    check(liveCell.trim() === "—", `${label} honestly shows no public hosted app`);
  }
}
for (const label of expectedProjects.keys()) {
  check(seen.has(label), `featured table includes ${label}`);
}

check(/^name:\s*ci\s*$/m.test(workflow), "CI has a stable name");
check(/push:\s*\n\s+branches:\s*\[main\]/.test(workflow), "CI runs on main pushes");
check(/^\s{2}pull_request:\s*$/m.test(workflow), "CI runs on pull requests");
check(/permissions:\s*\n\s+contents:\s*read/.test(workflow), "CI has read-only repository access");
check(/concurrency:[\s\S]*cancel-in-progress:\s*true/.test(workflow), "CI cancels stale runs");
check(/timeout-minutes:\s*5/.test(workflow), "CI has a bounded timeout");
check(/uses:\s*actions\/checkout@v7/.test(workflow), "CI uses checkout v7");
check(/uses:\s*actions\/setup-node@v7/.test(workflow), "CI uses setup-node v7");
check(/node-version:\s*["']24["']/.test(workflow), "CI uses Node 24 LTS");
check(/run:\s*node tools\/test-profile\.mjs/.test(workflow), "CI runs the profile contract");

console.log(`test-profile.mjs: ${assertions} profile and CI policy assertions passed`);
