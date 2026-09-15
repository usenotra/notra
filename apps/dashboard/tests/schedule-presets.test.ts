import { describe, expect, test } from "bun:test";

import { toUtcDateString } from "@notra/ai/utils/schedule-interval";
import { scheduleFormSchema } from "@notra/schemas/dashboard/automation/schedule-form";

import {
  SCHEDULE_PRESETS,
  type SchedulePresetId,
} from "../src/constants/schedule-presets";
import { getPresetScheduleValues } from "../src/utils/schedule-form";

const PRESET_IDS: SchedulePresetId[] = [
  "weekly-changelog",
  "daily-twitter",
  "monthly-blog",
  "biweekly-linkedin",
];

describe("schedule presets", () => {
  test("all four presets are defined", () => {
    expect(SCHEDULE_PRESETS.map((preset) => preset.id).sort()).toEqual(
      [...PRESET_IDS].sort()
    );
  });

  test.each(PRESET_IDS)("preset %s produces a valid schedule payload", (id) => {
    const preset = getPresetScheduleValues(id);
    const parsed = scheduleFormSchema.safeParse({
      name: "Preset QA",
      outputType: preset.outputType,
      instructions: "",
      schedule: preset.schedule,
      repositoryIds: ["repo_123"],
      lookbackWindow: preset.lookbackWindow,
      brandVoiceId: "",
      autoPublish: false,
    });
    expect(parsed.success).toBe(true);
  });

  test("presets carry the expected output type, cadence and lookback", () => {
    expect(getPresetScheduleValues("weekly-changelog")).toMatchObject({
      outputType: "changelog",
      schedule: { frequency: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_7_days",
    });
    expect(getPresetScheduleValues("daily-twitter")).toMatchObject({
      outputType: "twitter_post",
      schedule: { frequency: "daily", hour: 9, minute: 0 },
      lookbackWindow: "yesterday",
    });
    expect(getPresetScheduleValues("monthly-blog")).toMatchObject({
      outputType: "blog_post",
      schedule: { frequency: "monthly", dayOfMonth: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_30_days",
    });
    const before = toUtcDateString(new Date());
    const biweekly = getPresetScheduleValues("biweekly-linkedin");
    const after = toUtcDateString(new Date());
    expect(biweekly).toMatchObject({
      outputType: "linkedin_post",
      schedule: {
        frequency: "custom",
        intervalDays: 14,
        hour: 9,
        minute: 0,
      },
      lookbackWindow: "last_14_days",
    });
    // before/after window absorbs a UTC-midnight rollover between the calls.
    const anchorDate =
      biweekly.schedule.frequency === "custom"
        ? biweekly.schedule.anchorDate
        : undefined;
    expect(anchorDate).toBeDefined();
    expect([before, after]).toContain(anchorDate as string);
    expect(anchorDate as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("unknown preset id throws", () => {
    expect(() =>
      getPresetScheduleValues("does-not-exist" as SchedulePresetId)
    ).toThrow("Unknown schedule preset");
  });
});
