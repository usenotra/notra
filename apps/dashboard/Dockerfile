# Self-hosted dashboard image (used by the public demo on Railway).
# Build context is the monorepo root:
#   docker build -f apps/dashboard/Dockerfile -t notra-dashboard .
# Run a single instance: Vercel Workflow's local world keeps run state on disk.
# The image ships Next's standalone output (~300 MB) instead of the whole
# monorepo; the full tree is several GB and stalls the registry push.
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
ENV NEXT_OUTPUT_STANDALONE=1
RUN bunx turbo run build --filter=dashboard

# Migrations run from a single bundled script (drizzle-orm's migrator, built
# from the frozen install above), so the image needs no drizzle-kit.
FROM builder AS migrator
RUN mkdir -p /migrate \
  && bun build packages/db/src/scripts/migrate.ts --target=node \
    --external pg-native --outfile=/migrate/migrate.mjs \
  && cp -r packages/db/migrations /migrate/migrations \
  && printf '#!/bin/sh\nset -e\nexec node /migrate/migrate.mjs /migrate/migrations\n' > /migrate/run.sh \
  && chmod +x /migrate/run.sh

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder /app/apps/dashboard/.next/standalone /app
COPY --from=builder /app/apps/dashboard/.next/static /app/apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public /app/apps/dashboard/public
COPY --from=migrator /migrate /migrate
WORKDIR /app/apps/dashboard
EXPOSE 3000
# The container runtime sets HOSTNAME to its own id; bind every interface.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
