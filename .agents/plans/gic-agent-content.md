<!-- ABOUTME: Plans one shared GiC agent skill for the desktop application and public documentation. -->
<!-- ABOUTME: Defines beginner-focused copy/paste and downloadable skill delivery without marketplaces. -->

# Shared GiC agent content

## Status and goal

Slices 1–3 are implemented. Slices 4–6 remain planned and require a separate instruction from Fabian. Publication of the complete issue breakdown remains pending approval.

Fabian approved the pre-release `gic-agent` naming without migration code or local cleanup. Existing files and manifest records outside the managed set remain untouched.

Make the desktop Agent and the skill visible in GIC documentation use one maintained instruction source and one bundled language reference in `packages/content`. Name the product skill `gic-agent` consistently. Present it as **Skill** within Docs in both the editor and the website. Let learners either copy everything into an ordinary ChatGPT or Claude conversation or download a skill folder as a ZIP for upload or local use.

The educational goal includes preparing learners for creative coding with common AI tools. Teach the standard concept of a skill and its portable file structure, not a GIC-specific substitute or an isolated workflow. The integrated Agent is one consumer of the skill, not a prerequisite for using it.

The Agent remains a teaching assistant: plain language, Socratic questions, short examples, and guidance rather than complete assignment solutions. The name does not add autonomous actions or permissions.

## Scope decisions

1. The desktop Agent, documentation, and downloads use the same `SKILL.md`, not separately authored prompts or provider-specific teaching policies.
2. Integrated tool and context guidance lives in the editor-owned `apps/editor/prompts/agent-context.md`, labeled **GiC editor agent only**. The desktop app appends it to the shared skill only when creating the Agent's system prompt. It is excluded from `packages/content`, both Docs surfaces, and installed external-assistant skills.
3. The common policy consults the supplied language reference before explaining syntax or signatures. In ordinary chat the reference is pasted; in an installed skill it is a bundled file; in the editor it is accessed through the existing reference tools.
4. Skill distribution uses exactly two ordinary links on desktop, PWA, and website: **Download skill (ZIP)** and **View raw skill**. The ZIP contains an ordinary skill folder; the raw link opens the website's combined plaintext skill/reference for manual use. No skill clipboard action, button, details, textarea, status feedback, or fallback is included. An extracted folder is usable by filesystem-based assistants.
5. Use `gic-agent` for the skill frontmatter, containing folder, download identity, and managed workspace skill path. Label its documentation tab/entry **Skill**, and call the artifact the **GIC skill** (`gic-agent`). Keep **Agent** for the existing integrated panel; distinguish the skill's reusable instructions from the agent that uses them.
6. Make the Skill tab part of the editor's Docs and expose the same Skill content within the website's documentation navigation. Follow each host's navigation conventions; do not make the skill available only through the Agent panel or a separate GIC-only setup experience.
7. Keep the source host-neutral. Content validation and assembly belong to `@giclang/content`; public URLs, browser controls, and native embedding belong to their hosts.
8. Make every public documentation page individually copyable in editor and site. Generate an `llms.txt` index covering the complete public documentation catalogue, with links to clean Markdown exports of each page, from the same content rather than a separately maintained AI documentation set.
9. Preserve the current loading boundary: the integrated Agent uses the bundled canonical skill, while external assistants can use learner-modified installed copies. Sharing the shipped source does not require the desktop Agent to load those edits. Existing git-bug issue `0e7c1ca` is not a blocker for this work and remains open and unchanged.
10. Use **Skill**, not **Agent policy**, in the application's Support files section. Show the actual configured installation directory and resolved support-file paths so learners can locate the skill and reference.
11. The website Examples overview uses package-owned enabled examples in fixed `18rem × 18rem` cards resembling the editor. Thumbnails and titles link to build-generated `/examples/<id>/` pages with complete linked descriptions, permanently selectable source, and Copy to clipboard. Overview previews are noninteractive; neither overview nor detail pages execute code. Example clipboard failure shows only an error; no fallback details, textarea, or additional content is added.

## Existing integration points

- [Product skill](../../packages/content/content/skills/gic-agent/SKILL.md): canonical portable `gic-agent` teaching instructions.
- [Editor Agent context](../../apps/editor/prompts/agent-context.md): integrated-tool supplement appended only to the desktop Agent's system prompt.
- [Bundled reference](../../packages/content/content/skills/gic-agent/references/language.md): consumed by the integrated reference tools, documentation, and installed workspace.
- [Native Agent](../../apps/desktop/src-tauri/src/agent.rs), [reference access](../../apps/desktop/src-tauri/src/reference.rs), and [managed files](../../apps/desktop/src-tauri/src/managed_files.rs): embed the package-owned sources directly.
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
        ├── agents/
        │   └── openai.yaml
        ├── assets/
        │   └── icon.svg
        └── references/
            └── language.md
```

- `SKILL.md` starts with portable `name` and `description` frontmatter. Keep all common teaching instructions there. Do not duplicate those instructions in the documentation page.
- `apps/editor/prompts/agent-context.md` holds only editor-specific tool and context guidance and is appended to the desktop Agent's system prompt, not the package-owned skill.
- `references/language.md` is the shared compact reference. Review it against the [active specification](../../docs/Language%20specification.md), product reference pages, and shared built-in registry before publication. In particular, reconcile `print` arity with the active zero-or-more-arguments contract.
- `docs/skill.md` contains learner setup guidance for the Skill tab/page and presents the canonical skill through the host's rendering/assembly, rather than maintaining a pasted copy of its body.
- Skill/reference Markdown is raw skill content, not a normal Docs record requiring `title` and `order`. Keep it outside the existing Docs glob and validate it through an appropriate package-owned boundary.
- Desktop packaging must read or mechanically bundle the package-owned sources. Any generated copies are build artifacts, never independently maintained sources. Ensure clean builds can resolve them without relying on a developer's existing output directories.

## Learner experience

### Skill within Docs

Use **Skill** as the editor Docs tab label and the corresponding website documentation entry/page title. Both expose the same skill, reference, ZIP link, and website raw-text link without requiring use of the integrated Agent.

Explain briefly that a skill is reusable instructions and supporting resources an AI assistant can load. Show `SKILL.md` and `references/` as common, portable conventions, distinguish installing a skill from pasting it into one conversation, and demonstrate using it with ChatGPT or Claude. Do not hide standard terminology behind a bespoke product name or require learners to stay inside GIC for help.

### Locate the installed skill

In desktop Settings, the Support files section labels `SKILL.md` as **Skill** and retains **Language reference** for its reference. Show the actual installation directory selected by the learner, not an assumed default, and each managed file's resolved destination path alongside its existing state and actions. Paths must be readable and selectable and stay accurate after the projects folder changes. For missing or uninstalled files, distinguish the destination from a claim that the file exists. Keep local installation paths in Settings; do not include them in public documentation, downloads, or clipboard exports intended for external chats.

### Raw skill text

Provide **View raw skill** as an ordinary link to `https://giclang.cc/skills/gic-agent.txt`. The website publishes both complete original canonical sources, including skill frontmatter, in one plaintext document beginning with the skill's original frontmatter, with a label before the appended reference. Exclude the editor-owned tool supplement; do not rewrite the teaching policy per provider. The website uses its deployment base for local route links; the editor opens the public website URL.

Explain the short workflow:

1. Open the raw skill text and select the complete instructions and reference manually.
2. Open ChatGPT or Claude and paste them into a conversation.
3. Send the relevant sketch or diagnostic and ask for one next step.

Opening the website raw text requires a network connection on all platforms; editor ZIP downloading remains bundled and offline. An external chat cannot see the GiC editor or its files automatically. Sharing sketch content sends it to the chosen provider. Do not require API credentials, paid plugins, or terminal commands for this path.

### Copy an example

Add a **Copy to clipboard** button to examples in the editor and on the website. One click copies the example's complete GIC source and its description together as readable text, ready to paste into ChatGPT, Claude, or another tool.

Use the same package-owned example source and description on both hosts. Preserve the code exactly and include the description as authored Markdown without YAML frontmatter or rendered HTML. Clearly separate the description from a fenced `gic` code block. Copy the bundled example, not an unrelated or edited sketch from the editor. This action does not prepend the skill or silently send anything to a provider.

Show success only after copying succeeds. If clipboard access fails or is unavailable, show only an error. The description and code remain available for manual selection without adding fallback UI. The copy action must not open or modify the learner's current sketch. The website's static Examples page must not execute example code.

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
    ├── agents/
    │   └── openai.yaml
    ├── assets/
    │   └── icon.svg
    └── references/
        └── language.md
```

The folder name and frontmatter name must match. The skill explicitly points to its bundled reference; a website link alone is not sufficient. The ZIP also preserves package-owned OpenAI metadata and the GiC logo; its metadata icon paths resolve within the extracted skill folder. Keep display metadata and the icon out of the combined raw text and leave desktop installed-file management unchanged. Publish both original source files together in the website's raw plaintext document, and explain that users can extract the ZIP for a filesystem-based assistant.

Give short provider-specific upload and activation instructions where verified. Claude documents ZIP-folder uploads, including Free accounts with code execution enabled. Fabian manually imported the skill/reference ZIP into ChatGPT and Claude; ChatGPT generated OpenAI metadata and a heart icon. The four-file package includes the supplied metadata with GiC capitalization and the existing GiC logo. Provider acceptance and icon presentation for that archive remain unverified. If uploading is unavailable or rejected, direct the learner to copy/paste; do not add another distribution system to work around it.

Sources: [Agent Skills specification](https://agentskills.io/specification), [Claude skill uploads](https://support.claude.com/en/articles/12512180-use-skills-in-claude), and [ChatGPT skill uploads](https://help.openai.com/en/articles/20001066-skills-in-chatgpt). These establish documented capabilities; Fabian's reported account checks cover the skill/reference ZIP, not the four-file package.

## Implementation sequence

1. **Establish the shared source.** Relocate the product skill and reference into the content package. Keep common guidance in the shared skill and integrated tool/context guidance in the separate editor-owned prompt supplement. Preserve its teaching constraints and reference-grounding behavior. Validate naming and reference links directly; do not write tests that pin authored paragraphs.
2. **Connect the desktop.** Embed the canonical skill and reference in the existing Agent and reference tools. Update workspace guidance, relevant build tooling, and managed paths to `gic-agent`. Label the support file Skill and show its actual installation directory and each support file's resolved path in Settings. Preserve the existing Agent tool set, bundled-skill loading boundary, and managed-file protections.
3. **Preserve managed-file safety.** No path migration or local cleanup is required by Fabian's pre-release decision. Files and records outside the managed set remain untouched. Exercise install, repair, update, keep, replace, and uninstall against real temporary files, preserving modified and explicitly kept files.
4. **Expose the shared content.** Add package-owned assembly for the combined raw text and ZIP/folder. Add the **Skill** tab within editor Docs and the corresponding Skill entry/page within the Astro website's documentation. Present the shared instructions, reference, standard skill terminology, and setup guidance in both. Use the same instructions and reference in every output; keep download URLs host-owned.
5. **Enable example copying.** Assemble one text payload from each example's code and description and expose **Copy to clipboard** in editor Examples and a static website Examples page derived from the same package-owned catalogue. Show the source for manual selection and clipboard success/error feedback without fallback UI or website execution.
6. **Make documentation portable.** Add Copy page, Copy all docs, and Download all docs throughout the appropriate editor and site Docs surfaces. Generate the complete `llms.txt` index, clean Markdown page exports, and combined `llms-full.txt` through shared content assembly. Publish them with each web host's routing/base-path conventions and expose the bundled exports in desktop Docs. Validate links and complete-document coverage against clean production builds.
7. **Verify learner use.** Exercise copy/paste in real ChatGPT and Claude conversations. Test actual skill uploads where an authorized eligible account is available. Record unsupported or untested combinations honestly and keep copy/paste available as the fallback.

## Proposed issue slices

Pending approval of the complete breakdown before publication to git-bug. Each slice includes its relevant content, host integration, and behavior verification rather than creating standalone infrastructure issues.

1. **Share the gic-agent skill between desktop and documentation.** Implemented; no migration required. Blocked by: None. Deliver the canonical skill/reference in desktop and editor/site Docs, an editor-owned supplement appended only to the desktop system prompt, consistent naming, safe managed-file handling, and Support files labels and installation paths. Existing policy-authority issue `0e7c1ca` does not block this slice; preserve the current loading boundary.
2. **Download or view the raw GiC skill for another AI tool.** Implemented. Desktop, PWA, and website expose exactly two matching ordinary links: Download skill (ZIP) and View raw skill. The ZIP preserves the canonical skill/reference, OpenAI display metadata, and GiC icon and is bundled offline in the editor; the website publishes both complete original sources together as plaintext. Skill clipboard actions/tests, details, textareas, feedback, and fallbacks are excluded. Claude's documented upload path and ChatGPT Skills are linked; Fabian confirmed skill/reference ZIP imports in both, while four-file archive acceptance remains unverified. The portable skill links to the public website, Docs, repository, and examples with optional web access; the `llms.txt` link remains a slice 5 follow-up.
3. **Copy example code and description together.** Implemented. Editor and static website Examples copy complete authored Markdown descriptions and exact fenced GIC source. Both expose selectable source; clipboard rejection produces only an error. The website does not run code, and copying does not change the current sketch. Enabled examples and ordering remain package-owned; editor copying works offline.
4. **Copy individual documentation pages and publish Markdown versions.** Blocked by: Slice 1. Deliver complete per-page copying and clean Markdown exports, including assembled Skill content, on editor and site with offline editor access.
5. **Publish an llms.txt index for the documentation.** Blocked by: Slice 4. Deliver the generated complete index, working Markdown links, Docs discovery, and bundled desktop access. Once the website index is published, add `https://giclang.cc/llms.txt` to the optional further-resources section in the canonical `packages/content/content/skills/gic-agent/SKILL.md`. Verify the link resolves and is included in the raw skill and ZIP exports. Keep the bundled language reference authoritative and web access optional; do not add a broken placeholder link before publication.
6. **Copy or download the complete documentation.** Blocked by: Slice 5. Deliver llms-full.txt, Copy all docs, Download all docs, publication, and offline editor access using the same indexed page set.

## Verification

For executable behavior, follow red-green TDD at the narrowest seam:

- Assemble combined raw text from fixture skill/reference inputs and verify both original sources, including frontmatter, are complete and unaltered; do not assert the wording of production prose.
- Create and extract a real ZIP, verify its file structure and referenced-file availability, and compare its contents with the package-owned inputs.
- Assemble example copy payloads from fixture code and Markdown descriptions, verifying exact code preservation, inclusion of the description, and exclusion of frontmatter/rendered HTML without pinning production prose. Exercise the real example buttons on both hosts, checking clipboard contents, awaited success, error-only rejection, retry, selectable source, and preservation of the current sketch. Check source and feedback reachability in short editor windows and verify website examples never execute.
- Test fixture-driven documentation serialization and host-provided URL resolution, preserving titles, code blocks, and Markdown while excluding frontmatter and resolving relative links. Exercise Copy page and its feedback/fallback on both hosts, including editor copying without network access.
- Directly validate built `llms.txt`, `llms-full.txt`, and Markdown exports for complete public-page coverage, resolvable links, correct content types, deployment base paths, absence of local paths, and inclusion of assembled Skill content. Test executable index/URL assembly with fixtures rather than pinning production prose or declarative file contents.
- Test combined-document assembly with fixture pages for complete content, deterministic order, clear page boundaries, and no duplicate or truncated pages. Exercise Copy all docs and Download all docs on editor and site, comparing clipboard/download text with the shared export and checking editor offline behavior, feedback, and manual-copy fallback.
- Exercise managed-file provisioning and any approved migration with real temporary files, including modified and kept support files. Verify the integrated Agent still loads the bundled skill rather than installed edits.
- Verify Skill naming and resolved support-file paths through the actual configured projects directory. Exercise Settings after a location change and with missing/uninstalled files, preserving status and conflict-resolution actions.
- Preserve deterministic integrated-Agent tests proving reference lookup, enabled-example lookup, context handling, and absence of arbitrary shell/file/web capabilities.
- Drive real editor and website Docs navigation to reach Skill and verify exactly two matching ordinary links, the website plaintext popup, downloaded source bytes, unchanged sketch state, and offline editor ZIP delivery. Test browser behavior without provider mocks or test-only DOM state.

Review declarative frontmatter, links, and prose directly. Run the applicable content, editor, site, and desktop checks from project instructions. Include a clean site build and the site package's own validation. Do not claim ZIP acceptance, provider access, or teaching behavior without a real authorized test; installing a skill alone does not guarantee model adherence.

## Acceptance criteria

- One maintained `SKILL.md` in `packages/content` supplies the desktop Agent, the skill shown in documentation, and downloaded/copied instructions.
- Editor-specific guidance is appended from the editor-owned file only to the desktop Agent's system prompt; shared content, Docs, and installed external-assistant skills contain no integrated-tool instructions.
- One shared language reference grounds all three delivery paths without requiring a website fetch.
- Public and managed skill identities consistently use `gic-agent`. Docs uses **Skill** for the reusable artifact; the integrated panel remains **Agent**.
- Skill is reachable within editor Docs and website documentation, with shared instructions/reference and exactly two ordinary links for ZIP download and website raw text on both hosts.
- Learners can explain what a skill is and use this one with common external AI tools without relying on the integrated GIC Agent.
- The website raw plaintext contains both complete original sources for manual selection and pasting. No skill clipboard action, button, details, textarea, feedback, or fallback is present.
- Examples in the editor and website offer **Copy to clipboard** that copies both the complete example code and its authored description, with awaited success feedback and error-only rejection, without changing the current sketch. Code remains manually selectable without fallback UI, and the website Examples page does not execute it.
- Every documentation page in editor and site offers Copy page with its title and complete Markdown content, preserved code, portable links, success feedback, and manual-copy fallback. Bundled editor content is copyable without a network request.
- Both web deployments publish an `llms.txt` index covering all public docs and clean Markdown versions of every indexed page; the desktop editor exposes the bundled index without requiring a server. Docs makes the index discoverable on both hosts.
- `llms-full.txt` contains every indexed public documentation page's complete text once, in documentation order, including assembled Skill content. Both editor and site offer Copy all docs and Download all docs; the editor's bundled export works offline, and both web deployments publish it with a link from `llms.txt`.
- The documentation index, copied pages, combined full-text document, and Markdown exports derive from shared content; no independently maintained AI documentation is introduced.
- The ZIP contains the matching `gic-agent` folder and its reference and works through verified provider upload paths; unverified/unavailable paths are labeled and offer copy/paste.
- Existing learner files, kept policies, and sketches remain protected during any approved workspace migration. The integrated Agent retains bundled-skill loading; installed learner edits remain available to external assistants without becoming an implementation blocker.
- Support files calls the skill **Skill**, shows the actual configured installation directory and resolved paths for all managed files, and reflects location changes and missing/uninstalled states accurately.
- The Agent continues to guide beginners rather than produce complete assignment solutions.

## Explicitly out of scope

- Marketplaces, public-directory submission, plugin manifests, and plugin archives.
- Automatic upstream skill updates, package registries, HTTP skill catalogs, and third-party installers.
- One-click install/deep-link schemes, MCP servers, scripts, hooks, or additional agent tools.
- A broad cross-harness certification matrix or unrelated internal tutor renaming.
- Changing the generic engineering tutor skill or rewriting personal learning notes.

Remove this active plan once its implementation and acceptance criteria are complete; do not archive it.
