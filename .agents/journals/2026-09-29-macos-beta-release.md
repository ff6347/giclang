<!-- ABOUTME: Records the Apple Silicon beta preparation and its verification boundary. -->
<!-- ABOUTME: Keeps package-version decisions and unsigned CI evidence available across sessions. -->

# Apple Silicon beta release preparation

- [decision] `v0.9.0-beta.1` is a Mac Apple Silicon prerelease, not the full v0.9 workshop release; site and styles packages keep their independent versions. Do not publish npm packages, a Git tag, or a GitHub release while preparing the branch.
- [technique] The Tauri version determines the DMG filename, hash manifest, and CI artifact name. The root, core, CLI, content, editor, desktop, Rust crate, and Tauri package versions agree; the frozen pnpm install and locked Cargo metadata pass.
- [lesson] Tauri writes a SemVer prerelease literally into both macOS `CFBundleShortVersionString` and `CFBundleVersion`, but Apple requires numeric version strings. `Info.plist` supplies the numeric short version `0.9.0`; `bundle.macOS.bundleVersion` supplies the numeric build version `0.9.0`. CI checks both against their respective sources. Increment the build version for subsequent distributed builds.
- [technique] PR [#82](https://github.com/ff6347/giclang/pull/82) passed the unsigned Apple Silicon package probe. Its downloaded `GiC_0.9.0-beta.1_aarch64.dmg` matches the SHA-256 manifest, verifies as a disk image, and contains an arm64 app with both Apple version fields set to `0.9.0`. Local core, CLI, browser, site, desktop, lint, format, and Firefox gates passed.
- [blocked] The signed/notarized beta job is main-only; Apple acceptance of the beta candidate is unverified until #82 is explicitly landed and manually dispatched. Draft site-link PR [#83](https://github.com/ff6347/giclang/pull/83) must not land until the GitHub prerelease exists, or `/downloads` will link to a missing release.
