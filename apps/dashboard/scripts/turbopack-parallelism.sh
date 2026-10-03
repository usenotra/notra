#!/usr/bin/env bash
# Prints a Turbopack thread count (TURBO_TASKS_AVAILABLE_PARALLELISM) that fits
# the build machine's memory. Measured on the dashboard: peak memory is ~4.8 GB
# plus ~0.85 GB per thread. This keeps ~1.5 GB headroom, never goes below 2
# threads (~6.4 GB, fine on an 8 GB machine) and leaves one core for Node.
set -euo pipefail

# Containers can report the host's RAM in /proc/meminfo, so prefer the cgroup limit.
total_mem_mb=$(awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo)
for limit_file in /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory/memory.limit_in_bytes; do
  limit=$(cat "$limit_file" 2>/dev/null || true)
  if [[ "$limit" =~ ^[0-9]+$ ]] && [ "$((limit / 1048576))" -lt "$total_mem_mb" ]; then
    total_mem_mb=$((limit / 1048576))
  fi
done

cores=$(nproc)
threads=$(((total_mem_mb - 6300) / 850))
if [ "$threads" -gt "$((cores - 1))" ]; then
  threads=$((cores - 1))
fi
if [ "$threads" -lt 2 ]; then
  threads=2
fi

echo "Turbopack parallelism ${threads} (${total_mem_mb} MB, ${cores} cores)" >&2
echo "$threads"
