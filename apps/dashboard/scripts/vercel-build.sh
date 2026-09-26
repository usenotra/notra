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
echo "=== CACHE REPORT"
du -sh node_modules apps/dashboard/.next/cache apps/dashboard/.next/cache/* .turbo ~/.bun/install/cache ~/.cache 2>/dev/null || true
du -sm node_modules/.bun/* | sort -n | tail -30
ls node_modules/.bun | wc -l
