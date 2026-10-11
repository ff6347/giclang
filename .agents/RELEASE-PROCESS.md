<!-- ABOUTME: Defines the operator-approved workflow for coordinated GIC desktop releases. -->
<!-- ABOUTME: Covers version preparation, CI candidates, verification, publication, and download-page delivery. -->

# How to release GIC desktop builds

Use this checklist to publish a coordinated desktop beta through **GitHub Releases in `ff6347/giclang`**. It is for Fabian and agents performing release work. npm publication, Microsoft Store submission, an in-app updater, and declaring the full v0.9 workshop release complete are outside this procedure.

## Preconditions and approval gates

- [ ] Identify the release issue, target version, included changes, and intended platforms with Fabian. Coordinated workshop release work is tracked by git-bug `830289e`; installer acceptance is tracked by `50cd09c`.
- [ ] Follow the **commit** skill for the session-start repository scan and commit conventions. Resolve existing uncommitted work with Fabian before editing. Work on a topic branch based on current `origin/main`, never directly on main.
- [ ] Use the toolchain declared in [`mise.toml`](../mise.toml), invoking project commands through `mise exec --`. Confirm GitHub CLI authentication and access to workflow dispatch, artifacts, and releases.
- [ ] Keep Windows builds in CI. A Windows test computer needs the installer and its runtime requirements, not Rust, Node, pnpm, or a compiler toolchain.
- [ ] Obtain explicit approval for version preparation, landing, candidate production, and public release publication. Approval for one phase does not authorize the next. “Merged” confirms landing; it is not publication approval.
- [ ] Use PRs and the repository's current review protections for landing. Fabian performs the GitHub merge unless he explicitly authorizes otherwise; never bypass protections, force-push, or enable automatic merging.
- [ ] Follow the **github**, **git-bug**, **project-state**, **reflect**, and **review** skills for their respective workflows rather than reproducing their instructions here. Use the git-bug mutation helper for all issue changes.

In command templates below, replace every angle-bracket value before execution. `<version>` is product SemVer without `v`; `<tag>` is `v` followed by that version; `<landed-sha>` is the full verified source commit. Do not execute templates unchanged.

## 1. Prepare and land the version

- [ ] Create a version-preparation branch/PR after Fabian approves the next release version.
- [ ] Keep these product versions synchronized:
  - [`package.json`](../package.json), [`packages/core/package.json`](../packages/core/package.json), [`packages/cli/package.json`](../packages/cli/package.json), and [`packages/content/package.json`](../packages/content/package.json).
  - [`apps/editor/package.json`](../apps/editor/package.json) and [`apps/desktop/package.json`](../apps/desktop/package.json).
  - The own-crate version in [`apps/desktop/src-tauri/Cargo.toml`](../apps/desktop/src-tauri/Cargo.toml) and its entry in [`Cargo.lock`](../apps/desktop/src-tauri/Cargo.lock).
  - `version` in [`apps/desktop/src-tauri/tauri.conf.json`](../apps/desktop/src-tauri/tauri.conf.json).
- [ ] Leave the independently versioned site/styles packages alone. Do not upgrade dependencies or change the pnpm lockfile as part of a version-only release preparation.
- [ ] Use the package manager's version operation with automatic commits/tags disabled. If its cleanliness check blocks successive inspected metadata edits, stop and resolve that deliberately; do not disable commit hooks or discard other work.
- [ ] Set `CFBundleShortVersionString` in [`Info.plist`](../apps/desktop/src-tauri/Info.plist) to the numeric base version, without a prerelease suffix. Increment numeric `bundle.macOS.bundleVersion` in Tauri configuration before each subsequent distribution. For beta.5, product SemVer was `0.9.0-beta.5`, short version `0.9.0`, and build version `0.9.4`; inspect current metadata rather than reusing that build number.
- [ ] Review the complete metadata diff and run the applicable quality gates from [`AGENTS.md`](../AGENTS.md). Verify the version fields inside the built application, not just source configuration. Do not write tests that assert declarative version-file contents.
- [ ] Keep published download links unchanged. No tag, public release, or npm publication belongs in this phase.
- [ ] Commit/push, request review, and have Fabian merge the preparation PR. Verify it is actually merged into `origin/main`; record the full landed commit.

## 2. Produce coordinated candidates in CI

After approval, dispatch all three installer workflows against `main`:

```sh
gh workflow run macos-installer.yml --repo ff6347/giclang --ref main
gh workflow run windows-installer.yml --repo ff6347/giclang --ref main
gh workflow run linux-installer.yml --repo ff6347/giclang --ref main
```

- [ ] Record each resulting run ID, URL, event, branch, `headSha`, artifact ID/name, and artifact digest. Confirm the checkout log uses the recorded source SHA too.
- [ ] Require **all three candidates to use exactly the same landed commit** and declared version. Dispatching `main` is not SHA pinning: if main advances and runs disagree, stop and coordinate fresh matching candidates. Never attach later binaries to an earlier tag or silently publish a different source revision.
- [ ] Follow the **github** skill to monitor runs and inspect logs. Use bounded waits; a monitor timeout is not proof of workflow failure. Linux packaging can take longer than 15 minutes.
- [ ] Require every relevant job to succeed. An independently uploaded Windows installer does not make failing native tests acceptable. Record intentional ignored live-provider tests and distinguish them from passed tests.

### Check each platform's workflow contract

- [ ] **macOS:** [`macos-installer.yml`](../.github/workflows/macos-installer.yml) must run `release-candidate` on main in environment `macos-release`. It signs with Developer ID, obtains Apple notarization acceptance, staples, verifies signatures/Gatekeeper/team and bundle versions, and retains the candidate. The unsigned PR probe is currently restricted to `release/v0.9.0-beta.1`; a skipped probe on another PR does not validate signing.
- [ ] Confirm the macOS environment has the configured secret names `MACOS_CERTIFICATE_P12`, `MACOS_CERTIFICATE_PASSWORD`, `MACOS_API_KEY_P8`, `MACOS_API_KEY_ID`, and `MACOS_API_ISSUER`. Never read or copy their values into documentation, issues, logs, or local files. Inspect configured protections rather than assuming there is a required environment reviewer. If Apple reports a missing agreement, stop for the Account Holder; do not bypass notarization.
- [ ] **Windows:** [`windows-installer.yml`](../.github/workflows/windows-installer.yml) must pass native credential/bridge tests and warnings-as-errors Clippy as well as the independent x64 NSIS packaging job. The installer filename must explicitly contain `unsigned`.
- [ ] **Linux:** [`linux-installer.yml`](../.github/workflows/linux-installer.yml) must pass native tests and produce both amd64 AppImage and Debian bundles. Do not claim Linux Clippy ran; it is not a step in this workflow.
- [ ] Remember that these workflows retain candidates only. Their `contents: read` permissions do not publish a GitHub Release.

## 3. Download and verify candidates

- [ ] Download the recorded run artifacts into an agent-owned temporary directory under `.agents/tmp/`. Preserve the original binary filenames and CI manifests. Actions artifacts are internal release handoff, never the public download location.
- [ ] Compare downloaded artifact ZIP hashes with GitHub's recorded artifact digests when downloading ZIPs. For every binary, verify its original manifest from the directory containing that binary:

```sh
shasum -a 256 -c "<binary-filename>.sha256"
```

- [ ] Do not regenerate manifests, rename binaries, relabel an earlier beta, or rebuild locally and substitute a different binary. Investigate any checksum/provenance mismatch before proceeding.
- [ ] Verify the expected release payload:

| Platform              | Binary filename                                              | Candidate artifact name                         |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| macOS Apple Silicon   | `GiC_<version>_aarch64.dmg`                                  | `gic-macos-arm64-<version>-notarized-candidate` |
| Windows x64 Intel/AMD | `GiC_<version>_x64-unsigned-setup.exe`                       | `gic-windows-x64-<version>-unsigned-probe`      |
| Linux amd64           | `GiC_<version>_amd64.AppImage` and `GiC_<version>_amd64.deb` | `gic-linux-amd64-<version>`                     |

Each of the four binaries must have its own matching `.sha256` file: **eight release assets in total**. Intel Mac and Windows ARM installers are not part of this matrix.

### Perform independent checks

- [ ] **macOS, on a Mac:** verify DMG integrity, stapled ticket, strict DMG signature, and Gatekeeper assessment. Mount read-only; verify the embedded app's deep/strict signature, Gatekeeper acceptance, identifier `cc.incode.gestalten`, signer team `WB5CKL86MX`, arm64 architecture, and numeric short/build versions. Always detach the image, including after failed checks. Gatekeeper acceptance is not a complete install/launch walkthrough.
- [ ] **Windows:** verify executable/NSIS structure and the x64 build target. Record that the installer is unsigned; do not imply Authenticode verification passed. A PE32/x86 NSIS installer stub is expected and does not establish the payload architecture. Check the target/provenance separately; record which signature checks were actually performed.
- [ ] **Linux:** verify AppImage ELF64 x86-64/type 2 and Debian archive format, version, amd64 architecture, and executable architecture. The beta.5 Debian package name is `gi-c`, not `gic-desktop`. Metadata inspection on macOS is not a Linux install/run test.
- [ ] Arrange real-machine smoke checks where available: install and launch, author/run/save/open/export a sketch, provider sign-in/use/sign-out if relevant, replacement/data preservation, and uninstall. Preserve warnings and failures; never disable OS protection or school policy. Clearly label missing checks and operator-reported results rather than claiming complete acceptance from CI.
- [ ] Persist a verification report in the journal and assigned git-bug issues: source SHA, run/artifact provenance, filenames/hashes, checks performed, warnings, failures, and limitations. Keep binaries, ZIPs, and raw logs out of git.

## 4. Obtain explicit publication approval

- [ ] Present the verified source commit, version/tag, four binaries, four manifests, signing status, and remaining manual checks to Fabian.
- [ ] Ask explicitly to publish the GitHub prerelease. Do not infer permission from successful builds, a prior release, or a merged PR.
- [ ] Check both the remote tag and GitHub Release before creating anything. If either already exists, inspect and stop for Fabian's decision; never overwrite a tag or replace published binaries.
- [ ] Write release notes to a file. Include platform/architecture support, the exact source SHA, build provenance, checksums, signing status, and honest acceptance limitations. Keep the **CC BY-NC-SA 4.0** license unchanged.
- [ ] Mark Windows **unsigned** and include possible SmartScreen/unknown-publisher warnings. Only advise proceeding when the download is from this project's GitHub repository and the user trusts it. If available, explain “More info” → “Run anyway”; never recommend disabling SmartScreen. If institutional policy blocks it, direct users to their administrator.
- [ ] Keep distribution free. Paid Windows signing and license changes are not authorized by this process. Microsoft Store research remains backlog `99995d3`.

## 5. Stage and publish the prerelease

Assemble only the verified files in `<assets>`; keep each manifest beside its binary. Create a draft with **explicit source targeting**, never default-branch fallback. For a beta, set prerelease status and do not mark it Latest:

```sh
gh release create "<tag>" \
  "<assets>/GiC_<version>_aarch64.dmg" \
  "<assets>/GiC_<version>_aarch64.dmg.sha256" \
  "<assets>/GiC_<version>_x64-unsigned-setup.exe" \
  "<assets>/GiC_<version>_x64-unsigned-setup.exe.sha256" \
  "<assets>/GiC_<version>_amd64.AppImage" \
  "<assets>/GiC_<version>_amd64.AppImage.sha256" \
  "<assets>/GiC_<version>_amd64.deb" \
  "<assets>/GiC_<version>_amd64.deb.sha256" \
  --repo ff6347/giclang --target "<landed-sha>" \
  --title "GiC <tag>" --notes-file "<release-notes-file>" \
  --draft --prerelease --latest=false
```

- [ ] Inspect the draft: target commit, tag/version, prerelease status, all eight asset names/sizes, and GitHub asset digests versus the verified local hashes. Do not publish a partial upload. A draft may temporarily have an `untagged-...` URL.
- [ ] After all draft checks pass and publication approval is recorded, publish:

```sh
gh release edit "<tag>" --repo ff6347/giclang \
  --draft=false --prerelease --latest=false
```

- [ ] Confirm the public release is not a draft and is marked prerelease. Resolve the remote tag to the exact `<landed-sha>`; peel annotated tags if necessary. `targetCommitish` alone is not tag verification.
- [ ] Re-download **all eight public release assets** into a separate directory. Verify all four public manifests against their binaries and compare manifests byte-for-byte with the original CI files. Confirm hashes match the recorded candidate hashes, not just an internally consistent replacement manifest.
- [ ] Record the public release URL, actual tag target, and public-download verification in git-bug and the journal. A successful upload is not the end of verification.
- [ ] If publication or public verification fails, stop and preserve evidence. Do not silently delete/recreate the release, move its tag, replace assets, or close broader acceptance issues.

## 6. Deliver the download-page update separately

- [ ] Only after public assets exist and pass verification, create a download-page branch/PR based on current `origin/main`.
- [ ] Update [`apps/site/src/pages/downloads.astro`](../apps/site/src/pages/downloads.astro), preserving its structure and supported-platform information. Link to the versioned GitHub Release or its actual assets, never Actions artifacts. Keep the Windows unsigned label, SmartScreen warning, checksum access, and unsupported-architecture limitations.
- [ ] Run the site build/typecheck plus lint, formatting, and link checks. Follow [`AGENTS.md`](../AGENTS.md) for commands and any additional gates required by executable changes; pure static link/text edits do not need tests that assert file contents.
- [ ] If a site build causes formatting failures in ignored `apps/site/.astro` metadata, inspect and remove only agent-generated, untracked output before rerunning formatting. Do not reformat unrelated source or change formatter configuration to hide it.
- [ ] Commit/push and request Fabian's review/merge through the **github** and **review** skills. GitHub may not retain a review request when `ff6347` is also the author; verify requests and state that limitation honestly.
- [ ] After merge, verify the separate Coolify **Astro site** deployment and the live download page/links. [`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) deploys the editor, **not** the Astro website; a green Pages run does not establish site delivery.

## 7. Finish without overstating acceptance

- [ ] Follow the **reflect** skill to consolidate durable release insights into `.agents/MEMORY.md`; keep detailed checkpoints in `.agents/journals/`.
- [ ] Update and synchronize assigned git-bug issues through its mutation helper. Keep broad workshop, security, and installer issues open until their actual criteria pass. If export succeeds but import fails, report the distinction and track the failure rather than recreating issues or claiming full synchronization.
- [ ] Remove only owned temporary downloads, mounts, and generated files after their evidence is persisted. Verify all nontrivial source/documentation work is committed and pushed and the working tree is clean.
- [ ] Report separately: public release status, download-page PR status, live-site deployment status, and outstanding manual acceptance. A published beta is not full v0.9 completion.

For a concrete completed publication record, see the [beta.5 journal](journals/2026-10-09-beta-5-publication.md). The records do not authorize repeating publication or overwriting that release.
