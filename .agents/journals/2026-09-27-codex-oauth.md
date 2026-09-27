<!-- ABOUTME: Records the Codex subscription tutor integration and landing evidence. -->
<!-- ABOUTME: Preserves provider boundaries, model policy, verification, and remaining gates. -->

# Codex OAuth tutor

## Decisions and implementation

- [decision] The packaged desktop tutor uses attendee-owned Codex subscription OAuth, not an OpenAI API key; the tutor-less PWA has no Codex sign-in link.
- [decision] GIC owns device authorization, cancellation, credential persistence, refresh, account switching, and redacted webview events. Rig 0.42 receives an in-memory `ChatGPTAuth::AccessToken` only when streaming a tutor request; Rig's OAuth entry point starts during a completion and cannot drive Settings sign-in.
- [technique] One native `CodexSession` serializes refresh. A rotated token replaces `auth.json` only while its prior refresh token and account still match; a late response after sign-out or an account switch cannot restore stale credentials. Authorization attempts carry IDs so superseded events cannot update Settings.
- [decision] Codex's beginner and advanced model IDs come from a release-checked, Codex-specific bundled catalog. Rig does not supply ChatGPT model discovery; Pi's generated catalog and anonymous overlay are references, not GIC dependencies. Listing a model does not prove account access; the provider checks on Send.
- [decision] Zen and OpenRouter models with a supported native route may be explicitly enabled even without GIC reference-tool verification. The table and selected Agent model show `Not verified`; unknown routes remain blocked, OpenRouter rechecks the current account catalog, and paid models are never enabled automatically.
- [technique] A fixed native Tauri opener command opens the OpenAI device-verification URL in the system browser without giving the webview generic URL-opening permission. The regular packaged release keeps DevTools disabled; development and debug builds expose the WebView inspector.

## Evidence and remaining gates

- [evidence] Local tests covered device-code exchange and cancellation, refresh rotation and restart persistence with synthetic credentials, request correlation, reference-tool streaming through Rig, redacted provider errors, and unverified-model selection. The landed candidate passed 416 core tests, 113 native tests (one separate live-key test ignored), 84 Firefox E2E tests, typechecks, lint, formatting, Clippy, and the macOS `.app`/`.dmg` build.
- [technique] The branch tip was a docs-only `[skip ci]` commit, so the fast-forward push to `origin/main` did not start the Pages push workflow. `workflow_dispatch` ran the existing workflow for the exact landed SHA `af8bb01` and succeeded.
- [risk] Git-bug `953796c` remains open: a packaged real-subscription refresh/restart/stream/sign-out smoke is not fully evidenced. Windows package and owner-only ACL validation remain open in the desktop and credential issues; Linux is best-effort.
- [risk] The git-bug mutation helper exported the landing comment, but its bridge pull reported `issue edit: no matching operation found`; local issue state remains open.
