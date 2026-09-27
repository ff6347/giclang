<!-- ABOUTME: Records the tutor-less offline PWA implementation and lifecycle evidence. -->
<!-- ABOUTME: Captures precaching, controlled updates, browser coverage, and verification. -->

# Slice 11 Tutor-less Offline PWA

## Implementation

- [decision] The production Vite build generates a Workbox service worker and web application manifest. The complete built authoring environment is precached, including Monaco, the GIC worker, bundled content, fonts, icons, and standalone-export assets.
- [decision] The precache accepts individual assets up to 6 MiB because the locally packaged Monaco application chunk exceeds Workbox's default 2 MiB limit.
- [decision] Downloaded application updates remain in the service worker's waiting state. The application announces the update, lets the student continue working without activation, and sends `SKIP_WAITING` only after `Update and reload`.
- [decision] Automated lifecycle coverage runs Chrome and Firefox on macOS and Windows and WebKit on macOS. Safari is unavailable on Windows; Playwright WebKit supplies the automated Safari-engine seam on macOS.
- [technique] Update acceptance builds two production service-worker revisions and replaces only the served worker between checks. A controllable static origin refuses application requests during offline acceptance, proving that a restarted page is supplied by the service worker in Chromium, Firefox, and WebKit.
- [technique] Monaco's native input path differs by browser. Firefox acceptance enters multiline source as keyboard events, while Chromium and WebKit accept one multiline text insertion; the shared helper selects and clears the document before either path.

## Verification

- `pnpm test` — 416 core tests passed.
- `pnpm test:compact` — all discovered core and browser-local tests passed.
- `pnpm typecheck`
- `pnpm typecheck:browser`
- `pnpm lint`
- `pnpm fmt:check`
- `pnpm build:browser`
- `pnpm test:e2e -- --retries=0` — all 76 Firefox and direct-file acceptance tests passed.
- `pnpm test:pwa --retries=0` — offline restart and controlled-update acceptance passed in Chrome, Firefox, and WebKit.
- A persistent Chrome profile reported no installability errors through `Page.getInstallabilityErrors`.
- A `/gic-lang/` base-path build emitted the scoped manifest and registered `/gic-lang/sw.js` under `/gic-lang/`.
