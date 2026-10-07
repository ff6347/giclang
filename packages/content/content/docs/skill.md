---
title: Skill
order: 80
---

# Use a skill with an AI assistant

A **skill** is a reusable set of instructions and supporting resources that helps an AI assistant work in a particular area. The GIC skill is named `gic-agent`. It teaches an assistant to help you understand and create GIC sketches without doing the learning work for you.

A common portable skill layout has a `SKILL.md` instruction file and a `references/` folder for supporting material. Here, the language reference is `references/language.md`. The instructions and reference are included below so you can use them without installing anything or asking an assistant to browse for files.

## Use it in a conversation

You can use the instructions manually with ChatGPT, Claude, or another assistant that accepts text in a conversation:

1. Start a conversation and paste the GIC skill instructions below.
2. Paste the language reference when you want help with GIC syntax or built-ins.
3. Share the relevant sketch or error details, then ask for one next step or an explanation.

A regular chat cannot see the GIC editor or your local files automatically. Include only the sketch and context you choose to share: pasted content is sent to your chosen AI provider. The skill is reusable guidance; the AI assistant is the tool you have a conversation with. The integrated GIC editor Agent is optional.

## Use an installed skill

The desktop application installs `gic-agent/SKILL.md` and its reference under `.agents/skills/` in your chosen projects folder. Settings → Support files shows their actual locations. An assistant with filesystem access can read those installed files, including any changes you keep. The integrated GIC Agent uses the bundled instructions and reference, not edits to your installed copy.

The sections below show the instruction body of `SKILL.md`, without its YAML metadata, and the complete language reference. The portable file also has `name` and `description` metadata that identifies it to assistants.
