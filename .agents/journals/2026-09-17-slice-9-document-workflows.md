<!-- ABOUTME: Records the portable one-document, example, and recovery workflow. -->
<!-- ABOUTME: Captures browser storage decisions and verification for Slice 9. -->

# Slice 9 Portable Document Workflows

## Implementation

- [decision] The browser has one active document. Open and example replacement request explicit confirmation only when the current source is dirty.
- [decision] Browser Save downloads the current sketch without retaining a file handle. Opened file names and Save As names establish the download name; an example and a recovered sketch require Save As.
- [decision] Browser-private recovery expires after seven days. Restored work is always a dirty `Recovered sketch`, so it cannot silently write a selected source file.
- [decision] Recovery writes use the last observed snapshot timestamp. A tab refuses to replace or clear a snapshot another tab has written more recently.
- [technique] The pure document model owns document transitions and recovery comparison. The browser adapter owns `File`, download, and `localStorage` operations; visible controls remain an adapter over that boundary.

## Verification

- `pnpm test`
- `pnpm test:compact`
- `pnpm typecheck`
- `pnpm typecheck:browser`
- `pnpm lint`
- `pnpm fmt:check`
- `pnpm build:browser`
- `pnpm test:e2e` — 50 Firefox tests passed.
