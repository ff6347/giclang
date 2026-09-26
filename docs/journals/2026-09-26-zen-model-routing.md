<!-- ABOUTME: Records the Zen endpoint routing and model-selection implementation checkpoint. -->
<!-- ABOUTME: Preserves protocol evidence, verification limits, and deferred decisions. -->

# Zen model routing

- [decision] The integrated tutor keeps its GIC-owned native provider boundary. Rig handles Zen Chat Completions, OpenAI Responses, and Anthropic Messages; no OpenCode CLI or proxy sidecar is required.
- [technique] Zen `/models` provides IDs but no endpoint or pricing metadata. `docs/zen-model-routes.md` records documented families, while the exact native route map admits only documented text-model IDs present in the live catalog.
- [lesson] An HTTP 402 cannot establish protocol incompatibility. With account access, representative GPT, Claude, and Gemini text models returned HTTP 400 through Chat Completions but streamed text through their respective Responses, Messages, and Gemini endpoints.
- [technique] `scripts/zen-smoke.ts` sends bounded text-only requests using an environment-supplied key and reports statuses, text lengths, and terminal markers without logging provider bodies.
- [risk] Rig 0.42's Gemini GenerateContent client puts the key in a query parameter. Gemini has a direct smoke result but no native tutor adapter; its models stay outside the callable picker.
- [decision] Fabian deferred native Gemini integration rather than use the query-key Rig client or introduce a separate HTTP adapter in this branch.
- [risk] Rig maps Responses `max_output_tokens` and Anthropic `max_tokens` to `FinishReason::Length`. Treat that as an incomplete tutor answer rather than recording a successful terminal.
- [question] Fabian has not selected handpicked default OpenRouter model IDs. Keep unknown Zen IDs excluded rather than infer a protocol.
- [verification] Core and compact tests, both typechecks, lint, formatting, native tests, Clippy, 80 Firefox tests, and the packaged macOS build pass. A live packaged GPT/Claude tutor interaction remains to be confirmed; the standalone smoke script and local native HTTP tests cover their protocol paths.
