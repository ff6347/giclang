<!-- ABOUTME: Records the direct-file worker spike evidence and selected isolation strategy. -->
<!-- ABOUTME: Preserves browser coverage, tool constraints, and follow-up scope for HTML export. -->

# Standalone file workers

- [decision] Standalone HTML preview runs use an inline JavaScript Blob worker. The host revokes the Blob URL after construction and terminates the active worker for source replacement and timeout.
- [verification] The single artifact passed direct-`file://` acceptance in Chromium `151.0.7922.34`, Firefox `153.0`, and WebKit `26.5`; it covered Canvas, diagnostics, runtime error, output, replacement, timeout recovery, and no network requests.
- [lesson] The agent-browser Chrome session reported `about:blank` when asked to open the direct-file artifact, so the retained cross-engine verifier uses the repository Playwright dependency rather than that CDP tool.
- [scope] The spike proves worker isolation only. Production standalone export must still embed the real GIC core and consume its `Command[]` protocol.
