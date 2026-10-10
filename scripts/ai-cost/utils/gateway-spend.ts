import type {
  GatewaySpendReports,
  GatewaySpendRow,
} from "../types/gateway-spend";

export function summarizeGatewaySpend(reports: GatewaySpendReports) {
  const total = (rows: GatewaySpendRow[]) =>
    rows.reduce(
      (sum, row) => ({
        costUsd: sum.costUsd + row.total_cost,
        requests: sum.requests + row.request_count,
      }),
      { costUsd: 0, requests: 0 }
    );
  const overall = total(reports.models);
  // Correlation/legacy tags overlap. Only the single canonical feature tag is
  // additive; never add the full group_by=tag response to calculate spend.
  const features = reports.tags.filter(
    (row) => row.tag?.startsWith("feature:") && row.tag !== "feature:other"
  );
  const assigned = total(features);
  const complete = total(
    reports.tags.filter((row) => row.tag === "attribution:complete")
  );
  const organizationTotals = total(reports.organizations);
  const missingOrganization = total(
    reports.organizations.filter((row) => !row.user)
  );
  if (
    assigned.requests > overall.requests ||
    complete.requests > overall.requests ||
    complete.costUsd > overall.costUsd + 0.000001 ||
    assigned.costUsd > overall.costUsd + 0.000001 ||
    organizationTotals.requests !== overall.requests ||
    Math.abs(organizationTotals.costUsd - overall.costUsd) > 0.000001
  ) {
    throw new Error(
      "Reports do not reconcile: overlapping feature tags or inconsistent reporting snapshots."
    );
  }
  return {
    total: overall,
    fullyAttributed: complete,
    incompletelyAttributed: {
      costUsd: Math.max(0, overall.costUsd - complete.costUsd),
      requests: overall.requests - complete.requests,
    },
    byFeature: features,
    unassignedFeature: {
      costUsd: Math.max(0, overall.costUsd - assigned.costUsd),
      requests: overall.requests - assigned.requests,
    },
    byOrganization: reports.organizations,
    missingOrganization,
    byModel: reports.models,
    // Retained for historical investigation; multiple legacy tags can overlap.
    legacyTags: reports.tags.filter((row) => !row.tag?.includes(":")),
    // These rows are drilldowns, NOT an additive partition of total spend.
    correlationTags: reports.tags.filter((row) =>
      /^(runId|scanId|sessionId|turnId|chatId|requestId):/.test(row.tag ?? "")
    ),
  };
}
