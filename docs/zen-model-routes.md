<!-- ABOUTME: Maps live OpenCode Zen model IDs to documented API endpoint families. -->
<!-- ABOUTME: Explains route evidence, verification limits, and how agents should maintain this reference. -->

# OpenCode Zen model routes

Use this page to look up the documented endpoint family for a Zen model ID when working on GIC's text-only tutor. The provider's [Zen endpoint table](https://opencode.ai/docs/zen/#endpoints) is the authority for documented routes; this page maps that information to IDs observed in the live catalog.

The Zen catalog at `https://opencode.ai/zen/v1/models` returns model `id`, `object`, `created`, and `owned_by` metadata. It does not report protocol or endpoint compatibility. A catalog listing is not evidence that a model accepts a particular request format.

OpenCode [Go](https://opencode.ai/v2/docs/console/go) is a separate subscription and API under `/zen/go/v1`. Go lists models that Zen may not offer and requires its own access check. Neither a Zen catalog entry nor a Zen probe certifies Go access. OpenRouter is a third provider with separate model IDs, pricing, and account eligibility.

## Endpoint families

The endpoint paths below are relative to `https://opencode.ai/zen/v1`. A documented route identifies an endpoint family, not a guarantee that GIC can call a model successfully. The live catalog is subject to change.

| Endpoint family | IDs observed in the live catalog |
| --- | --- |
| `/chat/completions` | `big-pickle`, `deepseek-v4-flash`, `deepseek-v4-flash-vision-exp`, `deepseek-v4-pro`, `deepseek-v4.1-flash`, `glm-5.2`, `glm-5.3`, `glm-5.3-flash`, `kimi-k2.7-code`, `kimi-k3`, `ling-3.0-flash-fin-free`, `minimax-m2.7`, `minimax-m3`, `mimo-v2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`, `qwen3.8-max`, `space-bunny-free` |
| `/responses` | `gpt-5.5-pro`, `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-sol`, `grok-4.5`, `grok-4.6`, `grok-4.7`, `muse-spark-1.2`, `muse-spark-1.3`, `muse-spark-1.3-contributor-free` |
| `/messages` | `claude-fable-5`, `claude-fable-5-1`, `claude-opus-4-6`, `claude-opus-4-7`, `claude-opus-4-8`, `claude-opus-5`, `claude-opus-5-5`, `claude-sonnet-4-6`, `claude-sonnet-5`, `qwen3.6-plus`, `qwen3.8-flash` |
| `/models/{id}:streamGenerateContent?alt=sse` | `gemini-3.7-flash`, `gemini-3.8-flash` |

The native route map also recognizes these IDs from the provider's endpoint table, although they were absent from the observed catalog. They become visible only if the live catalog offers them:

| Endpoint family | Documented IDs absent from the observed catalog |
| --- | --- |
| `/responses` | `gpt-5.5`, `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.2`, `gpt-5.2-codex`, `gpt-5.1`, `gpt-5.1-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`, `gpt-5`, `gpt-5-codex`, `gpt-5-nano` |
| `/messages` | `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` |

### Non-chat or unverified IDs

These catalog IDs are not assigned a text-chat route here:

| ID | Status |
| --- | --- |
| `jev-1.13`, `jev-1.13-free` | The provider documents Jev on the `/systemone` endpoint, not a chat endpoint. |
| `muse-spark-1.2-contributor-free` | The provider's endpoint table does not list this catalog ID. |
| `test`, `test-novita-dsf4.1` | No route is documented for these IDs here; treat as unverified. |

Any ID not listed in either route table is **unverified** until checked against the current provider documentation and the native route implementation. Do not infer a route just from a model name or from its presence in the catalog.

## Evidence and limits

The endpoint families follow the provider's current endpoint table. Smoke checks have confirmed only these examples:

| Model ID | Smoke-confirmed route | Smoke result |
| --- | --- | --- |
| `space-bunny-free` | `/chat/completions` | Passed |
| `gpt-5.6-terra` | `/responses` | Passed |
| `claude-sonnet-4-6` | `/messages` | Passed |
| `gemini-3.7-flash` | `/models/{id}:streamGenerateContent?alt=sse` | Passed with a small text output |

These checks do not mean every model in an endpoint family has been tested. Protocol compatibility and account access are distinct: a valid protocol route does not guarantee that an account can access a model, and account access does not establish protocol compatibility. Zen's catalog does not provide pricing; do not infer or document pricing from this mapping.

The Gemini endpoint has a successful direct smoke check, but the integrated tutor does not yet have a credential-safe native Gemini adapter. Its models remain outside GIC's callable picker until that adapter is verified.

## Reference-tool capability

A documented text route does not establish that a model can use GIC's bounded `search_reference` and `read_reference` tools. Only models with a completed tool-call → reference-result → text-answer probe are marked verified for the integrated tutor:

Each explicit question allows at most two tool-bearing model turns and two reference calls in total, followed by one no-tools answer turn. That is **up to three provider requests per question**, subject to a single 90-second deadline; BYOK providers may bill for each request.

| Provider-qualified model | Direct reference-tool probe | Integrated tutor |
| --- | --- | --- |
| `opencode-zen/gpt-6-luna` | Search and read calls consumed their results; final text completed | Selectable if present in the live catalog |
| `opencode-zen/claude-sonnet-5` | Search and read calls consumed their results; final text completed | Selectable if present in the live catalog |
| `opencode-zen/big-pickle` | Plain text and tool requests both returned HTTP 403, including with a conversation-specific session header | Unverified; not selectable |
| OpenRouter models | No account-key reference-tool probe completed | Unverified; not selectable |

Additional Zen Chat Completions probes used the same bounded search → read → answer workflow. These are **direct Zen API results**, not Go or packaged-app verification; GIC's native selectable-model allowlist has not been expanded on the basis of these probes.

| Zen model ID | Direct reference-tool result |
| --- | --- |
| `glm-5.3`, `glm-5.3-flash`, `kimi-k3` | Search, read, and final text completed |
| `deepseek-v4.1-flash`, `deepseek-v4-flash` | Search, read, and final text completed |
| `space-bunny-free` | Search, read, and final text completed; free-tier access is model-specific |
| `kimi-k2.7-code`, `deepseek-v4-pro` | HTTP 404 on the initial request; tool capability is unproven |
| `mimo-v2.6-flash-free` | HTTP 403 on the initial request; tool capability is unproven |
| `mimo-v2.6-pro` | Not in the Zen catalog or documented Zen routes; not requested |

The Go model `mimo-v2.6-flash` is not the same Zen ID as `mimo-v2.6-flash-free`. OpenRouter's `stealth/space-bunny-alpha` is not Zen's `space-bunny-free`; neither should be substituted silently.

Local native HTTP tests cover tool-result correlation for Chat Completions, Responses, and Messages, including OpenRouter's wire format. A live packaged tutor interaction is still needed; direct API probe success does not by itself prove packaged behavior.

## Updating this reference

When the catalog changes:

1. Compare the live IDs with the Zen endpoint table at [opencode.ai/docs/zen](https://opencode.ai/docs/zen/).
2. Add or remove IDs in the endpoint-family table only when the documentation supports the mapping. Put undocumented IDs in the unverified section.
3. Keep smoke-confirmed examples limited to routes actually tested with [`scripts/zen-smoke.ts`](../scripts/zen-smoke.ts); do not imply that all IDs have been smoke-tested.
4. Check the native route map in [`src-tauri/src/agent.rs`](../src-tauri/src/agent.rs) and its route tests. It selects the protocol, while `reference_tools_verified` controls which models are callable. Updating this document alone does not enable a model.
5. Preserve GIC's text-only tutor boundary. A provider endpoint's broader capabilities do not imply that GIC supports non-text interactions.
6. To certify another model, use the bounded [`zen-reference-smoke.ts`](../scripts/zen-reference-smoke.ts) probe only after the key owner authorizes paid inference. Confirm both reference tools and the final answer, then update the verification table, native allowlist, and tests. OpenRouter needs its own provider-specific proof; a Zen result cannot certify an OpenRouter route.
