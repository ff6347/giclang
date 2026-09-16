---
# ABOUTME: Defines the verified workflow for landing reviewed GIC changes.
# ABOUTME: Publishes tested changes to origin/main and reports the exact outcome.
name: land
description: >-
  Lands reviewed GIC changes onto origin/main, verifies the published commit, and synchronizes the assigned git-bug issue. Invoke only when the user has explicitly requested landing, not for review, preparation, passing checks, or skill installation.
metadata:
  delta-action: land
---

# Land GIC Changes

## Invocation means permission

Use this skill only after an explicit landing request, including the Land Changes button, `/land`, or an affirmative request to run this installed skill. That request is permission to perform the landing workflow. Do not ask again whether to merge or push.

Do not weaken checks, bypass hooks, force-push, rewrite shared history, or merge unrelated work. Stop for a genuine blocker or unresolved scope.

## Fixed project destination

The publication destination is `origin/main`. At runtime, verify that:

- the repository is GIC;
- `origin` is the source remote for `ff6347/gic-lang`;
- `main` remains the intended target; and
- the `local` remote, when present, points to the user's primary checkout.

Do not use Delta's `local` backlink as the publication remote. Use it only for the documented git-bug access and when the user separately requests local branch synchronization.

The repository currently permits direct pushes and does not require a pull request or merge queue. Check the destination before each landing; if repository policy or branch protection now requires another route, stop and report that blocker instead of bypassing it.

## 1. Establish the source

1. Record the current branch and `HEAD` as the proposed source.
2. Run `git status --short --branch` and inspect staged, unstaged, and untracked files.
3. If the working tree contains unrelated or ambiguous work, stop and ask how to handle it.
4. If intended changes are uncommitted, review their complete diff, load the `commit` skill, run the applicable checks below, and create atomic conventional commits. Stage files intentionally.
5. Confirm the source commits and diff match the user's reviewed scope.

An empty diff does not prove there is nothing to land: compare the recorded source commit with `origin/main`.

## 2. Refresh and classify

Fetch `origin/main`, then compare the recorded source commit with the fetched target.

- If the source commit is already an ancestor of `origin/main`, do not create a duplicate merge. Continue with remote verification, issue synchronization, and outcome reporting.
- If `origin/main` is an ancestor of the source, the candidate can fast-forward.
- If the histories diverged, prepare a regular merge commit on a temporary landing branch based on the fetched `origin/main`.

Inspect the exact candidate diff and classify it:

- documentation-only;
- core or CLI executable code;
- browser code; or
- another self-contained application or spike.

When classification is ambiguous, run the broader applicable checks.

## 3. Prepare the landing candidate

Prepare the candidate on a temporary branch created from the fetched `origin/main`, preserving the recorded source commit.

- Fast-forward when `origin/main` is an ancestor of the source.
- Otherwise, merge the source with a regular merge commit and a non-interactive editor setting.
- Never rebase or rewrite a reviewed/shared source branch as part of landing.

### Conflict policy

If any merge conflict occurs, do not edit or resolve conflicted files. Report the conflicting paths and ask Fabian how to proceed. Continue only after his explicit resolution instruction. Abort safely if he declines the merge.

## 4. Verify the exact candidate

Install the locked root dependencies when needed:

```bash
mise exec -- pnpm install --frozen-lockfile
```

Sources: [`mise.toml`](../../../mise.toml), [`AGENTS.md` commands](../../../AGENTS.md#commands), and [`.github/workflows/deploy-pages.yml`](../../../.github/workflows/deploy-pages.yml).

Always run `git diff --check`.

For documentation-only changes:

```bash
mise exec -- pnpm fmt:check
```

Also inspect changed relative links, milestone names, roadmap references, tables, and diagrams where applicable.

For core or CLI changes:

```bash
mise exec -- pnpm test
mise exec -- pnpm test:compact
mise exec -- pnpm typecheck
mise exec -- pnpm lint
mise exec -- pnpm fmt:check
```

For browser changes, run the core/CLI checks above and:

```bash
mise exec -- pnpm typecheck:browser
mise exec -- pnpm build:browser
mise exec -- pnpm test:e2e
```

Sources: [`AGENTS.md` project test seams](../../../AGENTS.md#project-test-seams) and [`package.json`](../../../package.json).

For another self-contained application or spike, run the root lint and format checks plus the verification command declared by that changed component's applicable instructions, manifest, or verification script. Do not invent a command or silently omit verification; stop if no authoritative gate can be established.

All applicable checks must pass on the exact candidate. A previous run on an earlier commit is insufficient. Do not land with pending, failing, missing, or unverifiable required checks.

## 5. Publish without overwriting remote work

Immediately before publication:

1. Confirm `origin/main` still equals the target commit used to prepare the candidate.
2. If it advanced, fetch it and rebuild and reverify the candidate. Apply the conflict policy above if this produces a conflict.
3. Push the verified candidate to `origin/main` with a normal push. Never force the update.
4. Read `refs/heads/main` from `origin` and verify it equals the candidate SHA.

The GitHub Pages workflow runs on pushes to `main` and builds the browser with the locked toolchain: [`deploy-pages.yml`](../../../.github/workflows/deploy-pages.yml).

When a workflow run is triggered for the landed SHA, use authenticated `gh` commands to wait for that exact run and require success. If an applicable workflow is pending or fails, do not report successful completion. For a docs-only commit carrying the repository-required `[skip ci]` marker, record that no workflow run is expected and rely on the completed local documentation gate.

## 6. Synchronize the issue

When the conversation identifies an assigned git-bug issue, load the `git-bug` skill and close it only after the source commit is verified on `origin/main`. Use the skill's mutation helper so all configured synchronization targets are updated.

In Delta.app, prefix every git-bug command and mutation-helper invocation with the primary checkout selected through:

```bash
GIT_DIR="$(git remote get-url local)"
```

Keep that variable scoped to the single command. Do not export it or use it for source-control commands. Do not create a separate GitHub issue.

Source: [`AGENTS.md` Delta.app git-bug access](../../../AGENTS.md#deltaapp-git-bug-access).

Retry safe synchronization failures. If issue synchronization remains blocked, state that the code landed but project completion bookkeeping did not finish.

## 7. Clean up and report

After successful publication:

- leave the working tree clean;
- remove only the temporary landing branch created by this workflow;
- preserve the reviewed source branch unless the user requests its deletion;
- report the target branch, landed short SHA, checks, workflow result, issue state, and any intentionally retained branch.

When running in a subthread and `report_subthread_status` is available, report the final result to the parent:

- use `status: "success"` only after `origin/main` contains the candidate and every applicable verification has passed;
- use `status: "failure"` when landing is blocked or an attempted landing does not satisfy its required verification;
- keep the title to a few sentence-case words and the description to one short line;
- link the verified commit and exact CI run when those URLs exist, and omit links that cannot be verified.

Otherwise, report the same result directly in the current conversation. A prepared commit, pushed topic branch, or passing build is not landing success.
