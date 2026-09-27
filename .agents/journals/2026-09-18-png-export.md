<!-- ABOUTME: Records the current-preview PNG export implementation and verification. -->
<!-- ABOUTME: Preserves the browser export boundary and UI attribution decision. -->

# PNG export

- [implementation] The Preview panel exports the current Canvas through `HTMLCanvasElement.toBlob()` only after the exact current source has rendered. Source edits and expected preview failures immediately invalidate export.
- [decision] Application icons use free MIT-licensed Pixel Art Icons React components at their 24 px native grid size. The About page credits Pixel Art Icons alongside the browser UI dependencies.
- [verification] Playwright downloads the PNG in Firefox, checks its native dimensions and representative decoded pixels against Canvas, and verifies the lower-right Preview placement. The full core, browser, lint, format, build, and end-to-end suites passed.
- [decision] The Code icon reserves the standalone HTML export position beside PNG export and remains disabled until its worker-backed export behavior exists.
