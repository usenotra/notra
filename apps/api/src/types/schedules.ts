import type { createDb } from "@notra/db/drizzle";
import type { contentTriggers, lookbackWindowEnum } from "@notra/db/schema";
import type {
  createScheduleRequestSchema,
  patchScheduleRequestSchema,
} from "@notra/schemas/api/schedules";
import type { z } from "zod";

import type {
  ScheduleDatabaseError,
  ScheduleDuplicateError,
  ScheduleMissingTargetsError,
  ScheduleNotFoundError,
  ScheduleQstashError,
} from "../errors/schedules";
import type { QstashEnv } from "./qstash";

type ScheduleLookbackWindow = (typeof lookbackWindowEnum.enumValues)[number];

export type ScheduleTriggerRow = typeof contentTriggers.$inferSelect;

export type ScheduleTriggerWithLookbackWindow = ScheduleTriggerRow & {
  lookbackWindow: ScheduleLookbackWindow;
};

export type ScheduleDomainError =
  | ScheduleNotFoundError
  | ScheduleDuplicateError
  | ScheduleMissingTargetsError
  | ScheduleQstashError;

interface ScheduleProgramInput {
  db: ReturnType<typeof createDb>;
  organizationId: string;
}

export interface ListSchedulesProgramInput extends ScheduleProgramInput {
  repositoryIds: string[];
}

export interface PatchScheduleProgramInput extends ScheduleProgramInput {
  scheduleId: string;
  body: z.infer<typeof patchScheduleRequestSchema>;
  env: QstashEnv;
}

export interface CreateScheduleProgramInput extends ScheduleProgramInput {
  body: z.infer<typeof createScheduleRequestSchema>;
  env: QstashEnv;
}

export interface DeleteScheduleProgramInput extends ScheduleProgramInput {
  scheduleId: string;
  env: QstashEnv;
}

export type CreateScheduleBody = z.infer<typeof createScheduleRequestSchema>;
