import "@tanstack/react-start/server-only";
import { db } from "@notra/db/drizzle";
import { agentFeedback } from "@notra/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import type {
  AgentFeedbackActivityData,
  AgentFeedbackActivityRange,
} from "@/types/agent-feedback";
import {
  activityDayCount,
  buildAgentFeedbackActivity,
} from "@/utils/agent-feedback-activity";

const DAY_MS = 86_400_000;

/** Feedback per UTC day between `from` and `to`, both inclusive. */
export async function getAgentFeedbackActivity(
  organizationId: string,
  { from, to }: AgentFeedbackActivityRange
): Promise<AgentFeedbackActivityData> {
  const windowStart = new Date(`${from}T00:00:00Z`);
  const windowEnd = new Date(Date.parse(`${to}T00:00:00Z`) + DAY_MS);
  const day = sql<string>`to_char(${agentFeedback.createdAt}, 'YYYY-MM-DD')`;

  const dailyCounts = await db
    .select({
      day,
      count: sql<number>`count(*)::int`,
    })
    .from(agentFeedback)
    .where(
      and(
        eq(agentFeedback.organizationId, organizationId),
        gte(agentFeedback.createdAt, windowStart),
        lt(agentFeedback.createdAt, windowEnd)
      )
    )
    .groupBy(day);

  return buildAgentFeedbackActivity(
    dailyCounts,
    windowStart,
    activityDayCount(from, to)
  );
}
