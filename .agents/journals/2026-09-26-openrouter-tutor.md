<!-- ABOUTME: Records OpenRouter tutoring boundaries and verification evidence. -->
<!-- ABOUTME: Preserves stream, credential, and model-authorization lessons. -->

# OpenRouter Tutor

- [decision] Adult workshop attendees use their own optional OpenRouter keys; GIC supplies no shared instructor key and never gates core authoring on a provider.
- [decision] Settings discloses third-party routing, retention, and possible billing before an OpenRouter key is entered. The Agent panel has no terms checkbox.
- [decision] Provider model-picker design is deferred. The current picker has no automatic paid selection; eligible concrete `:free` variants remain distinct from the `openrouter/free` router alias.
- [technique] Rig 0.42 may normalize a top-level SSE error with nonempty choices into `Final` with `FinishReason::Other("error")`. GIC rejects that finish reason and requires a terminal `Final` before reporting completion.
- [technique] The native OpenRouter provider fetches `/key` and `/models/user` on explicit Send, requiring an exact eligible model with finite, nonnegative input and output prices before any completion POST. A local HTTP regression test reached POST before the provider owned this check and only reached the catalog afterward.
- [lesson] Sign-out removes only the selected provider's credential. The protected shared `auth.json` is deleted only after the final credential is removed.
- [risk] The user-performed OpenRouter smoke used the manual stream path; a packaged smoke of the Rig-backed path remains pending. Local HTTP tests, native tests, Playwright, Clippy, and packaging pass without real keys.
- [decision] Fabian explicitly allowed one TDD-sequencing exception for the original OpenRouter implementation. The subsequent sign-out, concrete-free-model, disclosure, pricing, and native authorization fixes used failing tests before behavior changes.
- [lesson] OpenRouter lists `openai/gpt-6-sol` as `text+image+file->text`. A text-only tutor can still send text to models with additional input modalities; eligibility must require a text input token and text output rather than the literal `text->text` string. The exact `/models/user` account entry and prices remain required before completion.
