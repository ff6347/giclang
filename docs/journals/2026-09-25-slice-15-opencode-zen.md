<!-- ABOUTME: Records the OpenCode Zen tutor integration and its verification boundaries. -->
<!-- ABOUTME: Preserves provider, event, and model-selection findings for later stages. -->

# OpenCode Zen Tutor

- [decision] GIC uses Rig 0.42 for Chat Completions streaming while native commands own credentials, cancellation, and typed events. Go, OpenRouter, and Codex remain separate provider stages.
- [decision] Only Zen models supported by the native Chat Completions adapter and present in the live catalog appear in the selector. Selector IDs use `opencode-zen/<model>`; Rig receives the raw model ID.
- [lesson] The public Zen `/models` endpoint responds without valid credentials, so saving an API key cannot claim to authenticate it. Model-discovery failures need visible, redacted guidance and a retry action.
- [lesson] Serde's `rename_all` changes tagged enum variants but not struct-variant fields; `rename_all_fields` is needed for the browser's `requestId` payload.
- [lesson] Tauri event delivery and command resolution have no cross-channel ordering guarantee. Stream text while the command runs, wait for a request-correlated terminal event, and ignore events from other requests.
- [technique] Native request replacement cancels the previous token and only clears state for the matching request ID. Browser streams must check already-aborted signals before and after asynchronous listener registration.
- [technique] Local HTTP tests assert that Rig sends the raw model ID and consumes byte-fragmented SSE; the packaged Zen Space Bunny path also passed a user-performed live smoke without sharing credentials.
- [risk] The integrated tutor embeds the bundled skill while external assistants read the installed workspace copy. Modified managed policies may diverge until a product decision defines the intended authority.
- [risk] OpenRouter requires an adult account holder and can route student context to multiple upstream providers. Do not make it a workshop default or request student signup before the operator approves the account and privacy model.
- [blocked] Windows credential ACL behavior and packaged Windows execution still require platform validation; OpenRouter and Go are not v0.9 release gates.
