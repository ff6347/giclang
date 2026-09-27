<!-- ABOUTME: Records implementation checkpoints for the pnpm workspace migration. -->
<!-- ABOUTME: Keeps package, deployment, and verification context for later review. -->

# Workspace migration

- [decision] The root is a private command orchestrator; core and CLI publishable packages share version `0.1.0`, while content, editor, and desktop packages remain private. No npm publication or origin change was attempted.
- [technique] The installed CLI test packs both packages and installs their tarballs together with npm offline, proving the `workspace:` dependency becomes resolvable package metadata.
- [decision] Editor development compiles core and content before Vite starts and runs both TypeScript projects in watch mode against their package exports. Production and standalone builds use those same exports.
- [lesson] `pnpm add --offline` can fail on missing registry metadata even when package tarballs are cached; normal `pnpm add` reused pinned versions and updated the one workspace lockfile.
- [risk] Docker image acceptance could not run because the Docker daemon was unavailable. The macOS desktop package and development shell built and launched, but packaged Open/Save and preview were not clicked through; do not claim those gates passed.
- [risk] npm authentication returned 401 and registry lookups for `@giclang/core`, `@giclang/cli`, and `gic-lang` returned 404. Confirm scope control and first public version before publishing.
- [lesson] git-bug issue `2612dbd` tracks the Docker and packaged-desktop acceptance gates. The mutation helper's bridge push initially timed out resolving GitHub, but a retry exported the issue; bridge pull still reports its existing import error.
