import { Effect } from "effect";

import { QstashService, qstashLayer } from "../lib/qstash";
import type { QstashEnv, QstashScheduleInput } from "../types/qstash";
import { runServiceEffect } from "./run-service-effect";

export function buildCronExpression(config: {
  frequency: "daily" | "weekly" | "monthly" | "custom";
  hour: number;
  minute: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
}) {
  if (config.frequency === "weekly") {
    return `${config.minute} ${config.hour} * * ${config.dayOfWeek ?? 1}`;
  }
  if (config.frequency === "monthly") {
    return `${config.minute} ${config.hour} ${config.dayOfMonth ?? 1} * *`;
  }
  // "custom" (every N days) fires daily and is gated by the schedule workflow.
  return `${config.minute} ${config.hour} * * *`;
}

export function createQstashSchedule(
  env: QstashEnv,
  input: QstashScheduleInput
) {
  return runServiceEffect(
    Effect.gen(function* () {
      const service = yield* QstashService;
      return yield* service.create(input);
    }).pipe(Effect.provide(qstashLayer(env)))
  );
}
