<!-- ABOUTME: Records the dedicated Coolify image for the static Astro website. -->
<!-- ABOUTME: Preserves its workspace dependencies, routing behavior, and verification. -->

# Site Docker image

- [decision] Coolify builds the Astro website with `Dockerfile.site` and serves `apps/site/dist` through `Caddyfile.site`; the editor PWA retains the root Dockerfile and Caddy configuration.
- [lesson] The site content build needs `packages/core` in the image because `packages/content/tsconfig.json` extends `packages/core/tsconfig.json`, even though the site has no runtime dependency on `@giclang/core`.
- [decision] The site Caddy configuration uses ordinary static file routing rather than the editor PWA's application-shell fallback, so unknown website paths return 404.
- [verification] A no-cache image build passed. The running image served `/`, `/downloads/`, and its generated CSS asset, and returned 404 for an unknown route.
- [lesson] The site-build test must compare generated HTML with the current compiled About content instead of pinning mutable prose.
- [risk] Repository-wide site lint and formatting failures remain tracked by git-bug `fff2a5f`; the site build, focused build test, and site typecheck pass.
