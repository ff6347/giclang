<!-- ABOUTME: Plans one shared GIC agent skill for the desktop application and public documentation. -->
<!-- ABOUTME: Defines beginner-focused copy/paste and downloadable skill delivery without marketplaces. -->

# Shared GIC agent content

## Status and goal

Planning only; implementation requires a separate instruction from Fabian.

Make the desktop Agent and the skill visible in GIC documentation use one maintained instruction source and one bundled language reference in `packages/content`. Name the product skill `gic-agent` consistently. Present it as **Skill** within Docs in both the editor and the website. Let learners either copy everything into an ordinary ChatGPT or Claude conversation or download a skill folder as a ZIP for upload or local use.

The educational goal includes preparing learners for creative coding with common AI tools. Teach the standard concept of a skill and its portable file structure, not a GIC-specific substitute or an isolated workflow. The integrated Agent is one consumer of the skill, not a prerequisite for using it.

The Agent remains a teaching assistant: plain language, Socratic questions, short examples, and guidance rather than complete assignment solutions. The name does not add autonomous actions or permissions.

## Scope decisions

1. The desktop Agent, documentation, and downloads use the same `SKILL.md`, not separately authored prompts or provider-specific teaching policies.
2. That skill contains a clearly labeled **GIC editor agent only** section for the integrated application's tools and supplied context. It applies only when the GIC host supplies those capabilities; ordinary chats and external coding tools must not assume they exist.
3. The common policy consults the supplied language reference before explaining syntax or signatures. In ordinary chat the reference is pasted; in an installed skill it is a bundled file; in the editor it is accessed through the existing reference tools.
4. Distribution is limited to copy/paste and a downloadable ZIP containing an ordinary skill folder. An extracted folder is also usable by filesystem-based assistants.
5. Use `gic-agent` for the skill frontmatter, containing folder, download identity, and managed workspace skill path. Label its documentation tab/entry **Skill**, and call the artifact the **GIC skill** (`gic-agent`). Keep **Agent** for the existing integrated panel; distinguish the skill's reusable instructions from the agent that uses them.
6. Make the Skill tab part of the editor's Docs and expose the same Skill content within the website's documentation navigation. Follow each host's navigation conventions; do not make the skill available only through the Agent panel or a separate GIC-only setup experience.
7. Keep the source host-neutral. Content validation and assembly belong to `@giclang/content`; public URLs, browser controls, and native embedding belong to their hosts.
8. Make every public documentation page individually copyable in editor and site. Generate an `llms.txt` index covering the complete public documentation catalogue, with links to clean Markdown exports of each page, from the same content rather than a separately maintained AI documentation set.

## Existing integration points

- [Product skill](../../apps/desktop/src-tauri/workspace/gic-tutor/SKILL.md): already has `name: gic-agent`, but its folder is `gic-tutor`; combines teaching policy and integrated tool instructions.
- [Bundled reference](../../apps/desktop/src-tauri/workspace/gic-tutor/references/language.md): consumed by the integrated reference tools and installed workspace.
- [Native Agent](../../apps/desktop/src-tauri/src/agent.rs), [reference access](../../apps/desktop/src-tauri/src/reference.rs), and [managed files](../../apps/desktop/src-tauri/src/managed_files.rs): embed the desktop-owned sources.
- [Workspace guidance](../../apps/desktop/src-tauri/workspace/AGENTS.md): directs external assistants to the installed skill.
- [Content files API](../../packages/content/src/content-files.ts): exposes package-owned files to Node build tools; currently enumerates About, Docs, and Examples.
- [Editor content adapter](../../apps/editor/src/lib/content.ts) and [site collection](../../apps/site/src/content.config.ts): consume shared product documentation through their existing host-specific pipelines.
- [Managed-file decision](../decisions/workspace-managed-files.md): protects learner modifications during repair, update, and uninstall.

The generic engineering teaching skill under `.agents/skills/tutor/` is not the product skill and is outside this naming change. Internal tutor implementation symbols, session formats, and provider protocols are not to be renamed merely for terminology consistency.

## Proposed source layout

```text
packages/content/content/
├── docs/
│   └── skill.md
└── skills/
    └── gic-agent/
        ├── SKILL.md
        └── references/
            └── language.md
```

- `SKILL.md` starts with portable `name` and `description` frontmatter. Keep all teaching instructions there, including the conditional editor-only section. Do not duplicate those instructions in the documentation page.
- `references/language.md` is the shared compact reference. Review it against the [active specification](../../docs/Language%20specification.md), product reference pages, and shared built-in registry before publication. In particular, reconcile `print` arity with the active zero-or-more-arguments contract.
- `docs/skill.md` contains learner setup guidance for the Skill tab/page and presents the canonical skill through the host's rendering/assembly, rather than maintaining a pasted copy of its body.
- Skill/reference Markdown is raw skill content, not a normal Docs record requiring `title` and `order`. Keep it outside the existing Docs glob and validate it through an appropriate package-owned boundary.
- Desktop packaging must read or mechanically bundle the package-owned sources. Any generated copies are build artifacts, never independently maintained sources. Ensure clean builds can resolve them without relying on a developer's existing output directories.

## Learner experience

### Skill within Docs

Use **Skill** as the editor Docs tab label and the corresponding website documentation entry/page title. Both expose the same skill, reference, copy action, and ZIP download without requiring use of the integrated Agent.

Explain briefly that a skill is reusable instructions and supporting resources an AI assistant can load. Show `SKILL.md` and `references/` as common, portable conventions, distinguish installing a skill from pasting it into one conversation, and demonstrate using it with ChatGPT or Claude. Do not hide standard terminology behind a bespoke product name or require learners to stay inside GIC for help.

### Copy into a chat

Provide **Copy skill and reference**, alongside selectable text when clipboard access fails. The payload contains the canonical skill body, the complete compact reference, and a short instruction explaining how to begin. Keep the editor-only section visibly conditional; do not rewrite the teaching policy per provider.

Explain the short workflow:

1. Copy the instructions and reference.
2. Open ChatGPT or Claude and paste them into a conversation.
3. Send the relevant sketch or diagnostic and ask for one next step.

Explain that an external chat cannot see the GIC editor or its files automatically. Sharing sketch content sends it to the chosen provider. Do not require browsing, API credentials, paid plugins, or terminal commands for this path.

### Copy an example

Add a **Copy to clipboard** button to examples in the editor and on the website. One click copies the example's complete GIC source and its description together as readable text, ready to paste into ChatGPT, Claude, or another tool.

Use the same package-owned example source and description on both hosts. Preserve the code exactly and include the description as authored Markdown without YAML frontmatter or rendered HTML. Clearly separate the description from a fenced `gic` code block. Copy the bundled example, not an unrelated or edited sketch from the editor. This action does not prepend the skill or silently send anything to a provider.

Show success only after copying succeeds. If clipboard access fails or is unavailable, offer the same payload as selectable text for manual copying. The copy action must not open or modify the learner's current sketch.

### Copy a documentation page

Add **Copy page** to every documentation page in the editor and website, including Skill. Copy the page title and complete learner-facing Markdown content, preserving code blocks, lists, tables, and references without YAML frontmatter, navigation chrome, or rendered HTML. Resolve any assembled content from the same sources used to display the page; copying Skill must not omit its canonical instructions or leave an unresolved include.

Resolve relative page and asset links against host-provided public URLs so they remain useful outside GIC. Do not leak build paths, local filesystem locations, or desktop-only URLs. The copied content itself must be usable without browsing; do not copy only the page URL. Reuse clipboard success feedback and selectable-text fallback, and keep editor page copying available from bundled content without a network request.

### Discover the whole documentation with llms.txt

Generate an `llms.txt` index from the complete public documentation catalogue, including Skill. Follow the [llms.txt proposal](https://llmstxt.org/): project heading, concise context, and grouped Markdown links to detailed Markdown pages. Publish directly fetchable Markdown versions of every indexed page, derived from the same content used by Copy page and normal documentation rendering. Preserve stable page identities and existing ordering; keep HTTP routes and absolute public URLs host-owned.

Both website and browser-editor deployments expose the generated index and Markdown pages through static public assets/routes, respecting their deployment base paths. In the desktop editor, expose the bundled index for copying or downloading and retain per-page copying; do not create an HTTP server merely to expose these files. Make the index discoverable from Docs in editor and site, and directly validate every generated link against published output.

`llms.txt` is a compact discovery index, not a full-text export of all docs and not a guarantee that a provider will discover or fetch them. Chats without browsing use Copy page, Copy all docs, or Copy skill and reference. Do not add an AI service, MCP server, or hand-maintained duplicate documentation.

### Copy or download all documentation

Generate `llms-full.txt` containing the complete Markdown text of every public documentation page listed in the index, including the assembled Skill page. Use the same page serialization as individual exports, retain documentation order, and separate pages clearly with their titles and public source URLs. Include every page once; preserve code blocks, tables, and prose without summaries, silent truncation, YAML frontmatter, or navigation chrome. Images remain portable Markdown links, not embedded binary data. Exclude engineering instructions, private agent state, deprecated documentation, and the separate example catalogue.

Provide **Copy all docs** and **Download all docs** in editor Docs and website documentation. Both use the same complete export; the download filename is `llms-full.txt`. Publish it alongside `llms.txt` and the individual Markdown exports in both web deployments, link to it from the index, and bundle it for desktop and offline editor copying/downloading without requiring a network request or local server.

Reuse clipboard feedback and selectable-text fallback. Explain briefly that the full document may exceed a chat's input limits, and offer the download or individual page copying instead; never shorten the export automatically or promise that every provider accepts its full size.

### Download a skill

Provide **Download skill (ZIP)** with this structure:

```text
gic-agent.zip
└── gic-agent/
    ├── SKILL.md
    └── references/
        └── language.md
```

The folder name and frontmatter name must match. The skill explicitly points to its bundled reference; a website link alone is not sufficient. Publish the same source files for inspection, and explain that users can extract the ZIP for a filesystem-based assistant.

Give short provider-specific upload and activation instructions where verified. Claude documents ZIP-folder uploads, including Free accounts with code execution enabled. ChatGPT documents skill uploads for eligible workspaces, but the accepted standalone-skill file layout must be tested before claiming this ZIP is supported there. If uploading is unavailable or rejected, direct the learner to copy/paste; do not add another distribution system to work around it.

Sources: [Agent Skills specification](https://agentskills.io/specification), [Claude skill uploads](https://support.claude.com/en/articles/12512180-use-skills-in-claude), and [ChatGPT skill uploads](https://help.openai.com/en/articles/20001066-skills-in-chatgpt). These establish documented capabilities, not completed account tests.

## Implementation sequence

1. **Establish the shared source.** Relocate the product skill and reference into the content package. Separate common guidance from the conditional editor-only section within the same skill. Preserve its teaching constraints and reference-grounding behavior. Validate naming and reference links directly; do not write tests that pin authored paragraphs.
2. **Connect the desktop.** Embed the canonical skill and reference in the existing Agent and reference tools. Update workspace guidance, support-file labels, relevant build tooling, and managed paths to `gic-agent`. Preserve the existing Agent tool set and managed-file protections.
3. **Handle existing workspaces safely.** Before implementing path migration, confirm how existing `.agents/skills/gic-tutor/` files and digest records should be handled. Never discard modified or explicitly kept files. Present any required migration choice to Fabian; do not silently introduce aliases or backward compatibility. Exercise install, repair, update, keep, replace, and uninstall against real temporary files.
4. **Expose the shared content.** Add package-owned assembly for the copy payload and ZIP/folder. Add the **Skill** tab within editor Docs and the corresponding Skill entry/page within the Astro website's documentation. Present the shared instructions, reference, standard skill terminology, and setup guidance in both. Use the same instructions and reference in every output; keep download URLs host-owned.
5. **Enable example copying.** Assemble one text payload from each example's code and description and expose **Copy to clipboard** on existing example surfaces in the editor and website. Reuse the clipboard feedback/fallback behavior where practical; do not introduce another example catalogue.
6. **Make documentation portable.** Add Copy page, Copy all docs, and Download all docs throughout the appropriate editor and site Docs surfaces. Generate the complete `llms.txt` index, clean Markdown page exports, and combined `llms-full.txt` through shared content assembly. Publish them with each web host's routing/base-path conventions and expose the bundled exports in desktop Docs. Validate links and complete-document coverage against clean production builds.
7. **Verify learner use.** Exercise copy/paste in real ChatGPT and Claude conversations. Test actual skill uploads where an authorized eligible account is available. Record unsupported or untested combinations honestly and keep copy/paste available as the fallback.

## Verification

For executable behavior, follow red-green TDD at the narrowest seam:

- Assemble copy text from fixture instruction/reference inputs and verify neither is omitted or altered; do not assert the wording of production prose.
- Create and extract a real ZIP, verify its file structure and referenced-file availability, and compare its contents with the package-owned inputs.
- Assemble example copy payloads from fixture code and Markdown descriptions, verifying exact code preservation, inclusion of the description, and exclusion of frontmatter/rendered HTML without pinning production prose. Exercise the real example buttons on both hosts, checking clipboard contents, success feedback, failure fallback, and preservation of the current sketch.
- Test fixture-driven documentation serialization and host-provided URL resolution, preserving titles, code blocks, and Markdown while excluding frontmatter and resolving relative links. Exercise Copy page and its feedback/fallback on both hosts, including editor copying without network access.
- Directly validate built `llms.txt`, `llms-full.txt`, and Markdown exports for complete public-page coverage, resolvable links, correct content types, deployment base paths, absence of local paths, and inclusion of assembled Skill content. Test executable index/URL assembly with fixtures rather than pinning production prose or declarative file contents.
- Test combined-document assembly with fixture pages for complete content, deterministic order, clear page boundaries, and no duplicate or truncated pages. Exercise Copy all docs and Download all docs on editor and site, comparing clipboard/download text with the shared export and checking editor offline behavior, feedback, and manual-copy fallback.
- Exercise managed-file provisioning and any approved migration with real temporary files, including modified and kept support files.
- Preserve deterministic integrated-Agent tests proving reference lookup, enabled-example lookup, context handling, and absence of arbitrary shell/file/web capabilities.
- Drive the real editor Docs navigation and website documentation navigation to reach Skill and exercise copy, clipboard failure fallback, visible source presentation, and downloads on both hosts. Test browser behavior without provider mocks or test-only DOM state.

Review declarative frontmatter, links, and prose directly. Run the applicable content, editor, site, and desktop checks from project instructions. Include a clean site build and the site package's own validation. Do not claim ZIP acceptance, provider access, or teaching behavior without a real authorized test; installing a skill alone does not guarantee model adherence.

## Acceptance criteria

- One maintained `SKILL.md` in `packages/content` supplies the desktop Agent, the skill shown in documentation, and downloaded/copied instructions.
- The only editor-specific guidance is a clearly gated section of that same skill; external chats do not claim access to GIC-only tools.
- One shared language reference grounds all three delivery paths without requiring a website fetch.
- Public and managed skill identities consistently use `gic-agent`. Docs uses **Skill** for the reusable artifact; the integrated panel remains **Agent**.
- Skill is reachable within editor Docs and website documentation, with the shared instructions, reference, copy action, and download on both hosts.
- Learners can explain what a skill is and use this one with common external AI tools without relying on the integrated GIC Agent.
- Copy/paste includes the instructions and reference, with an accessible fallback when clipboard access fails.
- Examples in the editor and website offer **Copy to clipboard** that copies both the complete example code and its description, with success feedback and manual-copy fallback, without changing the current sketch.
- Every documentation page in editor and site offers Copy page with its title and complete Markdown content, preserved code, portable links, success feedback, and manual-copy fallback. Bundled editor content is copyable without a network request.
- Both web deployments publish an `llms.txt` index covering all public docs and clean Markdown versions of every indexed page; the desktop editor exposes the bundled index without requiring a server. Docs makes the index discoverable on both hosts.
- `llms-full.txt` contains every indexed public documentation page's complete text once, in documentation order, including assembled Skill content. Both editor and site offer Copy all docs and Download all docs; the editor's bundled export works offline, and both web deployments publish it with a link from `llms.txt`.
- The documentation index, copied pages, combined full-text document, and Markdown exports derive from shared content; no independently maintained AI documentation is introduced.
- The ZIP contains the matching `gic-agent` folder and its reference and works through verified provider upload paths; unverified/unavailable paths are labeled and offer copy/paste.
- Existing learner files, kept policies, and sketches remain protected during any approved workspace migration.
- The Agent continues to guide beginners rather than produce complete assignment solutions.

## Explicitly out of scope

- Marketplaces, public-directory submission, plugin manifests, and plugin archives.
- Automatic upstream skill updates, package registries, HTTP skill catalogs, and third-party installers.
- One-click install/deep-link schemes, MCP servers, scripts, hooks, or additional agent tools.
- A broad cross-harness certification matrix or unrelated internal tutor renaming.
- Changing the generic engineering tutor skill or rewriting personal learning notes.

Remove this active plan once its implementation and acceptance criteria are complete; do not archive it.
