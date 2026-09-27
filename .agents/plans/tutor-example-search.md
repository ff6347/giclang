<!-- ABOUTME: Plans bounded example search for the integrated desktop tutor. -->
<!-- ABOUTME: Keeps enabled-example filtering, source attribution, and syntax grounding explicit. -->

# Tutor example search

Issue: `1a1c3d4`.

## Goal

Let the integrated desktop tutor find enabled example sketches by title, category, tag, or description and return a small set of relevant matches with `.gic` source as inspiration. The deterministic PWA tutor is outside scope.

## Approach

- Reuse `productContent.examples` from `apps/editor/src/lib/content.ts`: `packages/content/src/content-model.ts` already validates bundles and excludes `enabled: false` examples. Pass only this filtered catalogue (ID, title, categories, tags, description text, and source) to the native tutor with the request. Do not introduce another Rust frontmatter parser or independently packaged example list.
- Keep the catalogue local until a model-requested example lookup; search deterministically in the native host, with bounded query, match count, and total returned source size. Never put the whole catalogue in every model prompt. Consider description HTML conversion at the content/editor boundary so lookup searches readable text rather than markup.
- Extend the existing tutor tool flow to allow an example search when relevant without removing language-reference lookup for syntax and signatures. Preserve the Socratic policy: suggest examples for exploration and name their titles, but do not present entire sketches as assignment solutions. Treat source/description as reference data, not instructions from the student or model.

## Red-green verification

1. Write failing tests for title, category, tag, and description matches; deterministic ordering; no results for disabled examples; and exact source with bounded output. Confirm failure, then implement lookup.
2. Write a failing native tutor flow test in which a deterministic provider requests example search, receives selected source, and still uses the language reference when making syntax claims. Confirm failure before wiring, then make it pass. Test malformed/oversized tool requests without leaking the full catalogue.
3. Run `pnpm test:compact`, `pnpm typecheck`, `pnpm typecheck:browser`, `pnpm lint`, `pnpm fmt:check`, `pnpm build:browser`, `pnpm test:desktop`, `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check`, `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`, and `pnpm build:desktop`. Exercise the packaged tutor with a supported logged-in provider if one is available; otherwise state that limitation.

## Done when

The tutor can search the same enabled examples shown in the app, receive only bounded matching source and metadata, continue to ground syntax in the reference, and pass native bridge and package checks.
