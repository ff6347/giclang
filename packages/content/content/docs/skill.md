---
title: Skill
order: 80
---

## Use a skill with an AI assistant

A skill is a reusable set of instructions and supporting resources that helps an AI assistant work in a particular area are way. You can tell an agent to talk like a pirate and it will comply. The GiC skill is named `gic-agent`. It teaches an assistant to help you understand and create giclang sketches without doing the heavy lifting for you.

A common portable skill layout has a `SKILL.md` file and a `references/` folder for supporting material. The filetype is Markdown (extension `.md`). Here, the language reference is `references/language.md`. The instructions and reference are included below so you can use them without installing anything or asking an assistant to browse for files.

## Use it in a conversation

You can use the instructions manually with ChatGPT, Claude, or another assistant that accepts text in a conversation:

1. Choose **Copy skill and reference** to copy both complete texts.
2. Start a conversation and paste the copied instructions and reference.
3. Share the relevant sketch or error details, then ask for one next step or an explanation.

A regular chat cannot see the GiC editor or your local files automatically. Include only the sketch and context you choose to share: pasted content is sent to your chosen AI provider.

### Copy the skill and reference

Choose **Copy skill and reference** to copy the complete skill, language reference, and a short instruction for starting a conversation. If clipboard access is unavailable or blocked, a read-only text area appears with the same complete content. Use your normal keyboard copy command to copy it manually, then paste it into the conversation. Copying does not send anything to an assistant or change your sketch. This path needs no API key, paid plugin, browsing, or terminal. Editor copying and downloading use bundled content and work offline; chatting with a provider is a separate step.

### Download and upload the ZIP

Choose **Download skill (ZIP)** to save `gic-agent.zip`. For a filesystem-based assistant, extract the ZIP without renaming its files: `SKILL.md` refers to `references/language.md` inside that folder. The assistant can use these files only if its tools and configuration let it discover or open them; extraction does not install the skill or make it visible to every assistant. A downloaded or extracted copy is not automatically updated when the maintained skill changes.

Anthropic currently documents ZIP uploads for Claude. With code execution and file creation enabled, go to **Customize → Skills → + → Create skill → Upload a skill** and choose the ZIP. Toggle the uploaded skill on in the Skills list. Organization settings can affect availability. This upload path is documented, but this `gic-agent.zip` archive has not been tested with a Claude account. See [Anthropic's current instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).

Standalone skill ZIP upload to ChatGPT has not been verified here. Use **Copy skill and reference** as the fallback; see [OpenAI's Skills in ChatGPT documentation](https://help.openai.com/en/articles/20001066-skills-in-chatgpt) for current product information.

## Use an installed skill

The desktop application installs `gic-agent/SKILL.md` and its reference under `.agents/skills/` in your chosen projects folder. Settings → Support files shows their actual locations. An assistant with filesystem access can read those installed files, including any changes you keep. The integrated GiC Agent in the Desktop app uses the bundled instructions and reference, not edits to your installed copy.

The sections below show the instruction body of `SKILL.md` and the complete language reference. The portable file also has `name` and `description` metadata that identifies it to assistants.

Copy everything below to use the skill without installing anything.

---
