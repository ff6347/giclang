<!-- ABOUTME: Records the agreed scope for shared GIC agent content planning. -->
<!-- ABOUTME: Captures naming, distribution limits, and implementation safety gates. -->

# GIC agent content planning

- [decision] Fabian requested a planning branch and repository plan only, not implementation. The active plan is [Shared GIC agent content](../plans/gic-agent-content.md).
- [decision] Desktop and public documentation must consume the same skill from `packages/content`, with a clearly conditional editor-only section for tool use. Both use the same bundled language reference.
- [decision] The product skill is named `gic-agent`, matching the Agent panel. Initial distribution is self-contained copy/paste and a downloadable ZIP/folder, with no marketplaces, plugins, or automatic upstream updates.
- [risk] The shipped skill frontmatter already says `gic-agent`, but managed folders and references use `gic-tutor`. Implementation must resolve existing workspace paths and digest records without losing modified or kept files; migration behavior needs confirmation before implementation.
- [risk] ChatGPT's documented standalone-skill upload format remains unverified. Do not promise acceptance of the ZIP without an authorized account test; retain copy/paste as the fallback.
- [technique] The content package owns source and assembly; editor, site, and native hosts own presentation, public URLs, and embedding. Skill metadata must not be treated as normal Docs frontmatter.
