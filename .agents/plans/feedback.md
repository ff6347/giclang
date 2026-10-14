<!-- ABOUTME: Defines the GIC workshop feedback app and its frozen questionnaire. -->
<!-- ABOUTME: Records implementation, privacy, deployment, and acceptance requirements. -->

# GIC workshop feedback app: implementation briefing

## Start here

Build a small anonymous feedback form for Fabian Morón Zirfas's GIC workshop,
part of his master's thesis (Speculative Software, FH Potsdam). Preserve the
approved v2 pilot questionnaire wording and item IDs below. Further questionnaire
changes require Fabian's approval.

## 1. Research context

- **RQ1 (primary): Learning with AI.** Did AI help participants do the thinking
  themselves, or did they offload it?
- **RQ2 (secondary): Reduced complexity.** Did GIC's deliberate limits help
  beginners focus on concepts, or get in the way?
- **Practical goal:** improve the workshop and the GIC tool.
- The workshop has two phases: GIC without AI, then an AI phase. There is no
  baseline and no checkpoint. This single post-workshop form is the only
  instrument. All results are self-reported perceptions, not demonstrated learning.

## 2. Confirmed decisions

| Topic           | Decision                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instrument      | One anonymous form at the end of the workshop, about 10 minutes                                                                                         |
| Repository      | `apps/feedback/` in the GIC pnpm workspace; issues in this repository's git-bug tracker                                                                 |
| Stack           | Node, Hono, SQLite via `node:sqlite`, server-rendered HTML; no HTMX                                                                                     |
| Styling         | Reuse `@giclang/styles/tokens.css` and its self-hosted fonts; follow the site and editor's typography, spacing, monochrome palette, and native controls |
| Interaction     | Ordinary HTML forms; local JavaScript clones wish templates and disables submission while navigating                                                    |
| Hosting         | Fabian's VPS, deployed via Coolify at `feedback.giclang.cc`                                                                                             |
| Container       | Non-root Docker container; Compose bind-mounts a persistent host directory                                                                              |
| Database        | SQLite in WAL mode; database, WAL, and SHM files share the mounted directory                                                                            |
| Devices         | Desktops and tablets; responsive layout required                                                                                                        |
| Accessibility   | Native semantic HTML, labels, fieldsets, real radio buttons                                                                                             |
| Branching       | None; sections have skip notes and rating items have opt-outs                                                                                           |
| Required fields | Only consent                                                                                                                                            |
| Language        | English; open answers may be German or English                                                                                                          |
| Timing          | Last 10–15 minutes in the room, before wrap-up; link or QR code projected                                                                               |
| Retention       | Indefinite, for thesis, later workshops, and publications                                                                                               |
| Publication     | Aggregates and anonymised quotes only; never raw data                                                                                                   |
| Questionnaire   | Frozen; only an approved pilot may trigger changes                                                                                                      |

## 3. Frozen questionnaire (v2 pilot)

Store the item IDs exactly as shown. Use the wording verbatim. Every item is optional
except consent.

Fabian approved C5, C6, and the revised C4 following discussion of
[Rojas-Galeano's exploratory study](https://arxiv.org/pdf/2507.22900v4#page=22).
These are adapted self-report questions, not a validated scale or evidence of
demonstrated learning. C3 refers to the source of help selected in C2, including
human help; C4–C6 refer explicitly to AI.

### Intro text

**GIC Workshop Feedback**

This form is part of Fabian Morón Zirfas's master's thesis (Speculative Software,
FH Potsdam). It asks how you experienced learning programming with GIC, with and
without AI. There are no right or wrong answers. Critical feedback is especially useful.

- It takes about 10 minutes. Every question is optional, so skip anything that
  doesn't apply.
- The form is anonymous. No names, email addresses or IP addresses are collected.
  Please don't mention names or other identifying details in your written answers.
- Your answers will be used for the thesis, for future workshops and in
  publications. Short anonymous quotes may be used. The raw data will not be
  published, and Fabian will keep it indefinitely.
- Because responses are anonymous, a single response can't be found or deleted
  after you submit it.
- You may answer the written questions in German or English.

`consent`: [ ] I agree that my anonymous answers may be used and quoted as described
above. _(required)_

### Section A: About you

| ID               | Question                                                               | Options → stored value                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a1_experience`  | Before this workshop, how much programming experience did you have?    | None → `none`; A little (tutorials, small exercises) → `little`; Some (small projects of my own) → `some`; Regular (often or professionally) → `regular`                                  |
| `a2_vibecoding`  | Before this workshop, had you used AI to generate code ("vibecoding")? | Never → `never`; Once or twice → `once`; Occasionally → `occasionally`; Regularly → `regularly`                                                                                           |
| `a3_ai_attitude` | How do you feel about using AI to learn programming now?               | Mostly sceptical → `mostly_sceptical`; Somewhat sceptical → `somewhat_sceptical`; Somewhat positive → `somewhat_positive`; Mostly positive → `mostly_positive`; No opinion → `no_opinion` |

### Section B: Concepts and GIC without AI

**B1. Grid (classic table).** _Now, at the end of the workshop, how confident are you
that you could use each of these in your own sketch without help?_
Columns: Not confident (`1`) / Slightly (`2`) / Fairly (`3`) / Very (`4`) /
Not sure what this means (`0`). Put a visible gap between "Very" and "Not sure".
On narrow screens, allow sideways scrolling rather than squeezing the cells.

| ID                | Row label                                            |
| ----------------- | ---------------------------------------------------- |
| `b1_variables`    | Variables                                            |
| `b1_drawing`      | Drawing and drawing state (fill, stroke, background) |
| `b1_coordinates`  | Coordinates (100 × 100 canvas)                       |
| `b1_arithmetic`   | Arithmetic and expressions                           |
| `b1_conditionals` | Conditionals (`if`/`else`)                           |
| `b1_repeat`       | Repetition (`repeat`, nested grids)                  |
| `b1_functions`    | Functions (`func`, return)                           |
| `b1_random`       | Randomness and seeds                                 |
| `b1_debugging`    | Debugging (`print`, error messages)                  |

**B2.** _Think about the part of the workshop before AI was introduced._
Columns: Strongly disagree (`1`) / Disagree (`2`) / Agree (`3`) / Strongly agree (`4`) /
Can't say (`0`)

| ID                  | Statement                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `b2_focus`          | The small number of language features helped me focus on understanding programming concepts. |
| `b2_limits_blocked` | GIC's limits stopped me from making something I wanted to make.                              |
| `b2_code_image`     | I could tell how changes in my code changed the image.                                       |
| `b2_errors`         | Error messages helped me understand what went wrong.                                         |

`b3_simplicity_moment` _(open text)_: Describe one moment when GIC's simplicity helped
you or got in your way.

### Section C: Working with AI

_Didn't use any help? Skip to Section D._

`c1_*` _(checkboxes, booleans)_: Which kinds of help did you use at all?

| ID         | Label                                                                |
| ---------- | -------------------------------------------------------------------- |
| `c1_tutor` | GIC tutor (built-in agent)                                           |
| `c1_chat`  | External chat (ChatGPT, Claude.ai, Le Chat, …)                       |
| `c1_agent` | Coding agent working on your files (opencode, Claude Code, Codex, …) |
| `c1_human` | Help from Fabian or other participants                               |
| `c1_none`  | None                                                                 |

`c2_main_help` _(single choice)_: Which help did you use **most**?
Values: `tutor` / `chat` / `agent` / `human` / `none` (same labels as C1).

**C3.** _The following statements are about the help you chose in C2._
Columns: Strongly disagree (`1`) / Disagree (`2`) / Agree (`3`) / Strongly agree (`4`) /
Did not use (`0`)

| ID                    | Statement                                                   |
| --------------------- | ----------------------------------------------------------- |
| `c3_understand_why`   | It helped me understand why my code behaved the way it did. |
| `c3_own_thinking`     | I did most of the thinking myself.                          |
| `c3_accepted_unclear` | I accepted suggestions I did not fully understand.          |
| `c3_explain_code`     | I could explain my final code to someone else.              |
| `c3_learned_more`     | Compared to the part without AI, I learned more.            |

_If you did not use AI, you can skip the remaining questions in this section._

`c4_ai_situation` _(open text)_: Describe one suggestion you received from AI. What
did you do with it, and how did it affect your understanding?

`c5_*` _(checkboxes, booleans)_: During this workshop, what did you use AI help for?
_Select all that apply._

| ID              | Label                                             |
| --------------- | ------------------------------------------------- |
| `c5_hint`       | Get a hint about what to try next                 |
| `c5_understand` | Understand a programming concept or existing code |
| `c5_debug`      | Understand or fix an error                        |
| `c5_generate`   | Generate code                                     |
| `c5_modify`     | Change or extend existing code                    |
| `c5_explore`    | Explore different visual ideas or approaches      |
| `c5_other`      | Something else                                    |

`c6_ai_speed` _(single choice, integer rating)_: Using AI helped me make progress
on my sketch more quickly.

Options: Strongly disagree (`1`) / Disagree (`2`) / Agree (`3`) /
Strongly agree (`4`) / Can't say / did not use AI (`0`).

### Section D: Workshop and tool

`d1_pace`: The pace of the workshop was… Too slow (`1`) / Slightly slow (`2`) /
About right (`3`) / Slightly fast (`4`) / Too fast (`5`)

**D2.** Columns: Strongly disagree (`1`) / Disagree (`2`) / Agree (`3`) /
Strongly agree (`4`) / Can't say (`0`)

| ID                 | Statement                                     |
| ------------------ | --------------------------------------------- |
| `d2_explanations`  | The explanations were clear.                  |
| `d2_practice_time` | I had enough time to practise.                |
| `d2_editor`        | The GIC editor worked without major problems. |
| `d2_docs`          | The documentation and examples helped me.     |

`d3_continue`: Do you plan to keep programming after this workshop?
No → `no`; Maybe → `maybe`; Yes, with GIC → `yes_gic`; Yes, with another language or
tool → `yes_other`

`d4_keep` _(open text)_: What should stay the same?
`d5_change` _(open text)_: What should change first?

### Section E: Your wishes (optional)

> What would you like to be able to do in GIC, in the workshop or with the AI help?
> Add as many as you like.
>
> As a user I want to be able to [**********]
> so that [**********]
> [+ Add another]

- Two free-text fields per entry: `want` and `so_that`. No topic field.
- Leave the input fields empty or neutral. Do not add feature examples (for instance
  animation), because they bias answers.
- Ignore an entry if both fields are empty. Save it if only `so_that` is empty.
- Use a local `<template>` clone for "+ Add another", with a maximum of 20 entries.
- Without JavaScript, all 20 optional entries remain available.

### Coding conventions

- Store skipped items as `NULL`. The opt-out options ("Not sure", "Can't say", "Did
  not use") are stored as `0` and must be excluded from means during analysis.
- B2 `b2_limits_blocked` and C3 `c3_accepted_unclear` are negatively worded **on
  purpose**. Do not reverse-code them in storage.
- For each checkbox group (C1 and C5) independently, store all `NULL` if no
  checkbox in that group is selected; otherwise selected items are `1` and
  unselected items in that group are `0`. Do not infer a skipped answer as "None".

## 4. Data model

- `responses`: random UUID `id`, date-only `submitted_on`, `form_version`, `consent`
  (always integer 1), and one column per item in Sections A–D.
- `wishes`: random UUID `id`, `response_id` foreign key, integer `position`,
  `want` text, nullable `so_that` text.
- Validate coded values with server-side allowlists; write responses and wishes
  in one transaction. No participant identifier links responses.
- Record revised-form submissions as `form_version=v2`. On opening an existing
  database, transactionally add missing nullable question columns without
  rewriting existing responses or wishes.
- Existing `v1` rows retain their version and contain `NULL` for C5/C6. Their C4
  prompt was "Describe one situation where this help supported or hindered your
  learning." Interpret C4 by form version rather than treating both prompts as
  identical.

## 5. Application requirements

| Route               | Purpose                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /`             | Shared participant password gate                                                                            |
| `POST /login`       | Check password and issue signed HttpOnly, Secure, SameSite=Lax cookie with a server-enforced 12-hour expiry |
| `GET /form`         | Questionnaire, requires participant cookie                                                                  |
| `POST /submit`      | Validate and save, then 303 redirect to `/thanks`                                                           |
| `GET /thanks`       | Thank-you page, with no answers or response ID in the URL                                                   |
| `GET /admin/export` | Download one CSV per table, selected by `table=responses` or `table=wishes`; separate admin bearer secret   |
| `GET /health`       | Health check                                                                                                |

- Ordinary HTML form submissions work without JavaScript. Invalid submissions
  render the questionnaire with answers preserved and clear errors.
- Require consent; validate every coded value; reject unknown or duplicate scalar
  fields. Escape all user text in HTML.
- Hidden honeypot: silently discard filled submissions while returning success.
- Limits: 20 wishes, 500 characters per wish field, 2,000 per open answer, 64 KiB
  request body. A wish containing only `so_that` is preserved rather than discarded.
- Disable submission during navigation with local JavaScript; restore it on
  back/forward navigation. Anonymous duplicates cannot reliably be deduplicated.
- `FORM_OPEN=false` closes submissions.
- Reject cross-origin form posts; do not enable CORS.

### Privacy requirements

- Never store or log IP addresses, `X-Forwarded-For`, user agents, fingerprints,
  passwords, cookies, bearer secrets, or response bodies.
- No request logger, analytics, third-party scripts, remote fonts, or CDNs.
- Only date-level response timestamps. Prevent caching of private pages and exports.
- Configuration: `PARTICIPANT_PASSWORD`, `ADMIN_SECRET`, `COOKIE_SECRET`, `FORM_OPEN`,
  `DB_PATH`; use the repository's pinned Node toolchain.
- Serve the shared style package and fonts locally, not a copied token definition.

### CSV export

UTF-8, header row with database column/item IDs; one CSV per table. Quote CSV
cells correctly and protect spreadsheet formulas beginning with `=`, `+`, `-`,
or `@`, including after leading whitespace, by prefixing `'`. Exports contain
raw participant text and must remain private.

## 6. Deployment

- Non-root Dockerfile with monorepo-root build context; Compose for Coolify.
- Use an absolute host bind mount such as `/srv/gic-feedback:/data`.
  Fabian creates the host directory and grants the container user write access.
  Mount the directory, not just the SQLite file.
- The reported Coolify volume-renaming issue concerns pre-existing Docker volumes
  declared `external: true`; it does not imply host bind mounts lack persistence.
- Enable SQLite WAL; mount the database, `-wal`, and `-shm` together.
- Serve behind HTTPS. Audit Traefik access logging and any other proxies to ensure
  the feedback host does not log identifiers. Application behavior cannot establish
  privacy at the proxy layer.
- Back up using `VACUUM INTO` or SQLite's backup API, not a live raw file copy.
- Deployment and real-data collection require Fabian's approval and supplied secrets.

## 7. Verification

Use TDD: write failing behavior tests before implementing each slice.

HTTP-level tests through Hono with real temporary SQLite databases must cover:

- Password gate, wrong passwords, missing/tampered/expired cookies.
- Full and consent-only submissions and persistence after database reopening.
- Missing consent, invalid coded values, duplicate/unknown fields.
- Honeypot discard, wish limits, empty wishes, text and body limits.
- Participant credentials cannot export; admin secret can.
- CSV quoting and formula neutralization.
- Date-only rows with no request metadata; atomic response/wish insertion.
- Closed form, cross-origin rejection, escaped and preserved validation answers.

Playwright must exercise the real app: login, questionnaire and B1 grid, wish
addition, submission, no-JavaScript submission, local fonts/styles, and portrait
tablet layout. Type-check the app separately; run repository lint and formatting.

Before collecting data, Fabian must verify:

- Inspect bind mount, submit a test row, redeploy, confirm persistence.
- Audit Traefik, application, Coolify, and backup privacy.
- Pilot with a non-participant on a portrait tablet; target 10 minutes or less.
  If longer, propose cutting D5, then B3; require approval before changing wording.
- Verify QR code and link on venue network; remove pilot rows or use a separate version.

## 8. Out of scope

Changes to GIC itself, Google Forms, custom accessibility work, branching logic,
user accounts, email collection, dashboards, pre/post measures, comprehension
tests, or publishing raw data.

## 9. Open questions

Ask Fabian one at a time, with a recommendation:

1. **Deadline:** final session date/time; deploy and pilot before that.
2. **Institutional check:** does the supervisor or FH Potsdam require consent
   wording or a data-protection review? Do not assume compliance or change the intro.

These are deployment/research gates, not reasons to delay local implementation.

## 10. Work sequence

1. Record agreed decisions and create the git-bug implementation issue.
2. Test and implement questionnaire validation and transactional storage.
3. Test and implement Hono routes, authentication, exports, and server-rendered form.
4. Reuse shared styles and test the real browser workflow.
5. Add and validate container packaging and deployment instructions.
6. Run quality gates, record remaining operational checks, commit, and push the branch.
7. Deploy only after approval; run persistence, logging, pilot, and venue checks.
