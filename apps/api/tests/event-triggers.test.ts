import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import {
  createEventTrigger,
  deleteEventTrigger,
  getEventTrigger,
  updateEventTrigger,
} from "../src/programs/event-triggers";
import type { DbClient } from "../src/types/db";
import type { EventTriggerRow } from "../src/types/event-triggers";
import { runEventTriggerProgram } from "../src/utils/event-triggers";

const ORG_ID = "org_test";
const TRIGGER_ID = "trig_test";
const REPO_ID = "repo_test";

const createBody = {
  sourceType: "github_webhook" as const,
  sourceConfig: { eventTypes: ["push"], includePreReleases: true },
  targets: { repositoryIds: [REPO_ID] },
  outputType: "blog_post" as const,
  enabled: true,
  autoPublish: false,
};

function makeRow(overrides: Partial<EventTriggerRow> = {}): EventTriggerRow {
  return {
    id: TRIGGER_ID,
    organizationId: ORG_ID,
    name: "Test trigger",
    sourceType: "github_webhook",
    sourceConfig: createBody.sourceConfig,
    targets: createBody.targets,
    outputType: createBody.outputType,
    outputConfig: null,
    dedupeHash: "dedupe-hash",
    qstashScheduleId: null,
    enabled: true,
    autoPublish: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createMockDb(config: {
  findFirst?: () => Promise<EventTriggerRow | null | undefined>;
  findMany?: () => Promise<EventTriggerRow[]>;
  githubIntegrations?: () => Promise<{ id: string }[]>;
  insertReturning?: () => Promise<EventTriggerRow[]>;
  updateReturning?: () => Promise<EventTriggerRow[]>;
  deleteReturning?: () => Promise<{ id: string }[]>;
  onInsert?: () => Promise<EventTriggerRow[]>;
}): DbClient {
  const insertReturning =
    config.insertReturning ??
    config.onInsert ??
    (async () => [makeRow()]);

  return {
    query: {
      contentTriggers: {
        findFirst: config.findFirst ?? (async () => null),
        findMany: config.findMany ?? (async () => []),
      },
      githubIntegrations: {
        findMany:
          config.githubIntegrations ?? (async () => [{ id: REPO_ID }]),
      },
    },
    insert: () => ({
      values: () => ({
        returning: insertReturning,
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: config.updateReturning ?? (async () => [makeRow()]),
        }),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: config.deleteReturning ?? (async () => [{ id: TRIGGER_ID }]),
      }),
    }),
    select: () => ({
      from: () => ({
        where: async () => [],
      }),
    }),
  } as DbClient;
}

async function runProgram<A, E>(program: Effect.Effect<A, E>) {
  return Effect.runPromise(Effect.result(program));
}

describe("event trigger programs", () => {
  test("create returns duplicate when a matching dedupe hash already exists", async () => {
    const result = await runProgram(
      createEventTrigger({
        db: createMockDb({
          findFirst: async () => makeRow(),
        }),
        organizationId: ORG_ID,
        body: createBody,
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("EventTriggerDuplicateError");
    }
  });

  test("create maps unique-constraint races to duplicate errors", async () => {
    const result = await runProgram(
      createEventTrigger({
        db: createMockDb({
          findFirst: async () => null,
          onInsert: async () => {
            throw { code: "23505" };
          },
        }),
        organizationId: ORG_ID,
        body: createBody,
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("EventTriggerDuplicateError");
    }
  });

  test("create rejects missing integration targets", async () => {
    const result = await runProgram(
      createEventTrigger({
        db: createMockDb({
          findFirst: async () => null,
          githubIntegrations: async () => [],
        }),
        organizationId: ORG_ID,
        body: createBody,
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("EventTriggerTargetsNotFoundError");
      expect(result.failure.message).toContain("integrations not found");
    }
  });

  test("get returns not found when the scoped query finds no row", async () => {
    const result = await runProgram(
      getEventTrigger({
        db: createMockDb({
          findFirst: async () => null,
        }),
        organizationId: ORG_ID,
        triggerId: TRIGGER_ID,
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("EventTriggerNotFoundError");
    }
  });

  test("update returns not found when the row disappears before write", async () => {
    let findFirstCalls = 0;
    const result = await runProgram(
      updateEventTrigger({
        db: createMockDb({
          findFirst: async () => {
            findFirstCalls++;
            if (findFirstCalls === 1) {
              return makeRow();
            }
            return null;
          },
          updateReturning: async () => [],
        }),
        organizationId: ORG_ID,
        triggerId: TRIGGER_ID,
        body: createBody,
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("EventTriggerNotFoundError");
    }
  });

  test("delete returns not found when no github_webhook row is deleted", async () => {
    const result = await runProgram(
      deleteEventTrigger({
        db: createMockDb({
          deleteReturning: async () => [],
        }),
        organizationId: ORG_ID,
        triggerId: TRIGGER_ID,
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("EventTriggerNotFoundError");
    }
  });

  test("database defects die through the route runner", async () => {
    await expect(
      runEventTriggerProgram(
        getEventTrigger({
          db: createMockDb({
            findFirst: async () => {
              throw new Error("connection lost");
            },
          }),
          organizationId: ORG_ID,
          triggerId: TRIGGER_ID,
        })
      )
    ).rejects.toThrow("connection lost");
  });
});
