<!-- ABOUTME: Records coordinated version preparation for the beta.2 release. -->
<!-- ABOUTME: Notes the numeric macOS bundle build version required for distribution. -->

- [decision] Prepare `0.9.0-beta.2` for the coordinated root, core, CLI, content, editor, and desktop packages; keep the styles package at its independent `1.0.0` version.
- [decision] Keep macOS `CFBundleShortVersionString` at `0.9.0` through `Info.plist` and increment `bundle.macOS.bundleVersion` to numeric `0.9.1` for the second distribution.
- [technique] Use pnpm's workspace version command without automatic Git tagging; update the Tauri crate's own version and regenerate only its lock metadata without dependency upgrades.
