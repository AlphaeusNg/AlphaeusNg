# AGENTS.md — AlphaeusNg (GitHub profile)

**Repo:** https://github.com/AlphaeusNg/AlphaeusNg  
**Local:** `/home/alph/projects/AlphaeusNg`  
**Hub:** `/home/alph/projects/AGENTS.md`  
**Effect:** Renders as the profile README at https://github.com/AlphaeusNg

## Purpose

Short public bio, links to portfolio / arcade / socials, and a table of featured repos. **Not** an application codebase.

## Structure

```text
README.md    # Only meaningful file for profile content
```

## Conventions

- Keep tone professional + lightly personal (existing salmon fun-fact is intentional).
- When shipping a new public project under `/home/alph/projects/`, consider adding a row to the “On this GitHub” table and the top link list.
- Prefer stable URLs:
  - Portfolio: https://alphaeusng.github.io/
  - Arcade: https://alphaeusng.github.io/AlpArcade/
  - VerseKeep: https://alphaeusng.github.io/VerseKeep/
- Avoid large binaries or project source here.

## Commands

```bash
cd /home/alph/projects/AlphaeusNg
# Preview: open README.md in editor / GitHub
git status
```

## Deploy

```bash
git add README.md
git commit -m "Update profile README"
git push origin main
```

## Agent checklist

1. Only edit profile presentation unless the user asks otherwise.
2. Keep links accurate after renames or new project sites.
3. Update `/home/alph/projects/AGENTS.md` hub table if this profile lists a new project.
