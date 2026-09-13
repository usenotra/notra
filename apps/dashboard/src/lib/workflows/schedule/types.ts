import type { ToneProfile } from "@notra/ai/schemas/tone";
import type {
  AgentDataPointSettings,
  AgentTokenUsage,
  AILogTarget,
  LinearIntegrationRef,
  ResolveIntegrationContext,
  ResolveLinearIntegrationContext,
} from "@notra/ai/types/agents";
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
  /** Top-level tone, always mirrored into promptInput.tone (source of truth downstream). */
  tone: ToneProfile;
  promptInput: {
    sourceTargets: string;
    todayUtc: string;
    lookbackLabel: string;
    lookbackStartIso: string;
    lookbackEndIso: string;
    companyName?: string;
    companyDescription?: string;
    audience?: string;
    customInstructions?: string | null;
    language?: string;
    /** Required: normalized from top-level tone at the workflow entrypoint. */
    tone: ToneProfile;
    customTone?: string | null;
  };
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
