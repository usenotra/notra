import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  ContentBillingReservation,
  ContentQuotaFeatureId,
} from "@notra/ai/types/billing";

export type WorkflowContentBillingGate = ContentBillingReservation;

export interface GateContentBillingInput {
  organizationId: string;
  executionId: string;
  outputType: string | null;
  quotaFeatureId?: ContentQuotaFeatureId;
  units?: number;
  lockTtlMs?: number;
  countTowardQuota?: boolean;
  allowPlanIncluded?: boolean;
}

export interface FinalizeContentBillingInput {
  reservation: ContentBillingReservation;
  action: "confirm" | "release";
  units?: number;
  usage?: AgentTokenUsage;
  fallbackModelId?: string;
  properties?: Record<string, string | number | boolean>;
  logPrefix: string;
}
