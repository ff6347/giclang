<!-- ABOUTME: Records the application layout and shared visual scale implementation. -->
<!-- ABOUTME: Preserves panel geometry, Base UI form usage, and browser verification. -->

# Application layout system

- [preference] The default application workspace places the editor in the left 52% and stacks Preview, Output, and Problems in the right 48%.
- [decision] Output and Problems use independent FlexLayout tabsets so both remain visible with Preview; stored workspace version 6 resets incompatible saved geometry to this default.
- [preference] Application spacing uses the `--s0` through `--s10` scale, headings use the supplied major-third scale, and existing black, white, and gray colors come from semantic custom properties.
- [decision] Save As composes Base UI Dialog, Field, Field Control, and Button primitives with the shared form, spacing, color, border, and shadow styles.
- [verification] A headed browser walkthrough covered the complete workspace, About typography, and the Save As edit/cancel flow.
- [verification] Core tests, compact tests, both typechecks, lint, formatting, browser build, all 72 Firefox acceptance tests, and `git diff --check` passed.
