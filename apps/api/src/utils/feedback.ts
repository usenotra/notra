import { organizations } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import type { Context } from "hono";

import type { FeedbackDatabaseError } from "../errors/feedback";
import { isIngestAuth } from "../types/auth";
import type {
  AgentFeedbackRow,
  FeedbackDomainError,
  SerializedAgentFeedback,
} from "../types/feedback";

const PUBLIC_FEEDBACK_INGEST_PATH_REGEX = /^\/v1\/feedback\/[^/]+\/?$/;

export function serializeFeedback(
  row: AgentFeedbackRow
): SerializedAgentFeedback {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

export function getIngestProjectId(c: Context): string | null | undefined {
  const auth = c.get("auth");
  return auth && isIngestAuth(auth) ? auth.projectId : undefined;
}

export function isPublicFeedbackIngestRequest(
  pathname: string,
  method: string
): boolean {
  return method === "POST" && PUBLIC_FEEDBACK_INGEST_PATH_REGEX.test(pathname);
}

export async function findOrganizationIdBySlug(
  c: Context,
  slug: string
): Promise<string | null> {
  const organization = await c.get("db").query.organizations.findFirst({
    columns: { id: true },
    where: eq(organizations.slug, slug.toLowerCase()),
  });
  return organization?.id ?? null;
}

/** Leave unexpected database errors to Hono's central error handler. */
export function runFeedbackProgram<A, E extends FeedbackDomainError>(
  program: Effect.Effect<A, E | FeedbackDatabaseError>
) {
  return Effect.runPromise(
    Effect.result(
      program.pipe(
        Effect.catchTag("FeedbackDatabaseError", (failure) =>
          Effect.die(failure.cause)
        )
      )
    )
  );
}
