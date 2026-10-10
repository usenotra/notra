import { parseArgs } from "node:util";

import type { GatewaySpendRow } from "./ai-cost/types/gateway-spend";
import { summarizeGatewaySpend } from "./ai-cost/utils/gateway-spend";

const { values } = parseArgs({
  options: {
    "api-key-id": { type: "string" },
    start: { type: "string" },
    end: { type: "string" },
    "user-id": { type: "string" },
    tag: { type: "string", multiple: true },
  },
});

const apiKeyId = values["api-key-id"];
const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
if (!apiKeyId || !apiKey || !values.start || !values.end) {
  throw new Error(
    "Usage: AI_GATEWAY_API_KEY=<report-auth-key> bun scripts/report-ai-usage.ts --api-key-id <stable-Upstash-key-id> --start YYYY-MM-DD --end YYYY-MM-DD [--user-id org] [--tag feature:geo-scan-grounded] [--tag runId:id]. Dates are inclusive UTC. No team-wide default."
  );
}
for (const date of [values.start, values.end]) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Dates must be valid YYYY-MM-DD values.");
  }
}
if (values.start > values.end) {
  throw new Error("Start date must not follow end date.");
}

const reportQuery = new URLSearchParams({
  api_key_id: apiKeyId,
  start_date: values.start,
  end_date: values.end,
});

async function report(
  groupBy: "model" | "tag" | "user"
): Promise<GatewaySpendRow[]> {
  const query = new URLSearchParams(reportQuery);
  query.set("group_by", groupBy);
  if (values["user-id"]) {
    query.set("user_id", values["user-id"]);
  }
  if (values.tag?.length) {
    query.set("tags", values.tag.join(","));
    query.set("tags_match", "all");
  }
  const response = await fetch(
    `https://ai-gateway.vercel.sh/v1/report?${query}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    // Do not print response bodies, authorization headers or credentials.
    throw new Error(
      `Gateway ${groupBy} report failed: HTTP ${response.status}`
    );
  }
  const data = (await response.json()) as { results?: GatewaySpendRow[] };
  if (
    !Array.isArray(data.results) ||
    data.results.some(
      (row) =>
        !row ||
        !Number.isFinite(row.total_cost) ||
        row.total_cost < 0 ||
        !Number.isSafeInteger(row.request_count) ||
        row.request_count < 0 ||
        (row[groupBy] != null && typeof row[groupBy] !== "string")
    )
  ) {
    throw new Error(
      `Gateway ${groupBy} report has missing/invalid costs or counts.`
    );
  }
  return data.results;
}

const [models, tags, organizations] = await Promise.all([
  report("model"),
  report("tag"),
  report("user"),
]);
console.log(
  JSON.stringify(
    {
      scope: {
        apiKeyId,
        startDate: values.start,
        endDate: values.end,
        organizationId: values["user-id"],
        tags: values.tag,
        dates: "inclusive UTC",
      },
      ...summarizeGatewaySpend({ models, tags, organizations }),
    },
    null,
    2
  )
);
