<!-- ABOUTME: Records the Windows CI installer workflow and its validation. -->
<!-- ABOUTME: Separates downloadable test artifacts from native tests and release acceptance. -->

# Windows installer CI

- [scope] Fabian requested a Windows installer built entirely in GitHub Actions and downloaded for manual testing. The available Windows 10 machine has an Intel i5, 16 GB RAM, and limited disk space; no developer toolchain should be required on it. Its installed Windows architecture remains unconfirmed.
- [decision] `.github/workflows/windows-installer.yml` defines independent native-test and unsigned-package jobs on `windows-2022`. A failing native test keeps the workflow red without preventing an otherwise successful packaging job from retaining a test installer. This does not grant release approval.
- [technique] Both jobs use the repository's pinned Node/pnpm tools, the Windows MSVC Rust target, frozen dependencies, and Tauri-generated Windows icons. Packaging requests only NSIS, derives artifact paths from the product version, checks the executable header, and writes a SHA-256 manifest before upload.
- [risk] Existing unmerged PR #78 contains earlier Windows installer evidence. Run `36615019963` crashed with `STATUS_ACCESS_VIOLATION` during `codex_auth::tests::signing_out_invalidates_the_active_login_and_removes_credentials`. Git-bug `50cd09c` also records manual provider-connection crashes; their connection to the native test failure is unproven. Credential code is outside this workflow-only change.
- [verification] `actionlint` 1.7.12 passes for the Windows workflow. Its focused oxfmt check, root oxlint, and whitespace check pass. No declarative-content tests were added.
- [risk] Root `pnpm fmt:check` fails on 261 unchanged files, reproducing the formatting blocker already recorded in the additional-examples journal. Unrelated files were not reformatted.
- [blocked] The workflow has not run on Windows. Committing, pushing `feat/windows-build`, and opening a pull request require explicit operator permission before CI can produce the downloadable installer. No merge or release publication is requested.

## Publication and Windows execution

- [decision] Fabian explicitly authorized committing, pushing, and creating a draft PR to trigger CI. Workflow commit `cbbf6cf` was published on `origin/feat/windows-build`; draft PR [#101](https://github.com/ff6347/giclang/pull/101) was opened without merging or publishing a release.
- [verification] Windows run [37667057326](https://github.com/ff6347/giclang/actions/runs/37667057326) completed packaging in 9 minutes 15 seconds and uploaded the unsigned `GiC_0.9.0-beta.4_x64-setup.exe` with its SHA-256 manifest. The downloaded installer matches the declared hash `3fc61c0bb5ceaa9c82cd819d825e250ac616fd402ef4991b69557c20b5628479`.
- [risk] The independent native-test job reproduced `0xc0000005` / `STATUS_ACCESS_VIOLATION` during `codex_auth::tests::signing_out_invalidates_the_active_login_and_removes_credentials`. The overall Windows workflow remains red; no test was suppressed and no credential implementation changed. Existing credential issue `a722d8f` retains the current reproduction.
- [lesson] PowerShell `Set-Content` appends Windows CRLF by default, which macOS `shasum -c` interprets as part of the manifest filename. The hash itself matched when parsed with line-ending normalization. Commit `fca545c` writes an explicit LF with `-NoNewline` so the manifest can be checked unchanged across platforms.
- [verification] Actionlint and focused formatting pass after the checksum fix. An independent read-only review found no concrete workflow correctness defects. Linux installer run `37667057210` also passed.
- [risk] The git-bug mutation helper synchronized native refs and exported progress comments, then reproduced the existing bridge import error tracked by `3aaca1f`. Installer issue `50cd09c` and credential issue `a722d8f` remain open.

## Final artifact verification

- [verification] Corrected-source Windows run [37668505503](https://github.com/ff6347/giclang/actions/runs/37668505503) built and uploaded `gic-windows-x64-0.9.0-beta.4-unsigned-probe`, artifact `11504131660`, from published workflow commit `fca545c2becf7a82aa92981c96a5ea865f54f73e`. The downloaded installer's unchanged manifest passes `shasum -a 256 -c`; its SHA-256 is `02881f5fe5bde296d27c2445c9b3750557e5230e6fd3f4943ed6cfc2ec397dc6`.
- [verification] The installer is a Windows NSIS self-extracting executable. Its installer stub is 32-bit, as expected for NSIS; the Tauri build explicitly targets the x64 MSVC application. Actual Windows 10 installation, launch, and file/export smoke remain manual checks.
- [risk] The corrected run's native-test job reproduces the same credential sign-out access violation. Packaging passes independently, while the complete Windows workflow fails. Avoid treating tutor sign-in or credential persistence as validated by the artifact.
- [verification] The bounded CI watch and one status request timed out; subsequent direct API queries confirmed that packaging had completed successfully. The artifact was downloaded and verified only after that confirmation.
- [decision] PR #101 remains draft. This task authorizes no main merge, signed release, or Windows credential-code change. Temporary downloaded artifacts and PR-body files are removed after verification.
