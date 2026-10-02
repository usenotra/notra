#!/usr/bin/env bash
set -euo pipefail
cd ../..
bun run db:check
# Turbopack's peak memory grows ~0.85 GB per thread on top of ~4.8 GB. On the
# standard 4-core / 8 GB machine full parallelism peaks at ~7.4 GB (OOM-prone);
# two threads stay at ~6.4 GB. Larger machines keep one core for Node.
# Containers can report the host's RAM in /proc/meminfo, so prefer the cgroup limit.
total_mem_mb=$(awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo)
for limit_file in /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory/memory.limit_in_bytes; do
  limit=$(cat "$limit_file" 2>/dev/null || true)
  if [[ "$limit" =~ ^[0-9]+$ ]] && [ "$((limit / 1048576))" -lt "$total_mem_mb" ]; then
    total_mem_mb=$((limit / 1048576))
  fi
done
if [ "$total_mem_mb" -lt 12288 ]; then
  TURBO_TASKS_AVAILABLE_PARALLELISM=2
else
  TURBO_TASKS_AVAILABLE_PARALLELISM=$(($(nproc) - 1))
fi
export TURBO_TASKS_AVAILABLE_PARALLELISM
echo "Turbopack parallelism ${TURBO_TASKS_AVAILABLE_PARALLELISM} (${total_mem_mb} MB, $(nproc) cores)"
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
