<!-- ABOUTME: Records the production container cutover for the browser PWA. -->
<!-- ABOUTME: Captures deployment decisions, verification evidence, and unrelated test failures. -->

# Docker PWA deployment

- [decision] Coolify builds the PWA from the repository `Dockerfile`; Railpack and its mise-managed pnpm bootstrap are no longer part of production deployment.
- [decision] The build stage pins Node 26.5.1 and pnpm 12.3.4, while the runtime contains only Caddy 2.10.2 and `browser/dist`.
- [decision] Caddy serves the application shell for unknown paths and prevents HTTP caching of `sw.js`, preserving the PWA update flow.
- [technique] The Docker build completed, and a browser smoke check against the running image loaded the IDE, registered `/sw.js`, fetched the manifest, and observed the service worker's no-cache response header.
- [risk] Three unrelated Firefox acceptance tests remain failing: stale example-count and hover expectations in `e2e/content.spec.ts`, and the connected-nodes pixel expectation in `e2e/connected-nodes-preview.spec.ts`. Git-bug issue `be27ae0` tracks them.
