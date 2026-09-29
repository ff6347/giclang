<!-- ABOUTME: Records package, signing, and lifecycle evidence for the v0.9 installer spike. -->
<!-- ABOUTME: Distinguishes verified platform behavior from release decisions and missing credentials. -->

# Signing and installer delivery evidence

## Status

The macOS arm64 DMG can be signed with the locally installed Developer ID Application identity. Its embedded app passes strict signature verification, but Gatekeeper rejects it as `Unnotarized Developer ID`. A local install, launch, replacement, and uninstall passed without altering the existing private GiC configuration. This does **not** establish that a downloaded workshop installer is ready.

The Windows 0.1.0 and 0.1.1 installer builds passed in CI. On Windows 10, the unsigned 0.1.1 installer triggered a SmartScreen unknown-publisher warning, then completed setup and launched GiC with a visible sketch preview. Codex login and OpenCode API-key connection each reportedly crashed the app; their causes and the replacement/uninstall checks remain unverified. An x64 Linux `.deb` also built in CI, but Mint installation has not been checked. Linux remains best-effort. No signed release workflow or in-app updater exists.

## Proposed package matrix

| Platform | Candidate artifact | Architecture | Build runner | Status |
| --- | --- | --- | --- | --- |
| macOS | Signed and notarized DMG containing `GiC.app` | Apple Silicon; Intel pending approval | Native macOS runner per architecture | arm64 signed locally; notarization unavailable |
| Windows 10 | Signed NSIS setup executable | x64 | Native Windows runner with MSVC and Windows SDK | Unsigned 0.1.0 and 0.1.1 CI builds passed; 0.1.1 installed and launched, but provider crashes and lifecycle checks remain |
| Linux Mint | Unsigned `.deb` test package | x64; machine architecture pending confirmation | `ubuntu-24.04` runner | CI build passed; Mint install/launch pending and not a v0.9 release gate |

NSIS is the first Windows installer to test for student installation. MSI is an alternative if deployment policy requires it; it also requires a Windows host. Tauri's [Windows installer guide](https://v2.tauri.app/distribute/windows-installer/) discourages cross-compilation except as a last resort. The default WebView2 bootstrapper may need network access on a clean Windows 10 installation; an offline installer adds about 127 MB and should be selected only if clean-machine testing establishes a need. The static editor must work offline after installation.

The [roadmap](../../.agents/plans/vertical-slice-roadmap.md) keeps Linux best-effort and excludes an in-app updater before 1.0. [Release issue #34](https://github.com/ff6347/giclang/issues/34) owns full product and data-preservation smoke checks after this package spike.

## Mac evidence

| Check | Result |
| --- | --- |
| Host and tools | macOS on arm64; Xcode provides `notarytool` and `stapler`. The `aarch64-apple-darwin` Rust target is installed; `x86_64-apple-darwin` is not. |
| Local signing authority | `security find-identity -v -p codesigning` lists a valid Developer ID Application identity for team `WB5CKL86MX`. It is not a CI credential. |
| Build | `pnpm --filter @giclang/desktop exec tauri build --bundles dmg` with `APPLE_SIGNING_IDENTITY` produced `GiC_0.1.0_aarch64.dmg`. A second build with `--config '{"version":"0.1.1"}'` produced a replacement DMG. Both were signed with Developer ID. |
| CI package probe | [Run 36610797471](https://github.com/ff6347/giclang/actions/runs/36610797471) passed desktop tests and produced an Apple Silicon DMG on `macos-15`. The downloaded DMG's SHA-256, `b1e2bc3946df3d56f05792ace7361d0c0e323b2da53a6b111f57536e44bc7b9b`, matched its CI manifest; `hdiutil verify` passed. The embedded executable is arm64, and its signature is ad hoc with no team ID. This is an unsigned packaging probe, not a release candidate. |
| Signature verification | `codesign --verify` passed for both DMGs. `codesign --verify --deep --strict` passed for each embedded app. |
| Notarization | Tauri logged `skipping app notarization` because neither an Apple ID credential set nor an App Store Connect API key set was supplied. `spctl --assess --type execute --verbose=2` rejected the app with `source=Unnotarized Developer ID`. No warning was bypassed for distribution. |
| Functional lifecycle | Copied 0.1.0 from its mounted DMG into `/Applications`, verified its version and signature, and observed its process remain running after launch. Quit it; replaced the app with 0.1.1 from its mounted DMG; verified version, signature, and process launch. Removed the test app and verified its absence. This was a local, unquarantined launch, not a downloaded-app Gatekeeper pass or a visible-UI walkthrough. |
| User-data isolation | Temporarily moved the existing private `~/.config/gestalten-in-code` directory, including its `auth.json`, aside without reading or copying its contents into the repository. Used a temporary workspace under the ignored Tauri `target/` directory. Restored the original installed app and private configuration after the uninstall check. Existing sketches were not removed. |

The replacement changed only the Tauri bundle version via a command-line configuration overlay. Production releases must also synchronize the versions in `apps/desktop/src-tauri/Cargo.toml` and `apps/desktop/package.json` with `tauri.conf.json`.

## Signing and CI requirements

The repository has no configured GitHub Actions secrets. The [macOS installer workflow](../../.github/workflows/macos-installer.yml) builds an unsigned Apple Silicon probe on this repository's spike-branch PR. Its signed job requires a manual dispatch from `main` and the `macos-release` GitHub environment; it has not been run. It imports one Developer ID Application identity into a temporary keychain, signs the DMG, notarizes it through an App Store Connect team API key, staples and verifies the DMG, checks the app's team and Gatekeeper assessments of both the DMG and app, and uploads the candidate only after these checks pass. It does not publish a GitHub Release.

Fabian approved the App Store Connect API-key route. Before the signed job can run, create the `macos-release` environment in GitHub Actions with deployment restricted to `main` and human approval, then supply these **environment secrets** privately:

| Secret | Value to provision |
| --- | --- |
| `MACOS_CERTIFICATE_P12` | Single-line base64 encoding of the exported Developer ID Application `.p12` containing its private key |
| `MACOS_CERTIFICATE_PASSWORD` | Password chosen when exporting that `.p12` |
| `MACOS_API_KEY_P8` | Single-line base64 encoding of the App Store Connect team API-key `.p8` |
| `MACOS_API_KEY_ID` | Key ID displayed for that team API key |
| `MACOS_API_ISSUER` | Issuer ID displayed for that team API key |

Export the existing Developer ID Application identity from Keychain Access **My Certificates** with a fresh export password. Create the team API key under App Store Connect **Users and Access → Integrations** with Developer access and download the `.p8` once. Encode each file locally with `openssl base64 -A -in <file>` and enter its output only into the corresponding GitHub environment secret; do not paste it into an issue, chat, runner log, or repository file. After this workflow is reviewed and explicitly landed on `main`, manually dispatch it there. A successful CI run produces a **release candidate**, not approval to publish: download the DMG, check its SHA-256, and perform Gatekeeper and visible install/launch checks on a Mac before release.

The [Windows installer spike workflow](../../.github/workflows/installer-spike.yml) runs without secrets, uploads **unsigned test artifacts**, and must not be used as a signed release. Pull-request builds are restricted to this repository's spike branch; after that branch is removed, authorized manual dispatch is the only way to run the workflow. The workflow generates the Windows icon from the committed PNG and records SHA-256 hashes for both installers on the same runner. The [trusted-branch Windows run](https://github.com/ff6347/giclang/actions/runs/36599986183) passed on `windows-latest` with three artifacts: both versioned NSIS installers and their SHA-256 manifest. I downloaded the artifacts, checked both executable hashes against that manifest, and identified both as Nullsoft installers:

| Artifact | SHA-256 |
| --- | --- |
| `GiC_0.1.0_x64-setup.exe` | `d9994a171edf790161ede00a5b8ed5810df225f9e9b3ad460af40cefd6276ee3` |
| `GiC_0.1.1_x64-setup.exe` | `0baae2840e7b28f8527265e41d03c7c755fb7232e46f93716771f973d74a0b7e` |

The CI build and hash checks do not verify Windows launch or signatures; the manual launch observation below is separate evidence. The replacement build overrides only the Tauri bundle version; a real release must synchronize all three desktop version sources.

## Windows 10 manual observations

Fabian's photographs show Windows Defender SmartScreen blocking first launch of the unsigned `GiC_0.1.1_x64-setup.exe` with an unknown publisher. After he chose to run it, the NSIS setup completed, and GiC opened with a sketch and its preview visible. This is evidence of installation and static authoring launch on that machine, **not** of a signed installer passing Windows policy without intervention.

Fabian also reports that Codex sign-in failed and crashed the app, and that connecting an OpenCode API key crashed it. The photographs do not show either crash or its diagnostic output, so the failure mode and root cause are not established. Optional tutor failures must not disable the editor. The record does not yet establish that 0.1.0 was installed first, that 0.1.1 replaced it while preserving user data, or that the app was uninstalled.

The [Windows native-test run](https://github.com/ff6347/giclang/actions/runs/36609042130) exits with `STATUS_ACCESS_VIOLATION (0xc0000005)` while running `codex_auth::tests::signing_out_invalidates_the_active_login_and_removes_credentials`, including when tests run serially. This confirms a separate native Windows crash involving the credential lifecycle; it does not prove that the same code caused either manual UI crash. The Windows installer job stops before packaging when this test fails. Earlier successful installer artifacts remain available from the [packaging run](https://github.com/ff6347/giclang/actions/runs/36599986183); the failing gate must be resolved before another release candidate.

The [Linux CI job](https://github.com/ff6347/giclang/actions/runs/36606040897) built `GiC_0.1.0_amd64.deb`. Its Debian control metadata names the package `gi-c` and declares dependencies on `libwebkit2gtk-4.1-0` and `libgtk-3-0`. The downloaded package's SHA-256, `53689460371370ce3761d8dac210163720e935c83f878c2611cb7845205517f9`, matched the CI manifest. Neither dependency availability nor installation on Linux Mint has been verified. SSH to `x220` and `x220.local` failed before authentication; a Magic Wormhole transfer is proposed for the manual Mint check.

- **macOS release:** Use the native Apple Silicon runner and approved App Store Connect team API-key route. The protected `macos-release` environment requires certificate export and provisioning by Fabian. The job verifies `codesign`, notarization, stapling, and Gatekeeper before retaining a candidate; downloaded-artifact installation remains a separate human check. See [Tauri's macOS signing guide](https://v2.tauri.app/distribute/sign/macos/).
- **Windows release:** Run a native Windows job with MSVC, Windows SDK, Rust's `x86_64-pc-windows-msvc` target, and NSIS. A code-signing identity and provider have not been identified or approved; no Windows certificate or signing secret has been configured in this repository. Protect the signing key, timestamp the installer, and verify its signature before treating it as distributable. Signing does not guarantee the absence of SmartScreen warnings for a certificate without reputation. See [Tauri's Windows signing guide](https://v2.tauri.app/distribute/sign/windows/).
- **Linux best-effort:** Try a native Linux package on Linux Mint or an Ubuntu runner, record system-library requirements and install/launch behavior, but do not block the macOS and Windows release on it.

No certificate, token, password, or private key belongs in Git, an Actions artifact, an issue comment, or this evidence file. CI artifact publication as a _release_ must fail closed until its signing and platform checks pass.

## Checks still needed

1. Confirm Intel Mac support and the final Windows installer format and WebView2 installation mode.
2. Provision the `macos-release` environment secrets, run the signed job after its workflow is explicitly landed, then record notarization, stapling, Gatekeeper, and install results for the downloaded DMG.
3. Compare the CI Windows x64 installers against their SHA-256 manifest on the Windows 10 machine; verify 0.1.0 installation, higher-version replacement with user-data preservation, and uninstall. Preserve the observed unsigned SmartScreen warning. Collect redacted crash diagnostics for Codex login and OpenCode key connection without sharing credentials.
4. Choose and provision a Windows signing provider before a release build; repeat signature and installation checks with the signed artifact.
5. Confirm the Linux Mint machine is x64 and has Magic Wormhole, transfer the verified `.deb`, and record install/launch/uninstall behavior as a non-blocking check.
