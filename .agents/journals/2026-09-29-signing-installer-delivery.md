<!-- ABOUTME: Records the signing and installer spike checkpoint for git-bug issue 50cd09c. -->
<!-- ABOUTME: Identifies verified platform evidence, CI artifacts, and unresolved release gates. -->

# Signing and installer spike checkpoint

- [decision] PR [#78](https://github.com/ff6347/giclang/pull/78) provides unsigned Windows x64 NSIS **test** installers, not release packages. Only the trusted spike branch or an authorized manual dispatch can create these artifacts.
- [technique] A Windows runner can generate `icons/icon.ico` from the committed GIC PNG before a native MSVC Tauri build. Two bundle versions can be produced sequentially with a Tauri `--config` overlay; upload the first before rebuilding because Tauri clears its bundle output.
- [technique] Windows run [36599986183](https://github.com/ff6347/giclang/actions/runs/36599986183) produced both installers and a SHA-256 manifest. Downloaded hashes matched the CI manifest. See [the spike evidence](../../spikes/signing-installer-delivery/EVIDENCE.md) for results and pending platform checks.
- [risk] A Developer ID signature on a hardened-runtime DMG and app passes `codesign`, but Gatekeeper rejects this unnotarized local build. No Apple notarization credentials or GitHub Actions secrets are configured; a local launch is not proof of downloadable-app acceptance.
- [blocked] Fabian is performing Windows 10 installer and warning/policy checks manually. The final Intel Mac support decision and Windows signing provider remain open.
- [blocked] SSH to Linux Mint host `x220` returned `No route to host`; no commands changed that machine. A reachable private address or restored LAN/VPN route is needed before a native Linux package attempt.
- [lesson] A local lifecycle test with the same macOS bundle identifier can access the user's credentials and workspace. Temporarily isolate configuration and use a disposable workspace, then restore the user's original app and private configuration.
