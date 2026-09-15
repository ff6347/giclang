---
tags:
  - master
  - gic-lang
  - gic
---

# GIC Documentation Guide

The root `AGENTS.md` applies throughout this directory. This file adds rules for
maintaining GIC's specification, decisions, milestones, plans, and project
memory.

## Documentation Map

- `Language specification.md` — active language semantics, currently revision
  2.2.
- `deprecated/` — historical specifications; never use them to override the
  active specification.
- `decisions/` — architecture and language decision records. Respect each
  record's status.
- `milestones/` — capability contracts and verification guidance.
- `LESSONS.md` — milestone completion ledger.
- `plans/` — active implementation plans only.
- `journals/` — append-only session checkpoints and raw observations.
- `MEMORY.md` — curated durable decisions, techniques, risks, and lessons.
- `Implementing GIC.md` — Fabian's learning notes; preserve them unless review
  is explicitly requested.

## Source-of-Truth Rules

- Language behavior belongs in the active specification and executable tests.
- Product scope belongs in the assigned git-bug issue, accepted decisions, and
  the active vertical-slice roadmap.
- A journal records what was true at that checkpoint. Do not rewrite old journal
  state to look current.
- Memory reflects current durable knowledge. Update or remove an obsolete entry
  instead of adding a contradictory duplicate.
- A milestone remains unchecked in `LESSONS.md` until all of its acceptance and
  verification requirements are complete.
- Remove a completed plan in its own documentation commit; completed plans are
  documentation rot.

If an issue, specification, decision, test, and journal disagree, inspect their
status and chronology. Ask Fabian when authoritative sources still conflict.

## Writing Changes

- Keep changes surgical and tied to the assigned issue.
- Use stable present-tense wording for durable guidance. Avoid migration
  narration that does not explain a lasting constraint; temporal wording is
  appropriate in journals and explicit transition records.
- Link to the canonical document instead of copying commands, policies, or
  decision text that will drift.
- Preserve valid comments and Fabian's personal notes.
- Use relative links for repository documents. Paths containing spaces should
  use angle-bracket Markdown destinations.
- New documentation files start with two HTML `ABOUTME:` comments unless
  frontmatter or another required file format must be first.
- Journal filenames use the current date and a kebab-case task or branch name.
- Tag journal observations with categories such as `[decision]`, `[lesson]`,
  `[risk]`, `[technique]`, or `[question]`.

## Validation

Follow the documentation quality gates in the root guide. In addition:

- verify changed relative links resolve to real files and anchors where
  practical;
- verify milestone and roadmap references use current names;
- search for stale claims superseded by the change; and
- review the rendered structure when changing tables, diagrams, or deeply nested
  lists.
