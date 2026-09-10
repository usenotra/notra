import type { AILogTarget } from "@notra/ai/observability";
import type { StandaloneChatContextItem } from "@notra/ai/schemas/standalone-chat";
import type { RouteUsageSummary } from "@notra/ai/types/router";
import type { TccMetadata } from "@notra/ai/types/tcc";
import type { LanguageModelUsage, UIMessage } from "ai";

import type {
  ResolveGranolaIntegrationContext,
  ResolveIntegrationContext,
  ResolveLinearIntegrationContext,
} from "./agents";
import type {
  IntegrationFetchers,
  ValidatedIntegration,
} from "./orchestration";

export interface StandaloneChatInput {
  organizationId: string;
  chatId?: string;
  userId?: string;
  messages: UIMessage[];
  projectId?: string | null;
  context?: StandaloneChatContextItem[];
  maxSteps?: number;
  log?: AILogTarget;
  requestedModel?: string;
  enableThinking?: boolean;
  thinkingLevel?: "off" | "low" | "medium" | "high";
  abortSignal?: AbortSignal;
  timezone?: string;
  telemetryMetadata?: TccMetadata;
  useMarkup?: boolean;
}

export interface StandaloneChatDeps {
  preValidatedIntegrations?: ValidatedIntegration[];
  integrationFetchers?: IntegrationFetchers;
  resolveContext?: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  resolveGranolaContext?: ResolveGranolaIntegrationContext;
  onUsage?: (
    usage: LanguageModelUsage,
    modelId: string,
    routeUsage?: RouteUsageSummary
  ) => void | Promise<void>;
  onFirstChunk?: () => void;
  log?: AILogTarget;
}

export type { StandaloneChatContextItem } from "@notra/ai/schemas/standalone-chat";
export type { OrchestrateResult } from "./orchestration";
