#!/usr/bin/env bash
set -euo pipefail
cd ../..
bun run db:check
export NITRO_PRESET=vercel
# Every commit misses the cache, and the output exceeds the remote cache's
# upload limit (413): writing it only cost ~15 s per deploy.
turbo run build --filter=dashboard --cache=remote:r
bun apps/dashboard/scripts/prune-build-cache.ts
if [ "${VERCEL_ENV:-}" = "production" ]; then
  # Deployments whose runtime role cannot run DDL (the public demo runs as a
  # data-only role) pass the owner connection separately for migrations.
  DATABASE_URL="${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}" bun run db:migrate
  if [ -n "${TINYBIRD_TOKEN:-}" ] && [ -n "${TINYBIRD_BASE_URL:-}" ]; then
    (cd packages/analytics && bun run tinybird:deploy)
  fi
fi
