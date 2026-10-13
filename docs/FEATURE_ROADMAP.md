# Profile feature roadmap

Research date: 2026-10-14 (Asia/Singapore).

## Selected feature: choose a project by task

The profile already introduces three representative projects and lists every
repository. Visitors with a specific task still have to translate repository
names and descriptions into an action. Add a short chooser that takes them
directly to the relevant published app, writing page, or source repository.

This is a presentation decision inferred from the existing README; there is no
visitor analytics evidence or measured conversion claim.

## Research and evidence

- [GitHub profile README guidance](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)
  confirms that the public username repository's root README is the profile
  surface. The feature belongs in README.md.
- [GitHub Markdown guidance](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
  documents headings, inline links, and unordered lists. Native Markdown fits
  this short chooser without adding images or external widgets.
- The published [AIly app](https://alphaeusng.github.io/AIly/) identifies its
  purpose as helping with targets; [KoboForge](https://alphaeusng.github.io/KoboForge/)
  exposes EPUB conversion and editing; [CardFitSG](https://alphaeusng.github.io/CardFitSG/)
  describes cashback comparison; [AlpArcade](https://alphaeusng.github.io/AlpArcade/)
  exposes browser game cabinets.
- [ChristoDay](https://alphaeusng.github.io/ChristoDay/) publishes a weekday
  reading plan, [VerseKeep](https://alphaeusng.github.io/VerseKeep/) emphasizes
  meditation, and the [Biblical Truth viewer](https://alphaeusng.github.io/pages/seeking-biblical-truth/)
  exposes a note browser. Give these three distinct actions.
- The published [Thoughts page](https://alphaeusng.github.io/pages/alphaeus-thoughts.html)
  is the existing personal writing destination. The
  [car classifier repository](https://github.com/AlphaeusNg/Car-Type-Classification-Service)
  has Quick Start and API usage sections; retain the explicit self-hosting
  boundary rather than suggesting a hosted demo.

All nine destination pages above returned HTTP 200 during research. The web
reader could not extract several Pages sites, so their published HTML titles,
descriptions, and headings were inspected directly over HTTPS. Product wording
also agrees with the existing published profile; no new capability is inferred
from a repository name.

## Scope and acceptance

- Add seven task bullets between Currently and the complete project directory:
  targets, EPUBs, cashback, games, Scripture, writing, and ML service source.
- Use concise action labels and stable HTTPS destination URLs. The Scripture
  bullet must differentiate weekday reading, meditation, and note browsing.
- Keep the identity, biography, stack, three lead projects, installation and
  checksum guidance, fun fact, and all nine directory rows intact.
- Preserve unsigned AIly package and pending OS-blocking qualifications. The
  car service remains explicitly self-hosted with no public hosted app.
- Keep the chooser within seven bullets, without a second detailed table,
  release numbers, metrics, product pricing, or new professional claims.
- Run the profile and link-audit contracts, syntax/whitespace checks, and live
  README-link probes. Add only navigation invariants that protect the chooser's
  task destinations and self-hosting distinction.

## Next priorities

1. Reconcile professional focus or stack only when an authoritative portfolio
   résumé change supplies evidence. Do not infer career changes from repos.
2. Review chooser destinations when a project is renamed or its public entry
   path changes. Continue using the existing weekly live-link audit.
3. Consider a second source/developer entry path only if project documentation
   supplies a common concrete workflow; avoid adding speculative contribution
   promises or repeating the existing repository directory.
