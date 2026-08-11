# GitHub profile continuous improvement log

Last updated: 2026-08-11 (workspace Cycle 101; profile Cycle 1)

## Current state

- `main` was clean and aligned with `origin/main` at cycle start.
- The README features nine public repositories with their canonical GitHub and
  hosted URLs; the car classifier honestly has no public hosted app.
- `node tools/test-profile.mjs` enforces 61 identity, contact, project-map,
  secure-link, and CI policy assertions.
- GitHub Actions runs the zero-dependency profile contract on Node 24 with
  read-only contents access, stale-run cancellation, and a five-minute timeout.

## Latest cycle: make the public project map verifiable

### Why this was selected

The profile had no executable checks. Every repository/live mapping and stable
contact link could drift silently during manual edits, even though the profile
is the public directory for the workspace. Direct probes found all 18 project
site/repository URLs healthy; LinkedIn returned its expected automated-client
block rather than a profile content error.

### Changes

- Added a zero-dependency Node contract for identity/contact anchors, HTTPS-only
  Markdown links, all nine featured project rows, canonical repo/live pairs,
  uniqueness, and the explicit no-live-app marker.
- Added a least-privilege Node 24 workflow and made its triggers, bounds,
  supported action majors, and command part of the same executable contract.
- Documented the local check in `AGENTS.md`.

### Verification and scores

- Test-first: the contract failed because the repository had no CI workflow.
- `node tools/test-profile.mjs`: 61 assertions passed.
- `node --check tools/test-profile.mjs` and `git diff --check`: passed.
- Direct live probes: 18 project/GitHub URLs returned HTTP 200; LinkedIn returned
  its bot-protection status 999 and remains the documented canonical URL.
- Correctness/reliability: 9/10 (canonical featured mappings are executable).
- Verifiability: 10/10 (the public profile and its CI policy gate every change).
- Maintainability: 9/10 (new project rows require one obvious expected mapping).
- Performance: 10/10 (local check is filesystem-only and near-instant).
- Security/robustness: 9/10 (read-only CI and insecure Markdown links are
  enforced without flaky network calls).

### Lessons and process improvements

- A content-only repository still benefits from contracts when it is a public
  index into many independently deployed projects.
- Keep hosted CI deterministic; perform live URL probes during improvement
  audits rather than making every push depend on third-party bot policies.
- Test the verification workflow itself so a missing trigger, weakened
  permission, or stale runtime cannot silently disable the content contract.

## Opportunity backlog

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Add a bounded periodic live-link audit with explicit bot-status policy | Verification | Medium | Small / medium | LinkedIn blocks automation; push CI must remain deterministic |
| 2 | Reconcile profile stack/focus copy when the portfolio résumé changes | Documentation | Medium | Small / low | Requires an authoritative résumé change, not inference |

## Next cycle

Workspace next: rotate to VerseKeep. Profile next: design a non-flaky scheduled
live-link audit that distinguishes outages, redirects, and deliberate bot blocks.
