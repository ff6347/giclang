<!-- ABOUTME: Records the static provider-capability manifest migration and validation. -->
<!-- ABOUTME: Preserves routing boundaries and the remaining effort-control dependency. -->

# Model capability manifest

- [decision] `apps/desktop/src-tauri/model-capabilities.json` owns static provider-qualified routes, verified tutor-tool IDs, the bundled Codex catalogue, and historical route/probe evidence. Runtime provider catalogues still determine current model presence, account eligibility, and OpenRouter prices.
- [decision] JSON rather than JSONC keeps native loading on existing `serde_json`. Evidence and maintenance notes are structured fields; the prior `.agents/zen-model-routes.md` was removed after its durable contents moved, while historical journal references remain unchanged.
- [lesson] A parseable capability manifest is still unsafe if overlapping route groups resolve by first match or verified IDs have no callable route. Native loading validates schema version, known providers, unique explicit/wildcard routes, routable verified IDs, and Codex identities/defaults before lookup.
- [risk] No provider-qualified effort levels have been verified in GIC. The manifest does not claim that live model catalogues report them or expose an effort setting.
