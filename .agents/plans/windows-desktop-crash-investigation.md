<!-- ABOUTME: Plans a Windows reproduction of desktop failures during provider sign-in and model discovery. -->
<!-- ABOUTME: Specifies safe evidence collection and criteria for narrowing the failing layer. -->

# Windows desktop crash investigation

## Goal

Determine why the Windows desktop app stopped working when Codex device sign-in completed and when OpenRouter loaded its model catalog. Establish whether the native process exited, the webview failed, or a request returned an ordinary error before changing code. A response arriving near the failure is a hypothesis, not a proven cause.

## Prepare the Windows machine

1. Record the Windows version, architecture, installed GiC version, and approximate time of each earlier failure. Preserve the installed build for comparison; do not remove app data or sign out merely to prepare this test.
2. Clone the repository, then in PowerShell:

   ```powershell
   git fetch origin
   git switch --track origin/docs/windows-crash-test-plan
   git rev-parse --short HEAD
   ```

3. Install the Node and pnpm versions declared in `mise.toml` (`mise install` if mise is available), plus the Rust/MSVC and WebView2 prerequisites for Tauri on Windows. From the repository root run `pnpm install --frozen-lockfile`. If setup fails, capture the exact command and error rather than changing dependencies.
4. Open **Event Viewer → Windows Logs → Application** before reproducing, so events can be matched to the failure time. The app does not currently configure a persistent log file. `%USERPROFILE%\.config\gestalten-in-code\auth.json` contains credentials, not logs: do not copy, attach, or commit it.

## Reproduce one transition at a time

1. First run the already installed build with provider settings unopened and note whether ordinary sketch editing works. Reproduce Codex completion and OpenRouter model loading separately, noting the last visible action and whether the entire window closes, becomes blank, freezes, or stays interactive with an error. Note whether reopening GiC works.
2. From the cloned repository root, run `pnpm dev:desktop` in a PowerShell terminal and leave it open. Confirm normal editing works before testing providers. Open WebView2 DevTools with `Ctrl+Shift+I` if available; watch **Console** while reproducing each flow. Keep the terminal output. DevTools **Network** does not necessarily show these requests: Codex sign-in and OpenRouter model discovery execute in Rust, not in the webview.
3. For Codex, start device sign-in, authorize through the browser, then watch the transition from the verification prompt to completion and model availability. Record whether the failure occurs before or after the completion state appears. Do not share the device code or account tokens.
4. For OpenRouter, use the existing account connection and request the model list in Settings. Record whether the failure occurs during the account check, while loading the list, or after models appear. Do not paste the API key, raw request headers, or account response.
5. Repeat a failing flow once in the development build to establish whether it is reproducible, without cycling accounts or erasing settings. If only the installed build fails, record the two versions/commit and compare with a Windows package built via `pnpm build:desktop`; keep packaged and development results distinct.

## Capture evidence and classify it

- **Native process exited:** Check Event Viewer Application entries at that time for **Application Error** or **Windows Error Reporting**. Capture the event time, faulting application/module, exception code, and fault offset. Also capture the last terminal lines and whether the dev command exited. A native crash can leave no JavaScript console error.
- **Window remains but UI fails:** Capture the last WebView2 Console error and any visible UI error. Distinguish a blank webview from a frozen but rendered window. If the request returns a displayed error and the app remains usable, record that as a handled request failure, not a crash.
- **No useful evidence yet:** Report which of Event Viewer, terminal, and DevTools was available, and which remained empty. Do not infer that a successful HTTP response caused the failure merely from timing.

Use this short report for **each** reproduction:

```text
Build/version and commit:
Windows version and architecture:
Flow and last visible action:
Time (including time zone):
Window state and whether the process exited:
Visible error:
Terminal/DevTools error (redacted):
Event Viewer application/module/exception code (if present):
Reproducible on installed build / dev build / packaged local build:
```

Before sharing logs, redact credentials, device codes, authorization headers, private prompts, response bodies, and filesystem paths you do not want disclosed. Keep raw artifacts locally; never commit them to this branch.

## Follow-up after evidence

If a native exception or panic points at a request boundary, reproduce that exact failure mode with a failing Rust test using a local HTTP server before a fix. If the process stays alive and the webview fails, reproduce the UI transition with the existing browser test seam before changing it. If development works but the packaged build fails, investigate Windows packaging/runtime differences before modifying request parsing. The investigation is complete when a specific failing layer and reproducible trigger are documented, or the collected evidence clearly states what is still missing.
