<!-- ABOUTME: Explains how to run and deploy the anonymous workshop feedback app. -->
<!-- ABOUTME: Covers private data handling, persistent storage, and operator release gates. -->

# Run and deploy workshop feedback

The feedback app runs separately from the GiC editor and website. These steps
target the VPS/Coolify operator. Deployment and real-data collection require
Fabian's approval; a passing local test suite is not that approval.

## 1. Verify locally

Use the toolchain in `mise.toml`, from the repository root:

```sh
mise install
pnpm install --frozen-lockfile
pnpm test:feedback
pnpm typecheck:feedback
pnpm test:feedback:e2e
```

The HTTP tests use temporary real SQLite databases. The browser tests start the
real server on port 4174 with synthetic credentials, covering Chromium and
Firefox on desktop and portrait-tablet viewports, including JavaScript-disabled
submission. Browser artifacts contain test answers; never run these tests
against a collection database.

For local interactive use, supply three distinct environment variables through
your shell or secret manager: `PARTICIPANT_PASSWORD`, `ADMIN_SECRET`, and
`COOKIE_SECRET`. Generate the admin and cookie secrets independently with a
cryptographic generator; each must contain at least 32 characters. Never commit
secrets, paste them into issue comments, or use production secrets for tests.

```sh
FORM_OPEN=true \
DB_PATH="$PWD/apps/feedback/data/local.sqlite" \
HOST=127.0.0.1 \
pnpm dev:feedback
```

Open `http://localhost:3000`. Secure cookies remain enabled; localhost is suitable
for local browser verification, but remote access requires HTTPS. `DB_PATH` is
required. `HOST` defaults to `0.0.0.0`, `PORT` to `3000`, and submissions remain
closed unless `FORM_OPEN=true`. Restart after changing environment settings.

## 2. Prepare the host and Coolify service

1. Before deployment, confirm the workshop deadline and whether the supervisor or
   FH Potsdam requires a consent or data-protection review. The implementation
   does not establish institutional compliance.
2. On the VPS, create `/srv/gic-feedback`, owned by UID/GID `1000:1000`, with
   mode `0700`. The container runs as the image's `node` user. Confirm this
   ownership matches the host's Docker user-namespace configuration.
3. Configure Coolify to use
   [`apps/feedback/compose.yaml`](../apps/feedback/compose.yaml) on the approved
   feature commit. Its build context is the monorepo root and its Dockerfile is
   [`apps/feedback/Dockerfile`](../apps/feedback/Dockerfile).
4. Supply the three secrets in Coolify's runtime environment, not build
   arguments. Start with `FORM_OPEN=false`.
5. Route `https://feedback.giclang.cc` to the service's internal port 3000.
   Do not publish the backend port to the internet. The trusted proxy must
   preserve `Host` and overwrite `X-Forwarded-Proto` with the external scheme.
   POSTs require an exact matching Origin; missing, opaque, and cross-origin
   requests are rejected.
6. Check `/health` and the closed-form page. The Compose service has a
   read-only root filesystem; `/data` is the writable host bind mount.

Mount the directory, not only the database file. SQLite uses WAL mode, so
`feedback.sqlite`, `feedback.sqlite-wal`, and `feedback.sqlite-shm` must remain
together. Do not replace this bind mount with an ephemeral container directory.

## 3. Complete the operational gates

Before collecting responses:

1. Audit Traefik, any upstream proxy/CDN, Coolify, application, and backup logs.
   Disable access logging for this host and any header/body capture that records
   IP addresses, user agents, passwords, cookies, bearer secrets, or answers.
   Application tests cannot establish proxy privacy.
2. Use a separate pilot database. Open the form, submit a test response, inspect
   the actual mount, replace the container, and verify the response still exists
   in a private export. Local Docker replacement tests do not replace this VPS
   check.
3. Pilot with a non-participant on a portrait tablet. Target ten minutes or less.
   The questionnaire is frozen: propose cuts to D5, then B3 if needed, but make
   no wording changes without Fabian's approval.
4. Verify the projected link and QR code on the venue network. Keep pilot rows
   out of the collection database.
5. With approval, set `FORM_OPEN=true` and redeploy. Set it to `false` and
   redeploy to close submissions, including for already authenticated browsers.

## 4. Export privately

Participants cannot export. Supply `ADMIN_SECRET` locally through your secret
manager and run this in a private directory outside the repository:

```sh
umask 077
printf 'Authorization: Bearer %s\n' "$ADMIN_SECRET" |
  curl --fail --silent --show-error --header @- \
    'https://feedback.giclang.cc/admin/export?table=responses' \
    --output responses.csv
printf 'Authorization: Bearer %s\n' "$ADMIN_SECRET" |
  curl --fail --silent --show-error --header @- \
    'https://feedback.giclang.cc/admin/export?table=wishes' \
    --output wishes.csv
```

Keep both CSVs private. They contain participant text, even though spreadsheet
formula prefixes are neutralized. Publish only aggregates and anonymised quotes,
never the raw files.

Skipped answers export as empty cells. Rating opt-outs export as `0`; exclude
them from means. Negatively worded items are not reverse-coded in storage.
Unanswered C1 checkboxes are all `NULL`; once one is selected, the others are
`0`. Responses carry a random UUID, UTC date only, and `form_version=v1`.
Wishes link to the response with a one-based position. These IDs do not identify
participants and are never returned in submission URLs.

## 5. Back up consistently

Use SQLite's backup API or `VACUUM INTO`, not a live raw-file copy. For example,
from the deployed checkout, create a snapshot at an unused destination:

```sh
docker compose -f apps/feedback/compose.yaml exec -T feedback \
  node --input-type=module -e "
    import { DatabaseSync } from 'node:sqlite';
    process.umask(0o077);
    const db = new DatabaseSync(process.env.DB_PATH);
    db.prepare('VACUUM INTO ?').run('/data/backup.sqlite');
    db.close();
  "
```

`VACUUM INTO` refuses to overwrite an existing nonempty backup. Transfer the
completed snapshot to access-controlled backup storage and verify restoration
before relying on it. Apply the same privacy and retention rules to backups as
to the live database. Raw data is retained indefinitely under the frozen consent
wording; never promise per-participant deletion for anonymous submissions.
