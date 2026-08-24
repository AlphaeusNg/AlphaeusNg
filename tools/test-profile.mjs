import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
const ailyPackagesUrl = "https://github.com/AlphaeusNg/AIly/releases";
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
const quickLinks = readme.split("### Focus")[0] || "";
check(
  quickLinks.includes(`Windows / Android downloads](${ailyPackagesUrl})`),
  "AIly quick links expose the tested Windows and Android packages",
);

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
const ailyRow = rows.find(([, label]) => label === "AIly");
check(
  ailyRow?.[3].includes(`Packages](${ailyPackagesUrl})`),
  "AIly project row keeps a stable package-discovery link",
);

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
check(
  /run:\s*node tools\/test-link-audit\.mjs/.test(workflow),
  "push CI runs deterministic link-audit contracts",
);

const auditWorkflowPath = join(root, ".github/workflows/link-audit.yml");
check(existsSync(auditWorkflowPath), "profile has a separate live-link workflow");
const auditWorkflow = readFileSync(auditWorkflowPath, "utf8");
check(/^name:\s*link-audit\s*$/m.test(auditWorkflow), "link audit has a stable name");
check(/schedule:\s*\n\s+- cron:\s*["']17 3 \* \* 1["']/.test(auditWorkflow), "link audit runs weekly");
check(/^\s{2}workflow_dispatch:\s*$/m.test(auditWorkflow), "link audit supports manual runs");
check(!/^\s{2}(?:push|pull_request):/m.test(auditWorkflow), "live probes never run on push or pull request");
check(/permissions:\s*\n\s+contents:\s*read/.test(auditWorkflow), "link audit has read-only repository access");
check(/concurrency:[\s\S]*cancel-in-progress:\s*true/.test(auditWorkflow), "link audit cancels stale runs");
check(/timeout-minutes:\s*5/.test(auditWorkflow), "link audit has a bounded timeout");
check(/uses:\s*actions\/checkout@v7/.test(auditWorkflow), "link audit uses checkout v7");
check(/uses:\s*actions\/setup-node@v7/.test(auditWorkflow), "link audit uses setup-node v7");
check(/node-version:\s*["']24["']/.test(auditWorkflow), "link audit uses Node 24 LTS");
check(/run:\s*node tools\/test-link-audit\.mjs/.test(auditWorkflow), "scheduled audit verifies deterministic contracts first");
check(/run:\s*node tools\/audit-links\.mjs/.test(auditWorkflow), "scheduled audit runs live probes");
check(
  auditWorkflow.indexOf("test-link-audit.mjs") < auditWorkflow.indexOf("audit-links.mjs"),
  "scheduled audit runs contracts before network probes",
);
check(
  /GITHUB_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(auditWorkflow),
  "scheduled GitHub API probes use the scoped workflow token",
);

console.log(`test-profile.mjs: ${assertions} profile and CI policy assertions passed`);
