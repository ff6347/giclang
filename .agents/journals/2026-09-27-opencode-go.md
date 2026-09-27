<!-- ABOUTME: Records the OpenCode Go tutor integration checkpoint and validation limits. -->
<!-- ABOUTME: Keeps the remaining subscription and platform checks explicit for the next session. -->

# OpenCode Go tutor

- [decision] Go has its own native credential, `/zen/go/v1/models` discovery, `opencode-go/<id>` selection, and `/zen/go/v1` streaming routes; it does not fall through to Zen credentials or catalog.
- [technique] The supplied Go endpoint table maps documented model IDs to Responses, Messages, and Chat Completions. Local HTTP tests assert the generated request paths, headers, model IDs, and redacted failures; these tests do not prove account entitlement or live callable tool protocols.
- [decision] Each Go request sends `gic-tutor/0.1` and the persisted tutor conversation's UUID as `x-opencode-session`. A new tutor conversation gets a different UUID, and cancellation still uses the request ID.
- [risk] Go credits/subscription are unavailable, so no live Go API call or packaged Go-account smoke was made. Keep issue `2f62eaa` open until an entitled account can verify catalog, all three stream families, reference-tool calls, cancellation, restart, sign-out, and limits without unauthorized spending.
- [risk] Linux/Windows native packaging and credential validation remain separate open work; the macOS package build alone does not verify them.
