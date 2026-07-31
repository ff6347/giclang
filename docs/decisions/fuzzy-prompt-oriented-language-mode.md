<!-- ABOUTME: Frames the unresolved GIC fuzzy prompt-oriented mode decision. -->
<!-- ABOUTME: Separates natural-language assistance questions from the current browser IDE non-goals. -->

# Decide Fuzzy Prompt-Oriented Language Mode

Status: Unresolved

## Decision Question

Should GIC support a fuzzy prompt-oriented mode for AI-assisted sketch
generation, and if so, where should that mode live relative to strict `.gic`
source?

## Current Baseline

Rev 2 asks whether a fuzzy version of the language could exist so prompts can
generate GIC code without requiring a small language model to emit strict GIC
directly. The browser IDE language-assistance milestone currently lists fuzzy
prompt mode and natural-language code generation as non-goals. The root README
says AI has been used as a guide or intern in the project and that automated
example generation remains up for discussion.

## Why This Is a Gate

Fuzzy input can affect parser modes, diagnostics, file extensions, browser IDE
UX, curriculum expectations, generated-example provenance, and the boundary
between teaching support and code generation. If mixed into strict `.gic`
parsing without a decision, syntax errors and assistant behavior may become
unpredictable for beginners.

## Options and Consequences

- **No fuzzy mode**
  - Keeps `.gic` source strict and diagnostics deterministic.
  - Leaves prompt-to-code workflows outside the language and IDE scope.
- **IDE-side assistant**
  - Keeps the language parser strict while allowing a tool to help draft or
    explain code.
  - Requires UI boundaries, provenance, and educational guardrails outside the
    grammar.
- **Separate fuzzy file or source mode**
  - Distinguishes prompt-oriented input from strict `.gic` source by mode or
    extension.
  - Requires conversion, validation, and user-facing transitions between fuzzy
    and strict forms.
- **Relaxed `.gic` parser mode**
  - Allows one file type to accept approximate syntax under selected conditions.
  - Risks weakening deterministic diagnostics unless strict and relaxed behavior
    are clearly separated.

## Questions Before Choosing

- Is fuzzy mode meant for generation, tutoring, repair suggestions, or all of
  these?
- Should fuzzy input ever be saved as `.gic`, or only converted into strict
  `.gic`?
- How are AI-generated changes identified to students and teachers?
- What browser IDE UI makes strict diagnostics distinct from assistant
  suggestions?
- Does the project need local models, remote services, or no model integration
  at all?
- How does this fit the educational boundary that AI should guide rather than
  replace learning?

## Decision Checklist

- Decide whether fuzzy mode exists.
- Define whether the boundary is language-level, IDE-level, file-level, or
  external.
- Specify how strict `.gic` diagnostics remain deterministic.
- Define provenance, safety, and educational expectations for generated or
  assisted code.
- Define any browser IDE affordances only after the mode boundary is selected.
- Update README or curriculum notes if the project AI policy changes.

## Unblocks

- Future AI-assisted example-generation, tutoring, repair-suggestion, or
  prompt-to-GIC workflows if selected.
- Future browser IDE assistant affordances if a fuzzy or assistant mode is
  selected.
- Future prompt-to-GIC workflow documentation.

## Related Guidance

- [Design Principles](<../Language specification rev 2.md#design-principles>)
- [Additional Considerations](<../Language specification rev 2.md#additional-considerations>)
- [Browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- [AI in this Project](../../README.md#ai-in-this-project)

## Non-Goals

- Selecting or integrating an AI model.
- Generating example programs in this document.
- Changing strict `.gic` syntax.
- Replacing parser, analyzer, or language-service diagnostics with prompt
  interpretation.
