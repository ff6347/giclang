<!-- ABOUTME: Records package, signing, and lifecycle evidence for the v0.9 installer spike. -->
<!-- ABOUTME: Distinguishes verified platform behavior from release decisions and missing credentials. -->

# Signing and installer delivery evidence

## Status

The macOS arm64 DMG can be signed with the locally installed Developer ID Application identity. Its embedded app passes strict signature verification, but Gatekeeper rejects it as `Unnotarized Developer ID`. A local install, launch, replacement, and uninstall passed without altering the existing private GiC configuration. This does **not** establish that a downloaded workshop installer is ready.

The Windows 0.1.0 and 0.1.1 installer builds passed in CI; manual Windows 10 smoke checks remain. An x64 Linux `.deb` also built in CI, but Mint installation has not been checked. Linux remains best-effort. No signed release workflow or in-app updater exists.

## Proposed package matrix

| Platform | Candidate artifact | Architecture | Build runner | Status |
| --- | --- | --- | --- | --- |
| macOS | Signed and notarized DMG containing `GiC.app` | Apple Silicon; Intel pending approval | Native macOS runner per architecture | arm64 signed locally; notarization unavailable |
| Windows 10 | Signed NSIS setup executable | x64 | Native Windows runner with MSVC and Windows SDK | Unsigned 0.1.0 and 0.1.1 CI builds passed; manual smoke pending |
| Linux Mint | Unsigned `.deb` test package | x64; machine architecture pending confirmation | `ubuntu-24.04` runner | CI build passed; Mint install/launch pending and not a v0.9 release gate |

NSIS is the first Windows installer to test for student installation. MSI is an alternative if deployment policy requires it; it also requires a Windows host. Tauri's [Windows installer guide](https://v2.tauri.app/distribute/windows-installer/) discourages cross-compilation except as a last resort. The default WebView2 bootstrapper may need network access on a clean Windows 10 installation; an offline installer adds about 127 MB and should be selected only if clean-machine testing establishes a need. The static editor must work offline after installation.

The [roadmap](../../.agents/plans/vertical-slice-roadmap.md) keeps Linux best-effort and excludes an in-app updater before 1.0. [Release issue #34](https://github.com/ff6347/giclang/issues/34) owns full product and data-preservation smoke checks after this package spike.

## Mac evidence

| Check | Result |
| --- | --- |
| Host and tools | macOS on arm64; Xcode provides `notarytool` and `stapler`. The `aarch64-apple-darwin` Rust target is installed; `x86_64-apple-darwin` is not. |
| Local signing authority | `security find-identity -v -p codesigning` lists a valid Developer ID Application identity for team `WB5CKL86MX`. It is not a CI credential. |
| Build | `pnpm --filter @giclang/desktop exec tauri build --bundles dmg` with `APPLE_SIGNING_IDENTITY` produced `GiC_0.1.0_aarch64.dmg`. A second build with `--config '{"version":"0.1.1"}'` produced a replacement DMG. Both were signed with Developer ID. |
| Signature verification | `codesign --verify` passed for both DMGs. `codesign --verify --deep --strict` passed for each embedded app. |
| Notarization | Tauri logged `skipping app notarization` because neither an Apple ID credential set nor an App Store Connect API key set was supplied. `spctl --assess --type execute --verbose=2` rejected the app with `source=Unnotarized Developer ID`. No warning was bypassed for distribution. |
| Functional lifecycle | Copied 0.1.0 from its mounted DMG into `/Applications`, verified its version and signature, and observed its process remain running after launch. Quit it; replaced the app with 0.1.1 from its mounted DMG; verified version, signature, and process launch. Removed the test app and verified its absence. This was a local, unquarantined launch, not a downloaded-app Gatekeeper pass or a visible-UI walkthrough. |
| User-data isolation | Temporarily moved the existing private `~/.config/gestalten-in-code` directory, including its `auth.json`, aside without reading or copying its contents into the repository. Used a temporary workspace under the ignored Tauri `target/` directory. Restored the original installed app and private configuration after the uninstall check. Existing sketches were not removed. |

The replacement changed only the Tauri bundle version via a command-line configuration overlay. Production releases must also synchronize the versions in `apps/desktop/src-tauri/Cargo.toml` and `apps/desktop/package.json` with `tauri.conf.json`.

## Signing and CI requirements

The repository has no configured GitHub Actions secrets and no release workflow. The [Windows installer spike workflow](../../.github/workflows/installer-spike.yml) runs without secrets, uploads **unsigned test artifacts**, and must not be used as a signed release. Pull-request builds are restricted to this repository's spike branch; after that branch is removed, authorized manual dispatch is the only way to run the workflow. The workflow generates the Windows icon from the committed PNG and records SHA-256 hashes for both installers on the same runner. The [trusted-branch Windows run](https://github.com/ff6347/giclang/actions/runs/36599986183) passed on `windows-latest` with three artifacts: both versioned NSIS installers and their SHA-256 manifest. I downloaded the artifacts, checked both executable hashes against that manifest, and identified both as Nullsoft installers:

| Artifact | SHA-256 |
| --- | --- |
| `GiC_0.1.0_x64-setup.exe` | `d9994a171edf790161ede00a5b8ed5810df225f9e9b3ad460af40cefd6276ee3` |
| `GiC_0.1.1_x64-setup.exe` | `0baae2840e7b28f8527265e41d03c7c755fb7232e46f93716771f973d74a0b7e` |

This is packaging evidence, not a Windows launch or signature check. The replacement build overrides only the Tauri bundle version; a real release must synchronize all three desktop version sources.

The [Linux CI job](https://github.com/ff6347/giclang/actions/runs/36606040897) built `GiC_0.1.0_amd64.deb`. Its Debian control metadata names the package `gi-c` and declares dependencies on `libwebkit2gtk-4.1-0` and `libgtk-3-0`. The downloaded package's SHA-256, `53689460371370ce3761d8dac210163720e935c83f878c2611cb7845205517f9`, matched the CI manifest. Neither dependency availability nor installation on Linux Mint has been verified. SSH to `x220` and `x220.local` failed before authentication; a Magic Wormhole transfer is proposed for the manual Mint check.

- **macOS release:** Run a native macOS job with a protected Developer ID Application signing certificate and its import password. Apple notarization additionally needs either an App Store Connect API key, issuer, and private-key file supplied to the runner, or an Apple ID, app-specific password, and team ID. Submit, staple, and verify the distributed artifact; require `codesign` and Gatekeeper checks to pass. Human approval is needed to export and provision the certificate and choose the notarization credential route. See [Tauri's macOS signing guide](https://v2.tauri.app/distribute/sign/macos/).
- **Windows release:** Run a native Windows job with MSVC, Windows SDK, Rust's `x86_64-pc-windows-msvc` target, and NSIS. A code-signing identity and provider have not been identified or approved; no Windows certificate or signing secret has been configured in this repository. Protect the signing key, timestamp the installer, and verify its signature before treating it as distributable. Signing does not guarantee the absence of SmartScreen warnings for a certificate without reputation. See [Tauri's Windows signing guide](https://v2.tauri.app/distribute/sign/windows/).
- **Linux best-effort:** Try a native Linux package on Linux Mint or an Ubuntu runner, record system-library requirements and install/launch behavior, but do not block the macOS and Windows release on it.

No certificate, token, password, or private key belongs in Git, an Actions artifact, an issue comment, or this evidence file. CI artifact publication as a _release_ must fail closed until its signing and platform checks pass.

## Checks still needed

1. Confirm Intel Mac support and the final Windows installer format and WebView2 installation mode.
2. Provision Apple notarization credentials through an approved secret path, then record notarization, stapling, and Gatekeeper results on a downloaded DMG.
3. Download the CI Windows x64 artifacts and manifest on the Windows 10 machine, compare their hashes, record any SmartScreen or policy warning, then test install, launch, higher-version replacement, and uninstall. Do not silently bypass policy failures.
4. Choose and provision a Windows signing provider before a release build; repeat signature and installation checks with the signed artifact.
5. Confirm the Linux Mint machine is x64 and has Magic Wormhole, transfer the verified `.deb`, and record install/launch/uninstall behavior as a non-blocking check.
