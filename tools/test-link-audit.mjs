import assert from "node:assert/strict";
import {
  auditMarkdownLinks,
  classifyProbeFailure,
  extractHttpsLinks,
  extractReadmeLinkEntries,
  formatAuditFailure,
  policyFor,
  probeLink,
  summarizeAuditFailures,
} from "./audit-links.mjs";

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

const extracted = extractHttpsLinks(`
[One](https://example.com/) [duplicate](https://example.com/)
[Repo](https://github.com/AlphaeusNg/AIly) [mail](mailto:test@example.com)
`);
assert.deepEqual(extracted, ["https://example.com/", "https://github.com/AlphaeusNg/AIly"]);
assertions += 1;

const repo = policyFor("https://github.com/AlphaeusNg/AIly", "scoped-token");
check(repo.target === "https://api.github.com/repos/AlphaeusNg/AIly", "repository links use the GitHub API");
check(repo.headers.authorization === "Bearer scoped-token", "GitHub API alone receives the workflow token");
check(repo.acceptedStatuses.has(200) && repo.acceptedStatuses.size === 1, "repositories require HTTP 200");

const page = policyFor("https://alphaeusng.github.io/AIly/", "do-not-leak");
check(page.target === "https://alphaeusng.github.io/AIly/", "Pages links retain their canonical URL");
check(!page.headers.authorization, "public pages never receive the GitHub token");
check(page.acceptedStatuses.has(200) && page.acceptedStatuses.size === 1, "public pages require HTTP 200");

const linkedIn = policyFor("https://www.linkedin.com/in/alphaeus-ng");
check(linkedIn.acceptedStatuses.has(200), "LinkedIn accepts a normal public response");
check(linkedIn.acceptedStatuses.has(999), "LinkedIn explicitly accepts its automation-block response");

let retryCalls = 0;
const retried = await probeLink("https://example.com/", {
  fetchImpl: async () => {
    retryCalls += 1;
    return { status: retryCalls === 1 ? 503 : 200, headers: new Headers() };
  },
  retryDelayMs: 0,
  timeoutMs: 100,
});
check(retried.ok && retryCalls === 2 && retried.attempt === 2, "transient server failures retry then recover");

let redirectCalls = 0;
const redirected = await probeLink("https://example.com/", {
  fetchImpl: async () => {
    redirectCalls += 1;
    return { status: 301, headers: new Headers({ location: "https://other.example/" }) };
  },
  retryDelayMs: 0,
  timeoutMs: 100,
});
check(!redirected.ok && redirectCalls === 1, "canonical redirects fail without pointless retries");
check(redirected.reason.includes("https://other.example/"), "redirect failures identify their destination");
check(redirected.disposition === "broken-destination", "unexpected redirects are broken destinations");

let networkCalls = 0;
const networkFailure = await probeLink("https://example.com/", {
  attempts: 2,
  fetchImpl: async () => {
    networkCalls += 1;
    throw new Error("offline");
  },
  retryDelayMs: 0,
  timeoutMs: 100,
});
check(!networkFailure.ok && networkCalls === 2, "network failures use the bounded retry count");
check(networkFailure.reason === "network error: offline", "network failures retain a stable diagnostic");
check(networkFailure.disposition === "transient", "network failures stay transient after retries are exhausted");

const blocked = await probeLink("https://www.linkedin.com/in/alphaeus-ng", {
  fetchImpl: async () => ({ status: 999, headers: new Headers() }),
  timeoutMs: 100,
});
check(
  blocked.ok && blocked.status === 999 && blocked.disposition === "ok",
  "LinkedIn automation blocking is a passing explicit policy outcome",
);

const stillDown = await probeLink("https://example.com/flaky", {
  attempts: 2,
  fetchImpl: async () => ({ status: 503, headers: new Headers() }),
  retryDelayMs: 0,
  timeoutMs: 100,
});
check(
  !stillDown.ok && stillDown.disposition === "transient" && stillDown.attempt === 2,
  "exhausted server failures stay transient rather than broken destinations",
);

let forbiddenCalls = 0;
const forbidden = await probeLink("https://example.com/gated", {
  fetchImpl: async () => {
    forbiddenCalls += 1;
    return { status: 403, headers: new Headers() };
  },
  retryDelayMs: 0,
  timeoutMs: 100,
});
check(
  !forbidden.ok && forbidden.disposition === "bot-restriction" && forbiddenCalls === 1,
  "client blocks are bot restrictions and are not retried as transient outages",
);
check(classifyProbeFailure({ status: 404, reason: "unexpected HTTP 404" }) === "broken-destination", "missing pages are broken destinations");
check(classifyProbeFailure({ status: 999, reason: "unexpected HTTP 999" }) === "bot-restriction", "a non-accepted 999 is a bot restriction");

const sample = [
  "### Hi, I'm Alphaeus Ng",
  "",
  "[Windows / Android downloads](https://github.com/AlphaeusNg/AIly/releases)",
  "",
  "### On this GitHub",
  "",
  "| [AIly](https://github.com/AlphaeusNg/AIly) | Local-first | [Packages](https://github.com/AlphaeusNg/AIly/releases) |",
  "| [Missing](https://example.com/missing) | gone | — |",
].join("\n");
const sampleEntries = extractReadmeLinkEntries(sample);
check(
  sampleEntries.some((item) => item.entry === "Hi, I'm Alphaeus Ng · Windows / Android downloads"),
  "link extraction keeps the surrounding README label",
);
check(
  sampleEntries.some((item) => item.entry === "AIly · Packages"),
  "table links keep their repository-row entry",
);

const audited = await auditMarkdownLinks(sample, {
  attempts: 2,
  retryDelayMs: 0,
  timeoutMs: 100,
  token: "scoped-token",
  fetchImpl: async (target) => {
    const url = String(target);
    if (url === "https://example.com/missing") return { status: 404, headers: new Headers() };
    if (url === "https://github.com/AlphaeusNg/AIly/releases") throw new Error("offline");
    return { status: 200, headers: new Headers() };
  },
});
const missing = audited.failures.find((failure) => failure.link === "https://example.com/missing");
const releases = audited.failures.find((failure) => failure.link === "https://github.com/AlphaeusNg/AIly/releases");
check(missing?.disposition === "broken-destination" && missing.entries.includes("Missing"), "a 404 names the README row and the broken destination");
check(
  releases?.disposition === "transient" &&
    releases.entries.includes("Hi, I'm Alphaeus Ng · Windows / Android downloads") &&
    releases.entries.includes("AIly · Packages"),
  "a transient failure names every README entry that uses the link",
);
const summary = summarizeAuditFailures(audited);
check(summary.includes("broken-destination [Missing]"), "the failure summary distinguishes a broken destination");
check(summary.includes("transient ["), "the failure summary distinguishes a transient failure");
check(
  formatAuditFailure({
    disposition: "bot-restriction",
    entries: ["LinkedIn"],
    link: "https://www.linkedin.com/in/alphaeus-ng",
    reason: "unexpected HTTP 403",
  }) === "bot-restriction [LinkedIn] unexpected HTTP 403 (https://www.linkedin.com/in/alphaeus-ng)",
  "a bot restriction names the README entry instead of looking like a dead link",
);

console.log(`test-link-audit.mjs: ${assertions} extraction, policy, and retry assertions passed`);
