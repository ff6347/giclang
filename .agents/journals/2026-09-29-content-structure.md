<!-- ABOUTME: Records the content-test cleanup requested for frequently edited product copy. -->
<!-- ABOUTME: Preserves the distinction between structural content checks and prose fixtures. -->

# Content structure checks

- [decision] About and Docs browser checks assert visible rendered markup and stable navigation, not authored paragraphs, headings, links, or image alt text that will change during content authoring.
- [decision] The Astro site-build test confirms a generated page with a main region; the build itself fails if the About source is absent.
- [verification] Reproduced the stale About sentence failure on `main`, then passed three focused Firefox checks, the site build test, editor/site typechecks, and focused lint and format checks.
