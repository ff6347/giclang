<!-- ABOUTME: Directs the educational curriculum documentation work for GIC. -->
<!-- ABOUTME: Defines the ordered tasks, boundaries, gate, and PM reporting route. -->

## Context

- GIC is a minimal visual programming language that Fabian is implementing as a student after completing the Java interpreter from *Crafting Interpreters*.
- This branch creates a complete, ordered educational lesson plan; it must not implement language features for Fabian.
- Git-bug: `6a023d1` — Build complete educational milestone curriculum.
- GitHub issue: none; this repository uses a SourceHut origin.
- Current checklist: `docs/LESSONS.md`.
- Current specification: `docs/Language specification rev 2.md`.
- Existing lessons: `docs/milestones/`.
- Durable decisions: `docs/MEMORY.md`.
- Recent parser context: `docs/journals/2026-07-31-repeat-parser-milestone.md`.
- PM contact: `@chakotay@main` via the `agent-msg` skill.

## Tasks

- [x] Audit the current implementation, specification, `docs/LESSONS.md`, existing milestone documents, journals, memory, and open git-bugs. Record which lessons are complete, in progress, missing, obsolete, or blocked by a design decision.
- [x] Define one prerequisite-ordered curriculum from the current parser state through interpreter, semantic analysis, drawing backends, browser IDE, Deno Desktop packaging, and later language-design topics.
- [x] Keep `docs/LESSONS.md` minimal: an ordered checklist only, with every item linked to a detailed lesson or an explicit design-decision document.
- [x] Reconcile existing milestone documents with the curriculum. Preserve accurate completed lessons; correct only factual contradictions that would mislead the student.
- [x] Create the missing detailed lesson documents under `docs/milestones/`. Each must include: learning goal, prerequisites, concepts to understand, relevant specification links, grammar/AST shape where applicable, a TDD-oriented student checklist, explicit non-goals, and concrete verification.
- [ ] Keep the work educational: explain what Fabian should learn and verify, but do not write complete functions, implementation patches, or copy-ready assignment solutions. Illustrative code fragments must remain short and focused.
- [ ] Treat unresolved language choices—dynamic lists, documentation comments, standard library/imports, and any newly discovered design question—as decision gates. Present options and consequences without silently choosing.
- [ ] Check ordering, links, terminology, and milestone scope across all curriculum documents. Remove fulfilled plan files only if any are found under `docs/plans/`; never remove journals.
- [ ] Run documentation formatting and link validation. Confirm no executable source, test, package, or configuration files changed.
- [ ] Update this checklist, commit atomic documentation changes with `[skip ci]`, push `docs/lesson-curriculum`, and report completion or blockers to `@chakotay@main` using `agent-msg`.

## Gate

All tasks are checked; every item in `docs/LESSONS.md` is ordered and linked to detailed educational guidance; existing completed milestones remain accurate; unresolved designs are explicit gates; documentation formatting and local links pass; no executable implementation files changed; commits are pushed to `docs/lesson-curriculum` for Fabian's review.

## Workflow

Loop through the tasks sequentially:

1. Pick the next unchecked task.
2. Use the subagent chain from the `handoff` skill: scout, planner, worker, reviewer, then fixes if required.
3. Mark the task complete in this file and commit progress atomically.
4. Re-evaluate the gate before continuing.
5. Do not merge into `main`. Push the branch and wait for Fabian's review.

## Coordination

Register with the `agent-msg` skill. Report to `@chakotay@main` when blocked, after a meaningful curriculum milestone, and when the branch is pushed. Do not contact Fabian through Telegram directly.
