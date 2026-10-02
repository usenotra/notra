import { isDemoMode } from "@notra/utils/demo-mode";
import {
  Client as QStashClient,
  QstashError as QStashSdkError,
} from "@upstash/qstash";

import { QSTASH_DESTINATION_REJECTION_PATTERN } from "../constants/qstash";
import { CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS } from "../constants/schedule-interval";
import { QstashScheduleSetupError } from "../schemas/qstash";
import type { CreateQstashRouteScheduleProps } from "../types/qstash";
import { toUtcDateString } from "../utils/schedule-interval";
import {
  getConfiguredAppUrl,
  getConfiguredWorkflowUrl,
  requireConfiguredAppUrl,
} from "../utils/url";

export interface CreateQstashScheduleProps {
  triggerId: string;
  cron: string;
  scheduleId?: string;
}

export interface TriggerCronConfig {
  frequency: "daily" | "weekly" | "monthly" | "custom";
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  /** Every N days, for `custom`. */
  intervalDays?: number;
  /** UTC `YYYY-MM-DD` the custom interval counts from. */
  anchorDate?: string;
}

function getQstashToken() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new QstashScheduleSetupError({ reason: "missing_token" });
  }
  return token;
}

function getScheduleAppUrl() {
  const appUrl = getConfiguredAppUrl();
  if (!appUrl) {
    throw new QstashScheduleSetupError({ reason: "missing_app_url" });
  }
  return appUrl;
}

/** Classify the SDK's text-only rejection once, where the raw body lives. */
function toScheduleCreateError(error: unknown) {
  if (
    error instanceof QStashSdkError &&
    QSTASH_DESTINATION_REJECTION_PATTERN.test(error.message)
  ) {
    return new QstashScheduleSetupError({
      reason: "invalid_destination",
      cause: error,
    });
  }
  return error;
}

export function getAppUrl() {
  return requireConfiguredAppUrl();
}

export function getBaseUrl() {
  return getConfiguredWorkflowUrl() ?? getConfiguredAppUrl();
}

function getQStashClient() {
  return new QStashClient({ token: getQstashToken() });
}

export function buildCronExpression(config?: TriggerCronConfig) {
  const normalizedConfig = normalizeCronConfig(config);

  if (!normalizedConfig) {
    return null;
  }

  const minute = normalizedConfig.minute;
  const hour = normalizedConfig.hour;

  if (normalizedConfig.frequency === "weekly") {
    const dayOfWeek =
      "dayOfWeek" in normalizedConfig ? normalizedConfig.dayOfWeek : 1;
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  if (normalizedConfig.frequency === "monthly") {
    const dayOfMonth =
      "dayOfMonth" in normalizedConfig ? normalizedConfig.dayOfMonth : 1;
    return `${minute} ${hour} ${dayOfMonth} * *`;
  }

  // "custom" (every N days) fires daily; the schedule workflow gates the run
  // against the interval anchor because cron cannot express it.
  return `${minute} ${hour} * * *`;
}

export function normalizeCronConfig(config?: TriggerCronConfig) {
  if (!config) {
    return undefined;
  }

  const base = {
    frequency: config.frequency,
    hour: config.hour ?? 0,
    minute: config.minute ?? 0,
  } as const;

  if (config.frequency === "weekly") {
    return {
      ...base,
      dayOfWeek: config.dayOfWeek ?? 1,
    };
  }

  if (config.frequency === "monthly") {
    return {
      ...base,
      dayOfMonth: config.dayOfMonth ?? 1,
    };
  }

  if (config.frequency === "custom") {
    return {
      ...base,
      intervalDays:
        config.intervalDays ?? CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS,
      anchorDate: config.anchorDate ?? toUtcDateString(new Date()),
    };
  }

  return base;
}

export async function createQstashSchedule({
  triggerId,
  cron,
  scheduleId,
}: CreateQstashScheduleProps) {
  // The public demo saves schedules but never registers real callbacks.
  if (isDemoMode()) {
    return scheduleId ?? `demo-schedule-${triggerId}`;
  }
  const client = getQStashClient();
  const appUrl = getScheduleAppUrl();

  const destination = `${appUrl}/api/workflows/schedule`;

  const result = await client.schedules
    .create({
      ...(scheduleId && { scheduleId }),
      destination,
      cron,
      body: JSON.stringify({ triggerId }),
      headers: {
        "Content-Type": "application/json",
      },
    })
    .catch((error: unknown) => {
      throw toScheduleCreateError(error);
    });

  const resolvedScheduleId = result.scheduleId ?? scheduleId;

  if (!resolvedScheduleId) {
    throw new Error("QStash schedule id was not returned");
  }

  return resolvedScheduleId;
}

export async function createQstashRouteSchedule({
  path,
  cron,
  body,
  scheduleId,
}: CreateQstashRouteScheduleProps) {
  if (isDemoMode()) {
    return scheduleId ?? `demo-schedule-${crypto.randomUUID()}`;
  }
  const client = getQStashClient();
  const appUrl = getScheduleAppUrl();

  const result = await client.schedules
    .create({
      ...(scheduleId && { scheduleId }),
      destination: `${appUrl}${path}`,
      cron,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    })
    .catch((error: unknown) => {
      throw toScheduleCreateError(error);
    });

  const resolvedScheduleId = result.scheduleId ?? scheduleId;

  if (!resolvedScheduleId) {
    throw new Error("QStash schedule id was not returned");
  }

  return resolvedScheduleId;
}

export async function deleteQstashSchedule(scheduleId: string) {
  if (isDemoMode()) {
    return;
  }
  const client = getQStashClient();
  await client.schedules.delete(scheduleId);
}
