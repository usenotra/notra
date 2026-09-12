import type { LookbackWindow } from "@notra/schemas/dashboard/integrations";

import type {
  ScheduleBrandSettingsData,
  ScheduleRepositoryData,
  ScheduleTriggerData,
} from "@/types/workflows/workflows";

export interface ScheduleGenerationStepInput {
  trigger: ScheduleTriggerData;
  lookbackWindow: LookbackWindow;
  repositories: ScheduleRepositoryData[];
  linearIntegrationRefs: Array<{ integrationId: string; teamName?: string }>;
  brand: ScheduleBrandSettingsData;
  collectionId: string;
  generationUserId?: string;
  manual: boolean;
  chargeAiCredits?: boolean;
}

export type ScheduleContentWorkflowResult =
  | { status: "success"; triggerId: string; postId: string }
  | { status: "duplicate_execution" }
  | { status: "invalid_payload" }
  | { status: "trigger_not_found" }
  | { status: "trigger_disabled" }
  | { status: "not_due" }
  | { status: "credits_exhausted" }
  | { status: "no_sources" }
  | { status: "rate_limited_exhausted" }
  | { status: "unsupported_output_type" }
  | { status: "generation_failed"; reason: string }
  | { status: "skipped"; reason: string }
  | { status: "empty_result" };
