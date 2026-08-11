import assert from "node:assert/strict";
import { extractHttpsLinks, policyFor, probeLink } from "./audit-links.mjs";

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

const blocked = await probeLink("https://www.linkedin.com/in/alphaeus-ng", {
  fetchImpl: async () => ({ status: 999, headers: new Headers() }),
  timeoutMs: 100,
});
check(blocked.ok && blocked.status === 999, "LinkedIn automation blocking is a passing explicit policy outcome");

console.log(`test-link-audit.mjs: ${assertions} extraction, policy, and retry assertions passed`);
