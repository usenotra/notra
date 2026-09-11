import type { createDb } from "@notra/db/drizzle";
import type { contentTriggers } from "@notra/db/schema";
import type {
  createEventTriggerRequestSchema,
  patchEventTriggerRequestSchema,
} from "@notra/schemas/api/event-triggers";
import type { z } from "zod";

import type {
  EventTriggerDuplicateError,
  EventTriggerNotFoundError,
  EventTriggerTargetsNotFoundError,
} from "../errors/event-triggers";

export type EventTriggerRow = typeof contentTriggers.$inferSelect;

export type EventTriggerDomainError =
  | EventTriggerNotFoundError
  | EventTriggerDuplicateError
  | EventTriggerTargetsNotFoundError;

export interface EventTriggerProgramInput {
  db: ReturnType<typeof createDb>;
  organizationId: string;
}

export interface NamedEventTriggerProgramInput extends EventTriggerProgramInput {
  triggerId: string;
}

export interface ListEventTriggersProgramInput extends EventTriggerProgramInput {
  repositoryIds: string[];
}

export interface CreateEventTriggerProgramInput extends EventTriggerProgramInput {
  body: z.infer<typeof createEventTriggerRequestSchema>;
}

export interface UpdateEventTriggerProgramInput extends NamedEventTriggerProgramInput {
  body: z.infer<typeof patchEventTriggerRequestSchema>;
}

export interface ListEventTriggersResult {
  eventTriggers: ReturnType<
    typeof import("../utils/event-triggers").serializeEventTrigger
  >[];
  repositoryMap: Record<string, string>;
}
