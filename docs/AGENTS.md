---
tags:
  - master
  - gic-lang
  - gic
---

# GIC Documentation Instructions

The root `AGENTS.md` applies throughout this directory.

## Documentation Structure

- `Language specification.md` is the active language specification.
- `deprecated/` contains historical specifications and is not authoritative.
- `decisions/` contains architecture and language decisions; respect each record's status.
- `milestones/` defines capability boundaries and verification.
- `LESSONS.md` records completed and open milestones.
- `plans/` contains active implementation plans.
- `journals/` contains append-only implementation checkpoints.
- `MEMORY.md` contains curated current decisions, lessons, risks, and techniques.
- `Implementing GIC.md` contains personal learning notes and should not be rewritten unless the task explicitly targets it.

## Project-Specific Rules

- Language semantics belong in the active specification and executable tests.
- Product scope belongs in git-bug issues, accepted decisions, and the active vertical-slice roadmap.
- Do not rewrite historical journal checkpoints to reflect later state.
- Update or remove obsolete memory instead of adding contradictory entries.
- Mark a milestone complete in `LESSONS.md` only when all of its criteria pass.
- Remove a completed plan in its own commit.
- Verify changed relative links, milestone names, roadmap references, tables, and diagrams.
