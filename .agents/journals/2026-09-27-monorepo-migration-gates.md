<!-- ABOUTME: Records the review decisions behind the monorepo migration gates. -->
<!-- ABOUTME: Preserves the build, content, and deployment risks for implementation. -->

# Monorepo migration gates

- [risk] Package exports backed by compiled core output require clean-install CLI, browser, and standalone build/start checks; stale local artifacts can hide missing build ordering.
- [decision] Content-model validation and trusted Markdown compilation belong to the content package; the editor owns Vite-specific discovery and asset URLs.
- [decision] The structural migration preserves the live PWA origin. A later domain move needs a separate decision for origin-scoped recovery data and user migration guidance.
- [technique] Reviewed the plan's existing links and package boundaries without changing executable behavior; `git diff --check` passed.
