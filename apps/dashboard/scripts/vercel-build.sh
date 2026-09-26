#!/usr/bin/env bash
set -euo pipefail
cd ../..
if [ "${VERCEL_ENV:-}" = "production" ]; then
  bun run db:migrate
  if [ -n "${TINYBIRD_TOKEN:-}" ] && [ -n "${TINYBIRD_BASE_URL:-}" ]; then
    (cd packages/analytics && bun run tinybird:deploy)
  fi
fi
turbo run build --filter=dashboard
bun apps/dashboard/scripts/prune-build-cache.ts
