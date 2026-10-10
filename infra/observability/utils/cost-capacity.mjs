export function costCapacityStreams(count, capacity) {
  const entries = Array.from({ length: count }, (_, index) => ({
    ageSeconds: capacity
      ? 30 + Math.floor(((count - index - 1) * 6 * 86400) / count)
      : 120,
    line: JSON.stringify({
      event: "ai.cost.reported",
      organizationId: index < count / 2 ? "org_capacity_a" : "org_capacity_b",
      costId: `capacity:${index}`,
      gatewayCostUsd: 0.5,
      byokInferenceCostUsd: 1,
      costUsd: 1.5,
    }),
  }));
  entries.push(
    ...entries.slice(0, 100).map((entry) => ({ ...entry, ageSeconds: 10 }))
  );
  // Hour buckets keep six-day ingestion within Loki's out-of-order allowance.
  const hours = new Map();
  for (const entry of entries) {
    const hour = capacity ? Math.floor(entry.ageSeconds / 3600) : 0;
    if (!hours.has(hour)) {
      hours.set(hour, []);
    }
    hours.get(hour).push(entry);
  }
  return [...hours]
    .sort(([a], [b]) => b - a)
    .map(([hour, records]) => ({
      labels: {
        service_name: "notra-capacity-fixtures",
        deployment_environment_name: "capacity",
        fixture_hour: String(hour),
      },
      entries: records,
    }));
}
