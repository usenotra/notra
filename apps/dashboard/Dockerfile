# Self-hosted dashboard image (used by the public demo on Railway).
# Build context is the monorepo root:
#   docker build -f apps/dashboard/Dockerfile -t notra-dashboard .
# Run a single instance: Vercel Workflow's local world keeps run state on disk.
FROM oven/bun:1.4.0-slim AS bun

FROM node:24.11.1-bookworm-slim AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx
WORKDIR /app

FROM base AS builder
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

# NEXT_PUBLIC_* values are inlined at build time; the demo flag decides
# which routes prerender, so the build must see the runtime value.
ARG NOTRA_DEMO_MODE
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_NOTRA_DEMO_MODE
ARG NEXT_PUBLIC_NOTRA_DEMO_API_URL
ARG WORKFLOW_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN bunx turbo run build --filter=dashboard

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder /app /app
WORKDIR /app/apps/dashboard
EXPOSE 3000
CMD ["sh", "-c", "exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT}"]
