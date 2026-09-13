import type { ToneProfile } from "@notra/ai/schemas/tone";
import type {
  AgentTokenUsage,
  ResolveIntegrationContext,
} from "@notra/ai/types/agents";
import type { TccMetadata } from "@notra/ai/types/tcc";
import type { PostSourceMetadata } from "@notra/db/schema";

import type { PostSummary } from "@/types/posts";

export interface WorkflowTriggerData {
  id: string;
  name: string;
  organizationId: string;
  outputType: string;
  outputConfig: unknown;
  enabled: boolean;
  autoPublish: boolean;
}

export interface ScheduleTriggerData extends WorkflowTriggerData {
  sourceType: string;
  sourceConfig: unknown;
  targets: { repositoryIds: string[] };
}

export interface WorkflowRepositoryData {
  id: string;
  owner: string;
  name: string;
}

export interface WorkflowBrandSettings {
  id: string;
  name: string;
  toneProfile: string | null;
  customTone: string | null;
  companyName: string | null;
  companyDescription: string | null;
  audience: string | null;
  customInstructions: string | null;
  language: string | null;
}

export interface ScheduleRepositoryData {
  id: string;
  owner: string;
  repo: string;
  defaultBranch: string | null;
}

export type ScheduleBrandSettingsData = {
  id: string;
  name: string;
  toneProfile: string | null;
  customTone: string | null;
  companyName: string | null;
  companyDescription: string | null;
  audience: string | null;
  customInstructions: string | null;
  language: string | null;
} | null;

export interface EventGenerationContext {
  organizationId: string;
  collectionId: string;
  triggerId: string;
  triggerName: string;
  eventType: string;
  eventAction: string;
  eventData: Record<string, unknown>;
  repositoryId: string;
  repositoryOwner: string;
  repositoryName: string;
  deliveryId?: string;
  tone: ToneProfile;
  brand: {
    companyName?: string;
    companyDescription?: string;
    audience?: string;
    customInstructions?: string | null;
    language?: string;
    customTone?: string | null;
  };
  outputType: string;
  sourceMetadata: PostSourceMetadata;
  autoPublish?: boolean;
  chargeAiCredits?: boolean;
  resolveContext: ResolveIntegrationContext;
  telemetryMetadata?: TccMetadata;
}

export type EventGenerationResult =
  | {
      status: "ok";
      postId: string;
      title: string;
      posts: PostSummary[];
      usage?: AgentTokenUsage;
    }
  | { status: "skipped"; reason: string }
  | { status: "generation_failed"; reason: string }
  | { status: "unsupported_output_type"; outputType: string };

export type EventHandler = (
  ctx: EventGenerationContext
) => Promise<EventGenerationResult>;
