# ABOUTME: Packages the feedback app and its workspace-owned styles for Node.
# ABOUTME: Runs without root privileges and keeps SQLite data outside the image.
FROM node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73 AS dependencies

WORKDIR /app
RUN npm install --global --allow-scripts=pnpm pnpm@12.5.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/styles/package.json ./packages/styles/package.json
COPY apps/feedback/package.json ./apps/feedback/package.json
RUN pnpm install --prod --frozen-lockfile --filter @giclang/feedback...

FROM node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DB_PATH=/data/feedback.sqlite FORM_OPEN=false
COPY --from=dependencies /app /app
COPY packages/styles ./packages/styles
COPY apps/feedback/src ./apps/feedback/src
COPY apps/feedback/views ./apps/feedback/views
COPY apps/feedback/public ./apps/feedback/public
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
	CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/feedback/src/main.ts"]
