<!-- ABOUTME: Records the agreed scope for shared GIC agent content planning. -->
<!-- ABOUTME: Captures naming, distribution limits, and implementation safety gates. -->

# GIC agent content planning

- [decision] Fabian requested a planning branch and repository plan only, not implementation. The active plan is [Shared GIC agent content](../plans/gic-agent-content.md).
- [decision] Desktop and public documentation must consume the same skill from `packages/content`, with a clearly conditional editor-only section for tool use. Both use the same bundled language reference.
- [decision] The product skill is named `gic-agent`, matching the Agent panel. Initial distribution is self-contained copy/paste and a downloadable ZIP/folder, with no marketplaces, plugins, or automatic upstream updates.
- [risk] The shipped skill frontmatter already says `gic-agent`, but managed folders and references use `gic-tutor`. Implementation must resolve existing workspace paths and digest records without losing modified or kept files; migration behavior needs confirmation before implementation.
- [risk] ChatGPT's documented standalone-skill upload format remains unverified. Do not promise acceptance of the ZIP without an authorized account test; retain copy/paste as the fallback.
- [technique] The content package owns source and assembly; editor, site, and native hosts own presentation, public URLs, and embedding. Skill metadata must not be treated as normal Docs frontmatter.
- [decision] Fabian specified Skill as the documentation label, with a Skill tab within editor Docs and the same content in website documentation. Agent remains the integrated panel label; `gic-agent` remains the skill identity.
- [decision] Learners should learn standard skill terminology and transferable use with common AI tools for creative coding, not depend on a GIC-only workflow. Both documentation hosts expose the shared instructions, reference, copy action, and download.
- [decision] Fabian added a Copy to clipboard button for examples. The plan covers copying code and description together from the shared example content in editor and website, with feedback and selectable-text fallback; no implementation was requested.
