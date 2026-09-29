<!-- ABOUTME: Records the PWA workspace Agent-tab fix and desktop test coverage gap. -->
<!-- ABOUTME: Keeps the remaining UI test migration and verification visible. -->

# PWA Agent tab

- [lesson] The default FlexLayout model placed Agent in the Output tabset for both hosts. Existing PWA browser tests checked only the unselected Agent region, so they missed its visible tab.
- [decision] Desktop layout creation and restoration include Agent; PWA defaults, restored layouts, and Reset Layout exclude Agent and remove persisted Agent and Tutor tabs. The PWA keeps Output available when Agent was previously selected.
- [risk] Eight PWA-only deterministic Agent interaction tests are explicitly skipped because Agent is desktop-only and the desktop test command has no UI runner. Git-bug `c4e0d9f` tracks moving their UI coverage to a desktop runner.
- [verification] Focused Firefox tests reproduced the PWA tab and passed after the model change. A Node test verifies desktop retains Agent after loading a browser workspace; compact tests, browser typecheck/build, and targeted lint/format checks pass.
