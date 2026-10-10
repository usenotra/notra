import { beforeEach, describe, expect, mock, test } from "bun:test";

import type {
  AgentFeedbackClassification,
  ClassifyAgentFeedbackParams,
} from "@notra/ai/types/feedback-classifier";
import { PgDialect } from "drizzle-orm/pg-core";
import { Effect } from "effect";

import { FeedbackProjectNotFoundError } from "../src/errors/feedback";
import { listFeedback, submitFeedback } from "../src/programs/feedback";
import type { AgentFeedbackRow } from "../src/types/feedback";

const classify = mock(
  async (
    _params: ClassifyAgentFeedbackParams
  ): Promise<AgentFeedbackClassification | null> => ({
    kind: "bug" as const,
    sentiment: "negative" as const,
    title: "Classified title",
  })
);
mock.module("@notra/ai/jobs/feedback-classifier", () => ({
  classifyAgentFeedback: classify,
}));

beforeEach(() => classify.mockClear());

const now = new Date("2026-01-01T00:00:00.000Z");

function feedbackRow(
  overrides: Partial<AgentFeedbackRow> = {}
): AgentFeedbackRow {
  return {
    id: "fb_existing",
    organizationId: "org_a",
    projectId: null,
    source: "api",
    kind: "bug",
    sentiment: "negative",
    status: "new",
    title: "Existing",
    message: "Already filed",
    agentClient: null,
    agentModel: null,
    toolVersion: null,
    userAgent: null,
    contextUrl: null,
    externalId: null,
    idempotencyKey: "idem-1",
    metadata: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("feedback programs", () => {
  test.each(
    [false, true].flatMap((failed) =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => ({ mask, failed }))
    )
  )(
    "submitFeedback preserves supplied fields for combination %j",
    async ({ mask, failed }) => {
      if (failed && mask !== 7) {
        classify.mockResolvedValueOnce(null);
      }
      const supplied = {
        kind: mask & 1 ? ("praise" as const) : undefined,
        sentiment: mask & 2 ? ("positive" as const) : undefined,
        title: mask & 4 ? "Provided title" : undefined,
      };
      const values = mock((input: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => [{ ...feedbackRow(), ...input }],
        }),
      }));
      const result = await Effect.runPromise(
        submitFeedback({
          db: { insert: () => ({ values }) },
          organizationId: "org_a",
          body: { message: "Feedback message", source: "api", ...supplied },
        })
      );
      expect(result.feedback).toMatchObject({
        kind: supplied.kind ?? (failed ? "other" : "bug"),
        sentiment: supplied.sentiment ?? (failed ? null : "negative"),
        title: supplied.title ?? (failed ? null : "Classified title"),
      });
      expect(classify).toHaveBeenCalledTimes(mask === 7 ? 0 : 1);
      if (mask !== 7) {
        expect(classify).toHaveBeenCalledWith(
          expect.objectContaining({
            title: supplied.title,
            suppliedFields: supplied,
          })
        );
      }
    }
  );

  test("submitFeedback returns an existing row for a repeated idempotency key", async () => {
    const existing = feedbackRow();
    const db = {
      query: {
        agentFeedback: {
          findFirst: mock(async () => existing),
        },
        projects: {
          findFirst: mock(async () => undefined),
        },
      },
      insert: mock(() => {
        throw new Error("insert should not run");
      }),
    };

    const result = await Effect.runPromise(
      submitFeedback({
        db,
        organizationId: "org_a",
        body: {
          message: "New message",
          source: "api",
          idempotencyKey: "idem-1",
          kind: "bug",
          sentiment: "negative",
          title: "Provided title",
        },
      })
    );

    expect(result).toEqual({ feedback: existing, deduplicated: true });
    expect(db.insert).not.toHaveBeenCalled();
  });

  test("submitFeedback fails when projectId is not in the organization", async () => {
    const db = {
      query: {
        agentFeedback: {
          findFirst: mock(async () => undefined),
        },
        projects: {
          findFirst: mock(async () => undefined),
        },
      },
    };

    const failure = await Effect.runPromise(
      Effect.flip(
        submitFeedback({
          db,
          organizationId: "org_a",
          body: {
            message: "Broken project ref",
            source: "api",
            projectId: "proj_missing",
            kind: "bug",
            sentiment: "negative",
            title: "Title",
          },
        })
      )
    );

    expect(failure).toBeInstanceOf(FeedbackProjectNotFoundError);
  });

  test("listFeedback scopes queries to the requesting organization", async () => {
    const capturedWhere: unknown[] = [];
    let whereCall = 0;
    const db = {
      select: mock(() => ({
        from: mock(() => ({
          where: mock((where: unknown) => {
            capturedWhere.push(where);
            whereCall += 1;
            if (whereCall === 1) {
              return Promise.resolve([{ total: 1 }]);
            }
            return {
              orderBy: mock(() => ({
                limit: mock(() => ({
                  offset: mock(async () => [
                    feedbackRow({ organizationId: "org_b" }),
                  ]),
                })),
              })),
            };
          }),
        })),
      })),
    };

    await Effect.runPromise(
      listFeedback({
        db,
        organizationId: "org_b",
        query: { page: 1, limit: 20 },
      })
    );

    expect(capturedWhere.length).toBe(2);
    const dialect = new PgDialect();
    for (const where of capturedWhere) {
      const { params } = dialect.sqlToQuery(where);
      expect(params).toContain("org_b");
    }
  });
});
