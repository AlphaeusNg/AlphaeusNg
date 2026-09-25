import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT = "AlphaeusNg-profile-link-audit";

export function extractReadmeLinkEntries(markdown) {
  const entries = [];
  let heading = "";
  for (const line of String(markdown).split("\n")) {
    const headingMatch = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (headingMatch) heading = headingMatch[1].trim();
    const rowMatch = /^\|\s*\[([^\]]+)\]\([^)]+\)\s*\|/.exec(line);
    const rowLabel = rowMatch?.[1] || "";
    for (const match of line.matchAll(/\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g)) {
      const label = match[1].trim() || match[2];
      const entry = rowLabel
        ? (label === rowLabel ? rowLabel : `${rowLabel} · ${label}`)
        : (heading ? `${heading} · ${label}` : label);
      entries.push({ entry, label, url: match[2] });
    }
  }
  return entries;
}

export function extractHttpsLinks(markdown) {
  return [...new Set(extractReadmeLinkEntries(markdown).map((item) => item.url))];
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

// 404/410 and unexpected redirects mean the README destination is wrong.
// Timeouts, network errors, 429, and 5xx can still clear. 401/403/999 mean
// the client was blocked, which is not evidence the destination is gone.
export function classifyProbeFailure({ reason = "", status = null } = {}) {
  if (status === 401 || status === 403 || status === 999) return "bot-restriction";
  if (
    status === null ||
    status === 408 ||
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    /timed out|network error/i.test(String(reason))
  ) {
    return "transient";
  }
  return "broken-destination";
}

export function formatAuditFailure(result) {
  const where = result.entries?.length ? result.entries.join("; ") : result.link;
  return `${result.disposition} [${where}] ${result.reason} (${result.link})`;
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
        return { ok: true, attempt, disposition: "ok", kind: policy.kind, link, status: response.status };
      }
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < attempts) {
        await wait(retryDelayMs);
        continue;
      }
      const reason = reasonFor(response);
      return {
        ok: false,
        attempt,
        disposition: classifyProbeFailure({ reason, status: response.status }),
        kind: policy.kind,
        link,
        reason,
        status: response.status,
      };
    } catch (error) {
      if (attempt < attempts) {
        await wait(retryDelayMs);
        continue;
      }
      const timedOut = error?.name === "AbortError";
      const reason = timedOut ? `timed out after ${timeoutMs}ms` : `network error: ${error?.message || error}`;
      return {
        ok: false,
        attempt,
        disposition: classifyProbeFailure({ reason, status: null }),
        kind: policy.kind,
        link,
        reason,
        status: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("unreachable probe state");
}

export async function auditMarkdownLinks(markdown, options = {}) {
  const grouped = new Map();
  for (const item of extractReadmeLinkEntries(markdown)) {
    if (!grouped.has(item.url)) grouped.set(item.url, []);
    const labels = grouped.get(item.url);
    if (!labels.includes(item.entry)) labels.push(item.entry);
  }
  const links = [...grouped.keys()];
  const results = await Promise.all(links.map(async (link) => {
    const result = await probeLink(link, options);
    return { ...result, entries: grouped.get(link) };
  }));
  return { links, results, failures: results.filter((result) => !result.ok) };
}

export function summarizeAuditFailures(report) {
  const lines = report.failures.map((failure) => formatAuditFailure(failure));
  return `${report.failures.length}/${report.links.length} public profile links failed policy:\n${lines.join("\n")}`;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const report = await auditMarkdownLinks(readFileSync(join(root, "README.md"), "utf8"));
  for (const result of report.results) {
    const where = result.entries?.join("; ") || result.link;
    if (result.ok) {
      const acceptedBot = result.status === 999 ? " accepted bot restriction" : "";
      console.log(`OK ${result.kind} HTTP ${result.status}${acceptedBot} [${where}] ${result.link}`);
    } else {
      console.log(`FAIL ${formatAuditFailure(result)}`);
    }
  }
  if (report.failures.length) {
    throw new Error(summarizeAuditFailures(report));
  }
  console.log(`audit-links.mjs: ${report.links.length} unique HTTPS links passed`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
