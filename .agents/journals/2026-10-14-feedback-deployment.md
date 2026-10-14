<!-- ABOUTME: Records diagnosis and validation of the feedback Compose build context. -->
<!-- ABOUTME: Preserves the Coolify project-directory requirement and deployment limits. -->

# Feedback deployment context

- [decision] Fabian explicitly authorized the context fix directly on `main`.
- [lesson] Coolify passes the checkout root as Compose's `--project-directory`,
  which also sets the base for relative build contexts. Feedback uses context
  `.` and `apps/feedback/Dockerfile`; local commands must explicitly select the
  monorepo root with `--project-directory .`.
- [technique] Before editing, Compose configuration with the repository-root
  project directory resolved `../..` outside the checkout. After editing, the
  resolved context equals the repository root. Both the absolute Coolify-style
  command and the documented env-file command pass configuration validation.
- [technique] A real Compose image build, repository lint, changed-file
  formatting, and diff whitespace checks pass. No application behavior changed;
  declarative configuration was validated directly rather than with file-content
  tests. No container was started and no production deployment was performed.
- [risk] Coolify's supplied log passes runtime secrets as build arguments.
  Remove their build-time availability in Coolify; this is an operator setting,
  not a Dockerfile requirement. VPS persistence and privacy gates remain open
  under `b94f288`.
