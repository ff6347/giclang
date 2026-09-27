<!-- ABOUTME: Records implementation and verification notes for five small GIC improvements. -->
<!-- ABOUTME: Captures the editor regression and protocol boundary relevant to later work. -->

# Small improvements

- [decision] GIC Monaco language configuration declares paired brackets and `//` line comments. Selection wrapping uses the bracket pairs; `autoClosingBrackets: "never"` keeps literal multi-line typing from inserting extra closing delimiters.
- [lesson] Enabling Monaco quick suggestions inside strings also changes the timing of existing completion details. Browser acceptance should observe whether details are already open before sending the toggle shortcut.
- [technique] Named-color completion lexes the source prefix with a synthetic closing quote so incomplete strings can be recognized without duplicating GIC string/comment lexing rules. Only first string arguments of `background`, `fill`, and `stroke` receive suggestions from `colornames`.
- [decision] CLI diagnostics show exactly one immediately preceding source line, including blank context; the caret remains on the error line.
- [decision] OpenCode Zen sends the existing tutor conversation ID in `x-opencode-session`; absent or invalid IDs fail safely before a provider request.
- [lesson] Full Firefox acceptance exposed extra auto-inserted braces after enabling Monaco language brackets. A focused selection-wrap test alone did not catch literal multi-line source entry; the existing print and Canvas tests did.
- [verification] Core and browser typechecks, lint, formatting, browser build, 88 Firefox tests, 123 native tests, Clippy, Rust formatting, and a macOS desktop bundle passed. The initial full browser run had 12 failures from extra closing braces plus a completion-details timing failure; both were corrected and the full suite passed.
