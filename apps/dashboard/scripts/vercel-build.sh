#!/usr/bin/env bash
set -euo pipefail
cd ../..
bun run db:check
TURBO_TASKS_AVAILABLE_PARALLELISM=$(bash apps/dashboard/scripts/turbopack-parallelism.sh)
export TURBO_TASKS_AVAILABLE_PARALLELISM
turbo run build --filter=dashboard
bun apps/dashboard/scripts/prune-build-cache.ts
if [ "${VERCEL_ENV:-}" = "production" ]; then
  # Deployments whose runtime role cannot run DDL (the public demo runs as a
  # data-only role) pass the owner connection separately for migrations.
  DATABASE_URL="${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}" bun run db:migrate
  if [ -n "${TINYBIRD_TOKEN:-}" ] && [ -n "${TINYBIRD_BASE_URL:-}" ]; then
    (cd packages/analytics && bun run tinybird:deploy)
  fi
fi
