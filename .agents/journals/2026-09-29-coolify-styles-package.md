<!-- ABOUTME: Records the Coolify browser-image style-package diagnosis and verification. -->
<!-- ABOUTME: Preserves the workspace-copy requirement for Docker browser builds. -->

# Coolify style package deployment

- [lesson] A frozen pnpm workspace install can succeed when a linked workspace package's files were not copied into the image; Vite then fails when it resolves an import from that package.
- [decision] The browser image copies `packages/styles/package.json` before dependency installation and the complete `packages/styles` package before `build:browser`.
- [verification] A no-cache build reproduced the unresolved `@giclang/styles/tokens.css` import. The complete no-cache image build and a Caddy HTTP smoke test passed after the Dockerfile change.
