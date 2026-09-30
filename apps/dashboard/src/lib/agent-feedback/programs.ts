import { AGENT_FEEDBACK_STATUSES } from "@notra/db/constants/agent-feedback";
import { db } from "@notra/db/drizzle";
import { agentFeedback } from "@notra/db/schema";
import type { AgentFeedbackStatus } from "@notra/db/types/agent-feedback";
import { and, count, desc, eq, lt, or, sql } from "drizzle-orm";
import { Effect } from "effect";

import { agentFeedbackDb } from "@/lib/agent-feedback/effect";
import { AgentFeedbackNotFoundError } from "@/lib/agent-feedback/errors";
import {
  decodeAgentFeedbackCursor,
  encodeAgentFeedbackCursor,
  toAgentFeedbackItem,
} from "@/lib/agent-feedback/mappers";
import type {
  AgentFeedbackDeleteInput,
  AgentFeedbackItem,
  AgentFeedbackListInput,
  AgentFeedbackListResponse,
  AgentFeedbackUpdateStatusInput,
} from "@/types/agent-feedback";

function emptyCounts(): Record<AgentFeedbackStatus, number> {
  const counts = {} as Record<AgentFeedbackStatus, number>;
  for (const status of AGENT_FEEDBACK_STATUSES) {
    counts[status] = 0;
  }
  return counts;
}

const countAgentFeedback = Effect.fn("agentFeedback.counts")(function* (
  organizationId: string
) {
  const rows = yield* agentFeedbackDb("counts", () =>
    db
      .select({ status: agentFeedback.status, total: count() })
      .from(agentFeedback)
      .where(eq(agentFeedback.organizationId, organizationId))
      .groupBy(agentFeedback.status)
  );

  const counts = emptyCounts();
  for (const row of rows) {
    counts[row.status] = row.total;
  }
  return counts;
});

export const listAgentFeedback = Effect.fn("agentFeedback.list")(function* (
  input: AgentFeedbackListInput
) {
  const limit = input.limit ?? 50;
  const cursor = input.cursor ? decodeAgentFeedbackCursor(input.cursor) : null;
  const conditions = [eq(agentFeedback.organizationId, input.organizationId)];
  if (input.status) {
    conditions.push(eq(agentFeedback.status, input.status));
  }
  if (input.kind) {
    conditions.push(eq(agentFeedback.kind, input.kind));
  }
  if (cursor) {
    const cursorCondition = or(
      lt(agentFeedback.createdAt, cursor.createdAt),
      and(
        eq(agentFeedback.createdAt, cursor.createdAt),
        lt(agentFeedback.id, cursor.id)
      )
    );
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }
  }

  // Counts drive the status tabs, which only read the first page, so later
  // pages skip the aggregate. Both queries run concurrently.
  const [rows, counts] = yield* Effect.all(
    [
      agentFeedbackDb("list", () =>
        db
          .select()
          .from(agentFeedback)
          .where(and(...conditions))
          .orderBy(desc(agentFeedback.createdAt), desc(agentFeedback.id))
          .limit(limit + 1)
      ),
      cursor ? Effect.succeed(null) : countAgentFeedback(input.organizationId),
    ],
    { concurrency: "unbounded" }
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);

  const response: AgentFeedbackListResponse = {
    items: pageRows.map(toAgentFeedbackItem),
    nextCursor: hasMore && last ? encodeAgentFeedbackCursor(last) : null,
    counts,
  };
  return response;
});

export const updateAgentFeedbackStatus = Effect.fn(
  "agentFeedback.updateStatus"
)(function* (input: AgentFeedbackUpdateStatusInput) {
  const [updated] = yield* agentFeedbackDb("updateStatus", () =>
    db
      .update(agentFeedback)
      .set({
        status: input.status,
        resolvedAt: input.status === "resolved" ? sql`now()` : sql`null`,
      })
      .where(
        and(
          eq(agentFeedback.organizationId, input.organizationId),
          eq(agentFeedback.id, input.feedbackId)
        )
      )
      .returning()
  );

  if (!updated) {
    return yield* Effect.fail(
      new AgentFeedbackNotFoundError({ feedbackId: input.feedbackId })
    );
  }

  const item: AgentFeedbackItem = toAgentFeedbackItem(updated);
  return item;
});

export const deleteAgentFeedback = Effect.fn("agentFeedback.delete")(function* (
  input: AgentFeedbackDeleteInput
) {
  const [deleted] = yield* agentFeedbackDb("delete", () =>
    db
      .delete(agentFeedback)
      .where(
        and(
          eq(agentFeedback.organizationId, input.organizationId),
          eq(agentFeedback.id, input.feedbackId)
        )
      )
      .returning({ id: agentFeedback.id })
  );

  if (!deleted) {
    return yield* Effect.fail(
      new AgentFeedbackNotFoundError({ feedbackId: input.feedbackId })
    );
  }

  return { success: true as const };
});
