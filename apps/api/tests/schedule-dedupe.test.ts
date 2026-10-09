import { describe, expect, mock, test } from "bun:test";
import crypto from "node:crypto";

import {
  normalizeTriggerConfig,
  hashTrigger,
  scheduleDedupeHashes,
} from "@notra/ai/utils/trigger-hash";
import { createScheduleRequestSchema } from "@notra/schemas/api/schedules";
import { configureScheduleBodySchema } from "@notra/schemas/dashboard/integrations";
import { PgDialect } from "drizzle-orm/pg-core";
import { Effect } from "effect";

import { createSchedule, patchSchedule } from "../src/programs/schedules";
import type { DbClient } from "../src/types/db";
import { hashSchedule, normalizeSchedule } from "../src/utils/schedules";

const request = {
  name: "Weekly summary",
  sourceType: "cron" as const,
  sourceConfig: {
    cron: { frequency: "weekly" as const, hour: 9, minute: 0, dayOfWeek: 1 },
  },
  targets: { repositoryIds: ["repo-b", "repo-a"] },
  outputType: "changelog" as const,
  enabled: false,
  autoPublish: false,
};

describe("schedule identity", () => {
  test("API update excludes its own row before entering the write transaction", async () => {
    const body = createScheduleRequestSchema.parse(request);
    const db = {
      query: {
        contentTriggers: {
          findFirst: mock(async ({ where }) => {
            const query = new PgDialect().sqlToQuery(where);
            expect(query.sql).toContain('"content_triggers"."id" <>');
            expect(query.params).toContain("own-row");
            return undefined;
          }),
        },
      },
      transaction: mock(async () => {
        throw new Error("Reached write transaction");
      }),
    };
    const result = await Effect.runPromise(
      Effect.result(
        patchSchedule({
          db: db as unknown as DbClient,
          organizationId: "org-a",
          scheduleId: "own-row",
          body,
          env: {},
        })
      )
    );
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "ScheduleDatabaseError" },
    });
  });
  test.each([
    undefined,
    {},
    { instructions: "  A focused brief  " },
    { instructions: "A focused brief", brandVoiceId: "voice-a" },
    {
      publishDestination: "custom" as const,
      brandVoiceId: "voice-a",
      instructions: "A focused brief",
    },
  ])(
    "API and dashboard preserve canonical and exact legacy keys: %j",
    (outputConfig) => {
      const api = createScheduleRequestSchema.parse({
        ...request,
        outputConfig,
      });
      const dashboard = configureScheduleBodySchema.parse({
        ...request,
        outputConfig,
      });
      const normalized = normalizeTriggerConfig(dashboard);
      const dashboardHash = hashTrigger({
        ...dashboard,
        ...normalized,
        instructions: dashboard.outputConfig?.instructions,
        brandVoiceId: dashboard.outputConfig?.brandVoiceId,
      });
      const legacy = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            sourceType: api.sourceType,
            sourceConfig: normalizeSchedule(api).sourceConfig,
            targets: normalizeSchedule(api).targets,
            outputType: api.outputType,
            outputConfig: api.outputConfig ?? null,
            lookbackWindow: api.lookbackWindow,
          })
        )
        .digest("hex");

      expect(hashSchedule(api)).toBe(dashboardHash);
      expect(scheduleDedupeHashes(api)).toEqual([dashboardHash, legacy]);
      expect(scheduleDedupeHashes(dashboard)).toEqual([dashboardHash, legacy]);
    }
  );

  test("repository order and presentation settings do not define canonical identity", () => {
    const api = createScheduleRequestSchema.parse(request);
    const changed = createScheduleRequestSchema.parse({
      ...request,
      name: "Renamed",
      enabled: true,
      autoPublish: true,
      outputConfig: { publishDestination: "webflow" },
      targets: { repositoryIds: ["repo-a", "repo-b"] },
    });
    expect(hashSchedule(changed)).toBe(hashSchedule(api));
    expect(scheduleDedupeHashes(changed)[1]).not.toBe(
      scheduleDedupeHashes(api)[1]
    );
  });

  test("briefs, voices and lookback distinguish schedules but whitespace does not", () => {
    const body = createScheduleRequestSchema.parse({
      ...request,
      outputConfig: { instructions: "Brief", brandVoiceId: "voice-a" },
    });
    expect(
      hashSchedule({
        ...body,
        outputConfig: { instructions: " Brief ", brandVoiceId: " voice-a " },
      })
    ).toBe(hashSchedule(body));
    expect(
      hashSchedule({
        ...body,
        outputConfig: { ...body.outputConfig, instructions: "Other" },
      })
    ).not.toBe(hashSchedule(body));
    expect(
      hashSchedule({
        ...body,
        outputConfig: { ...body.outputConfig, brandVoiceId: "voice-b" },
      })
    ).not.toBe(hashSchedule(body));
    expect(hashSchedule({ ...body, lookbackWindow: "last_14_days" })).not.toBe(
      hashSchedule(body)
    );
  });

  test("custom cron defaults match explicit dashboard defaults and API normalization", () => {
    const dashboard = configureScheduleBodySchema.parse({
      ...request,
      sourceConfig: { cron: { frequency: "custom", hour: 9, minute: 0 } },
    });
    const cron = normalizeTriggerConfig(dashboard).sourceConfig.cron;
    const api = createScheduleRequestSchema.parse({
      ...request,
      sourceConfig: { cron },
    });
    expect(scheduleDedupeHashes(dashboard)).toEqual(scheduleDedupeHashes(api));
    expect(hashSchedule(api)).toBe(hashSchedule(normalizeSchedule(api)));
  });

  test.each(["canonical", "legacy"])(
    "both API writers reject %s duplicates with scoped SQL",
    async (key) => {
      const body = createScheduleRequestSchema.parse(request);
      const hashes = scheduleDedupeHashes(body);
      const existingHash = hashes[key === "canonical" ? 0 : 1];
      const findFirst = mock(async ({ where }) => {
        const query = new PgDialect().sqlToQuery(where);
        expect(query.sql).toContain('"content_triggers"."organization_id" =');
        expect(query.sql).toContain('"content_triggers"."dedupe_hash" in');
        expect(query.params).toContain("org-a");
        expect(query.params).toContain(hashes[0]);
        expect(query.params).toContain(hashes[1]);
        return query.params.includes(existingHash)
          ? { id: "other-row" }
          : undefined;
      });
      const db = {
        query: { contentTriggers: { findFirst } },
      } as unknown as DbClient;
      const input = { db, organizationId: "org-a", body, env: {} };
      const created = await Effect.runPromise(
        Effect.result(createSchedule(input))
      );
      const updated = await Effect.runPromise(
        Effect.result(patchSchedule({ ...input, scheduleId: "own-row" }))
      );
      expect(created).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "ScheduleDuplicateError" },
      });
      expect(updated).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "ScheduleDuplicateError" },
      });
      const updateQuery = new PgDialect().sqlToQuery(
        findFirst.mock.calls[1][0].where
      );
      expect(updateQuery.sql).toContain('"content_triggers"."id" <>');
      expect(updateQuery.params).toContain("own-row");
    }
  );
});
