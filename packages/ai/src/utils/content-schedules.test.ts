import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createScheduleInputSchema } from "@notra/ai/schemas/schedules";
import { hashTrigger } from "@notra/ai/utils/trigger-hash";

import { contentScheduleDedupeHash } from "./content-schedules";

describe("content schedule tools", () => {
  test("fills daily schedule defaults", () => {
    const parsed = createScheduleInputSchema.parse({
      name: "Monday changelog",
      outputType: "changelog",
      repositoryIds: ["repo_1"],
      frequency: "daily",
      hour: 9,
    });

    assert.equal(parsed.minute, 0);
    assert.equal(parsed.lookbackWindow, "last_7_days");
    assert.equal(parsed.autoPublish, false);
    assert.equal(parsed.enabled, true);
  });

  test("requires the field that defines a weekly, monthly, or custom cadence", () => {
    assert.equal(
      createScheduleInputSchema.safeParse({
        name: "Weekly",
        outputType: "changelog",
        repositoryIds: ["repo_1"],
        frequency: "weekly",
        hour: 9,
      }).success,
      false
    );
    assert.equal(
      createScheduleInputSchema.safeParse({
        name: "Monthly",
        outputType: "blog_post",
        repositoryIds: ["repo_1"],
        frequency: "monthly",
        hour: 9,
      }).success,
      false
    );
    assert.equal(
      createScheduleInputSchema.safeParse({
        name: "Custom",
        outputType: "twitter_post",
        repositoryIds: ["repo_1"],
        frequency: "custom",
        hour: 9,
      }).success,
      false
    );
  });

  test("matches the dashboard dedupe hash, including repository order", () => {
    const cron = {
      frequency: "weekly" as const,
      hour: 9,
      minute: 0,
      dayOfWeek: 1,
    };
    const agentHash = contentScheduleDedupeHash({
      cron,
      repositoryIds: ["b", "a"],
      outputType: "changelog",
      lookbackWindow: "last_7_days",
      instructions: "Lead with what shipped.",
    });
    const dashboardHash = hashTrigger({
      sourceType: "cron",
      sourceConfig: { cron },
      targets: { repositoryIds: ["a", "b"] },
      outputType: "changelog",
      lookbackWindow: "last_7_days",
      instructions: "Lead with what shipped.",
    });

    assert.equal(agentHash, dashboardHash);
    assert.notEqual(
      agentHash,
      contentScheduleDedupeHash({
        cron,
        repositoryIds: ["a", "b"],
        outputType: "changelog",
        lookbackWindow: "last_7_days",
      })
    );
  });
});
