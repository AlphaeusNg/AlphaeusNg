import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT = "AlphaeusNg-profile-link-audit";

export function extractHttpsLinks(markdown) {
  return [...new Set(
    [...String(markdown).matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1]),
  )];
}

export function policyFor(link, token = "") {
  const url = new URL(link);
  const headers = { "user-agent": USER_AGENT };
  const repo = /^\/AlphaeusNg\/([^/]+)\/?$/.exec(url.pathname);

  if (url.hostname === "github.com" && repo) {
    headers.accept = "application/vnd.github+json";
    if (token) headers.authorization = `Bearer ${token}`;
    return {
      target: `https://api.github.com/repos/AlphaeusNg/${encodeURIComponent(repo[1])}`,
      headers,
      acceptedStatuses: new Set([200]),
      kind: "github-repository",
    };
  }

  headers.accept = "text/html,application/xhtml+xml";
  if (url.hostname === "www.linkedin.com" && url.pathname === "/in/alphaeus-ng") {
    return {
      target: link,
      headers,
      acceptedStatuses: new Set([200, 999]),
      kind: "linkedin-profile",
    };
  }

  return {
    target: link,
    headers,
    acceptedStatuses: new Set([200]),
    kind: "public-page",
  };
}

function reasonFor(response) {
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers?.get?.("location") || "unknown location";
    return `unexpected redirect to ${location}`;
  }
  return `unexpected HTTP ${response.status}`;
}

export async function probeLink(link, options = {}) {
  const {
    attempts = DEFAULT_ATTEMPTS,
    fetchImpl = fetch,
    retryDelayMs = 500,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    token = process.env.GITHUB_TOKEN || "",
    wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms)),
  } = options;
  const policy = policyFor(link, token);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(policy.target, {
        headers: policy.headers,
        redirect: "manual",
        signal: controller.signal,
      });
      if (policy.acceptedStatuses.has(response.status)) {
        return { ok: true, attempt, kind: policy.kind, link, status: response.status };
      }
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < attempts) {
        await wait(retryDelayMs);
        continue;
      }
      return {
        ok: false,
        attempt,
        kind: policy.kind,
        link,
        reason: reasonFor(response),
        status: response.status,
      };
    } catch (error) {
      if (attempt < attempts) {
        await wait(retryDelayMs);
        continue;
      }
      const timedOut = error?.name === "AbortError";
      return {
        ok: false,
        attempt,
        kind: policy.kind,
        link,
        reason: timedOut ? `timed out after ${timeoutMs}ms` : `network error: ${error?.message || error}`,
        status: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("unreachable probe state");
}

export async function auditMarkdownLinks(markdown, options = {}) {
  const links = extractHttpsLinks(markdown);
  const results = await Promise.all(links.map((link) => probeLink(link, options)));
  return { links, results, failures: results.filter((result) => !result.ok) };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const report = await auditMarkdownLinks(readFileSync(join(root, "README.md"), "utf8"));
  for (const result of report.results) {
    const outcome = result.ok ? `HTTP ${result.status}` : result.reason;
    console.log(`${result.ok ? "OK" : "FAIL"} ${result.kind} ${outcome} ${result.link}`);
  }
  if (report.failures.length) {
    throw new Error(`${report.failures.length}/${report.links.length} public profile links failed policy`);
  }
  console.log(`audit-links.mjs: ${report.links.length} unique HTTPS links passed`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
