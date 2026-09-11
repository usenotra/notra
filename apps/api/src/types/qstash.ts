import type { QstashError } from "@notra/schemas/api/qstash";
import type { Effect } from "effect";

export interface QstashEnv {
  QSTASH_TOKEN?: string;
  WORKFLOW_BASE_URL?: string;
}

export interface QstashScheduleInput {
  triggerId: string;
  cron: string;
  scheduleId?: string;
}

export interface QstashOperations {
  create: (input: QstashScheduleInput) => Effect.Effect<string, QstashError>;
  delete: (scheduleId: string) => Effect.Effect<void, QstashError>;
}
