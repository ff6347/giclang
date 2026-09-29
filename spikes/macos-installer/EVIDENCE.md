<!-- ABOUTME: Records macOS package and signing evidence for the installer spike. -->
<!-- ABOUTME: Separates the verified Apple Silicon probe from the credentialed release candidate. -->

# macOS installer evidence

## Verified

- A locally built Apple Silicon DMG and embedded `GiC.app` pass Developer ID signature verification for team `WB5CKL86MX`. Without notarization, Gatekeeper rejects the app as `Unnotarized Developer ID`. A local, unquarantined install, launch, replacement, and uninstall passed with private GiC configuration isolated and restored; this does not establish downloaded-app acceptance.
- The [Mac-only PR CI probe](https://github.com/ff6347/giclang/actions/runs/36614784323) passed desktop tests and built an unsigned DMG on `macos-15`. The downloaded DMG matched its SHA-256 manifest (`8e294adf8a987e43df5eafbcc70de2c4883361c8bcca0f18646eba67d3be2280`) and passed `hdiutil verify`. Its embedded executable is arm64 with an ad-hoc signature and no team ID. This run did not test notarization or CI signing.

## Signed candidate

The [macOS installer workflow](../../.github/workflows/macos-installer.yml) keeps Apple credentials out of pull requests. Its signed job runs only after a manual dispatch from `main` in the `macos-release` environment. It imports a Developer ID certificate into a temporary keychain, builds a signed DMG, submits the DMG with an App Store Connect team API key, requires Apple's `Accepted` status, staples the DMG, verifies the signature and team, and assesses the DMG and embedded app with Gatekeeper before retaining the candidate and SHA-256. It does not publish a GitHub Release.

Fabian chose the App Store Connect team API-key route. The `macos-release` environment has a `main`-only deployment policy and all five required secret names; its credentials are never read back through GitHub. No required-reviewer rule is configured, so manual dispatch is the current human approval step. The secrets are:

| Environment secret | Supplied privately by Fabian |
| --- | --- |
| `MACOS_CERTIFICATE_P12` | Base64-encoded Developer ID Application `.p12` containing its private key |
| `MACOS_CERTIFICATE_PASSWORD` | Password used to export the `.p12` |
| `MACOS_API_KEY_P8` | Base64-encoded App Store Connect team API-key `.p8` |
| `MACOS_API_KEY_ID` | Key ID of that team API key |
| `MACOS_API_ISSUER` | Issuer ID of that team API key |

On this Mac, `base64 -i <file>` encodes either file. Its wrapped output can be supplied as a GitHub environment secret; the workflow decodes it with `base64 -D`. To produce a single line instead, use `base64 -i <file> | tr -d '\n'`. Never put private-key material, passwords, or their base64 representations in Git, an issue, chat, or an Actions artifact.

## Remaining release checks

1. Explicitly review and land this Mac-only workflow before manually dispatching the signed job from `main`; its certificate import, signing, notarization, stapling, and Gatekeeper checks have not yet run in CI.
2. Download the candidate DMG and compare its SHA-256 manifest; test Gatekeeper, visible launch, replacement, and uninstall on a Mac without treating an unquarantined local launch as distribution evidence.
3. Decide Intel Mac support separately; the existing runner and verified packages are Apple Silicon only. Keep all three desktop version sources synchronized when preparing a real release.
