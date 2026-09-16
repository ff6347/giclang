<!-- ABOUTME: Records the Monaco static authoring shell implementation checkpoint. -->
<!-- ABOUTME: Captures editor, diagnostic, output, acceptance, and tooling findings. -->

# Slice 6 Monaco Static Authoring Shell

## Scope

Git-bug issue `184f8de` replaces the prototype textarea with a packaged Monaco editor while preserving the disposable-worker execution path, current-source guards, timeout, Canvas rendering, and structured output.

## Implementation

- [decision] The browser imports Monaco's ESM editor API and editor worker from the installed `monaco-editor` package. Vite emits both as application assets; the shell has no CDN or runtime network dependency.
- [decision] GIC Monarch highlighting derives keywords and built-ins from the shared registries. Monaco's default theme supplies presentation; the shell defines no custom colors or typography.
- [technique] Monaco's `getPositionAt()` converts the core's half-open absolute offsets into marker ranges. The same positions produce the visible Problems entries.
- [decision] Problems and Output are visible semantic regions. Slice 8 can place them into its tabbed, resizable layout without changing their data flow.
- [technique] Output is rendered before the worker result branch so entries emitted before a runtime diagnostic remain visible and ordered.

## Acceptance

- [technique] Playwright drives Monaco through its visible editing surface, `Control+A`, ordinary key events, and Enter between lines. Firefox duplicated the first line when bulk `insertText()` received multiline source, so tests do not bypass the editor model or use that unreliable input path.
- [technique] Browser acceptance covers local asset loading, GIC highlighting, exact diagnostic ranges, Problems, Output, one debounced preview, stale-run replacement, parse/analyzer/runtime/timeout clearing, example fixtures, and Canvas pixels.
- [risk] The expected Monaco production bundle is 2.63 MB minified (674 kB gzip), so Vite reports its generic 500 kB chunk warning. The editor remains one locally packaged asset graph; code splitting would move rather than reduce Monaco's payload.

## Verification

- `pnpm test` — 401 passed.
- `pnpm test:compact` — passed.
- `pnpm typecheck` — passed.
- `pnpm typecheck:browser` — passed.
- `pnpm lint` — no warnings or errors.
- `pnpm fmt:check` — passed.
- `pnpm build:browser` — passed with the documented Monaco chunk-size warning.
- `pnpm test:e2e` — 38 Firefox tests passed.

## Tooling

- [blocked] The installed git-bug `v0.10.1` rebuilds the primary checkout cache but lists no issues and rejects existing issue `184f8de` as nonexistent, although its `refs/bugs/...` object and operations are present. Issue mutation must not bypass the required `mutate.sh` synchronization helper.
