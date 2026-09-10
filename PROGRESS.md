# GitHub profile continuous improvement log

Last updated: 2026-09-11 (profile Cycle 5)

## Current state

- `main` was clean and aligned with `origin/main` at cycle start.
- The README features nine public repositories with their canonical GitHub and
  hosted URLs; the car classifier honestly has no public hosted app.
- Featured one-liners now match shipped 2026-09-11 capabilities: AIly PWA plus
  unsigned Windows/Android 0.1.4 dogfood, KoboForge local recovery draft, and
  VerseKeep offline shell with bundled catalog.
- `node tools/test-profile.mjs` enforces 82 identity, contact, project-map, CI,
  and scheduled-audit policy assertions; 15 isolated link-audit contracts cover
  extraction, endpoint policy, redirects, retries, and diagnostics.
- Push/PR CI stays zero-network. A separate read-only Node 24 workflow probes 19
  unique public links weekly and on manual dispatch with a five-minute bound.

## Latest cycle: align featured-table one-liners with shipped capabilities

### Why this was selected

Cycle 4 named AIly 0.1.4 in Currently, but the featured table still described
AIly, KoboForge, and VerseKeep at older capability levels after those products
shipped a PWA plus unsigned packages, a private local recovery draft, and an
offline application shell.

### Changes

- AIly one-liner now names the PWA plus unsigned Windows/Android 0.1.4 dogfood
  without implying signed-store distribution or OS hard-blocks.
- KoboForge one-liner now names the local recovery draft.
- VerseKeep one-liner now names the offline shell and bundled catalog without
  claiming live Bible, streaming music, or remote wallpapers work offline.
- Left the car classifier live cell as `—` (no public hosted app).
- Added three deterministic one-liner assertions so future copy cannot drop
  those shipped capabilities or overclaim AIly store/OS blocking.

### Verification

- Test-first: the profile contract failed on the old AIly table one-liner before
  the README change.
- `node tools/test-profile.mjs`: 82 assertions passed, up from 79.
- `node tools/test-link-audit.mjs`: all 15 network-policy contracts passed.
- `node tools/audit-links.mjs`: all 19 unique links passed; LinkedIn retained
  its explicit accepted 999 automation response.

## Latest cycle: name the current AIly dogfood packages

### Why this was selected

The Currently line still described AIly generically after `0.1.4` published
unsigned Windows and Android packages.

### Changes

- Mention AIly 0.1.4 PWA plus unsigned Windows/Android dogfood in Currently.

### Verification

- `node tools/test-profile.mjs` 79 assertions passed.

## Latest cycle: expose AIly's tested install packages

### Why this was selected

The profile's résumé-aligned claims and all existing public links remained
healthy. New authoritative project evidence did expose one documentation gap:
AIly now publishes CI-tested Windows NSIS and Android APK packages, but both
profile discovery surfaces linked only to the browser app.

### Changes

- Added a stable, non-redirecting AIly Releases link beside the top web-app
  link and in the featured-project live cell.
- Kept the package wording platform-specific (`Windows / Android downloads`)
  without implying signed-store distribution or OS-level blocking.
- Added two deterministic profile assertions so future copy edits cannot hide
  package discovery while leaving only the PWA visible.

### Verification and scores

- Test-first: the profile contract failed on the absent quick-link package URL
  before the README change.
- `node tools/test-profile.mjs`: 79 assertions passed, up from 77.
- `node tools/test-link-audit.mjs`: all 15 network-policy contracts passed.
- `node tools/audit-links.mjs`: all 19 unique links passed in 3.7 seconds, up
  from 18; the new Releases URL returned direct HTTP 200 and LinkedIn retained
  its explicit accepted 999 automation response.
- Recursive JavaScript syntax and `git diff --check` passed.
- Hosted CI run `32777127778` passed both deterministic suites in 14 seconds;
  the repository Pages run `32777126326` also completed. The raw public README
  exposes both new package-discovery links.
- Correctness/documentation: 6/10 → 10/10; verifiability: 8/10 → 10/10;
  maintainability: 9/10 → 9/10; user experience/discoverability: 4/10 → 9/10;
  security/robustness: 10/10 → 10/10 (the workflow token still reaches only
  GitHub repository API targets, never the public Releases URL).

### Lessons and process improvements

- Cross-repository project maps should react to newly verified distribution
  capabilities, not only new repository names.
- Prefer a stable Releases index over `/releases/latest` in strict link audits;
  the latter intentionally redirects and would weaken canonical-link policy.

## Previous cycle: audit public links without destabilizing push CI

### Why this was selected

The deterministic project-map contract proved README content but could not
detect a repository disappearing or a deployed site becoming unavailable.
Putting network probes on every push would trade that gap for third-party
flakiness, especially because LinkedIn deliberately blocks automated clients.

### Changes

- Added a zero-dependency auditor that extracts and deduplicates README HTTPS
  links, probes them in parallel, applies 10-second per-attempt timeouts, and
  retries network, 429, and 5xx failures up to three attempts.
- Repository links use the authenticated GitHub API and require 200; Pages and
  other public URLs require direct 200 without redirect; only the canonical
  LinkedIn profile accepts its known 999 automation response as well as 200.
- Added 15 network-free contracts for extraction, token isolation, endpoint and
  status policies, retry bounds, redirect diagnostics, and stable errors.
- Added a separate Monday 03:17 UTC/manual live-audit workflow with read-only
  permissions, stale-run cancellation, Node 24, and a five-minute timeout.
- Kept live probes out of push/PR CI while adding the deterministic audit suite;
  expanded the profile/workflow contract from 61 to 77 assertions.
- Documented deterministic and live commands in `AGENTS.md`.

### Verification and scores

- Test-first: the profile contract failed because push CI did not run link-audit
  contracts and no separate scheduled workflow existed.
- `node tools/test-profile.mjs`: 77 assertions passed.
- `node tools/test-link-audit.mjs`: 15 assertions passed.
- `node tools/audit-links.mjs`: all 18 unique links passed in 3.1 seconds; 17
  GitHub API/Pages targets returned 200 and LinkedIn returned accepted 999.
- Recursive tool syntax and `git diff --check`: passed.
- Correctness/reliability: 9/10 (canonical status/redirect behavior is explicit).
- Verifiability: 10/10 (content and external availability now have separate,
  appropriately timed gates).
- Maintainability: 9/10 (one policy function owns endpoint/status assumptions).
- Performance: 9/10 (parallel weekly probes completed in 3.1 seconds; retry and
  workflow bounds cap bad-network cost).
- Security/robustness: 10/10 (the scoped token is sent only to `api.github.com`;
  both workflows are read-only and push CI remains network-free).

### Lessons and process improvements

- Reliability policies should distinguish canonical redirects, retriable
  availability failures, and deliberate bot responses instead of treating every
  non-200 alike.
- Test network policy with injected fetch responses; reserve real probes for a
  scheduled/manual gate so ordinary content work stays deterministic.
- Never attach a workflow token to arbitrary README URLs. Rewrite only known
  GitHub repository links to the API and isolate authorization there.

## Opportunity backlog

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Reconcile profile stack/focus copy when the portfolio résumé changes | Documentation | Medium | Small / low | Requires an authoritative résumé change, not inference |
| — | Align featured-table one-liners with shipped AIly/KoboForge/VerseKeep capabilities | Documentation | Medium | Tiny / low | Three one-liner assertions; car classifier stays unhosted | Completed in Cycle 5 |
| — | Expose tested AIly Windows/Android packages | Documentation / discoverability | Medium | Tiny / low | Two profile assertions plus a direct-200 live Releases probe | Completed in Cycle 3 |
| — | Add a bounded periodic live-link audit with explicit bot-status policy | Verification | Medium | Small / medium | 18 parallel probes plus 15 deterministic policy contracts | Completed in Cycle 2 |

## Next cycle

Workspace next: audit AIly package distribution and install integrity. Profile
next: reconcile stack/focus copy only when an authoritative portfolio résumé
change provides new evidence.
