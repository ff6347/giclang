# ABOUTME: Builds the GIC browser application without Railpack or mise.
# ABOUTME: Serves the production PWA from a minimal Caddy runtime image.
FROM node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73 AS build

WORKDIR /app

RUN npm install --global --allow-scripts=pnpm pnpm@12.3.4

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/cli/package.json ./packages/cli/package.json
COPY packages/content/package.json ./packages/content/package.json
COPY apps/editor/package.json ./apps/editor/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json
RUN pnpm install --frozen-lockfile

COPY packages/core ./packages/core
COPY packages/content ./packages/content
COPY apps/editor ./apps/editor

RUN pnpm run build:browser

FROM caddy:2.10.2-alpine@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/editor/dist /srv

EXPOSE 80
