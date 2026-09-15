import type { ToneProfile } from "@notra/ai/schemas/tone";
import type {
  AgentDataPointSettings,
  AgentTokenUsage,
  AILogTarget,
  LinearIntegrationRef,
  ResolveIntegrationContext,
  ResolveLinearIntegrationContext,
} from "@notra/ai/types/agents";
import type { BaseTonePromptInput } from "@notra/ai/types/prompts";
import type { TccMetadata } from "@notra/ai/types/tcc";
import type { GitHubSelectionFilters } from "@notra/ai/types/tools";
import type { PostSourceMetadata } from "@notra/db/schema";

import type { PostSummary } from "@/types/posts";

export interface ContentGenerationContext {
  organizationId: string;
  userId?: string;
  collectionId: string;
  repositories: Array<{
    integrationId: string;
    owner: string;
    repo: string;
    defaultBranch: string | null;
  }>;
  linearIntegrations?: LinearIntegrationRef[];
  tone: ToneProfile;
  promptInput: BaseTonePromptInput;
  sourceMetadata: PostSourceMetadata;
  dataPointSettings?: AgentDataPointSettings;
  selectionFilters?: GitHubSelectionFilters;
  commitWindow?: {
    since: string;
    until: string;
  };
  voiceId?: string;
  autoPublish?: boolean;
  chargeAiCredits?: boolean;
  resolveContext: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
}

export type ContentGenerationResult =
  | {
      status: "ok";
      postId: string;
      title: string;
      posts: PostSummary[];
      usage?: AgentTokenUsage;
    }
  | { status: "skipped"; reason: string }
  | { status: "rate_limited"; retryAfterSeconds?: number }
  | { status: "generation_failed"; reason: string }
  | { status: "unsupported_output_type"; outputType: string };

export type ContentHandler = (
  ctx: ContentGenerationContext
) => Promise<ContentGenerationResult>;
