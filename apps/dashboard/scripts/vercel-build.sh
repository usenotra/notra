#!/usr/bin/env bash
set -euo pipefail
cd ../..
echo "=== PRE REPORT"
du -sh node_modules apps/dashboard/.next/cache/* 2>/dev/null || true
ls apps/dashboard/.next/cache/turbopack/* 2>/dev/null | head -5; find apps/dashboard/.next/cache/turbopack -type f 2>/dev/null | wc -l
if [ "${VERCEL_ENV:-}" = "production" ]; then
  bun run db:migrate
  if [ -n "${TINYBIRD_TOKEN:-}" ] && [ -n "${TINYBIRD_BASE_URL:-}" ]; then
    (cd packages/analytics && bun run tinybird:deploy)
  fi
fi
turbo run build --filter=dashboard
echo "=== CACHE REPORT"
du -sh node_modules apps/dashboard/.next/cache apps/dashboard/.next/cache/* .turbo ~/.bun/install/cache ~/.cache 2>/dev/null || true
du -sm node_modules/.bun/* | sort -n | tail -8
find apps/dashboard/.next/cache/turbopack -type f | wc -l; du -sh apps/dashboard/.next/cache/turbopack/*
ls node_modules/.bun | wc -l
