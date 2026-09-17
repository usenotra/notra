import type { AILogTarget } from "@notra/ai/observability";
import type { ContentType } from "@notra/ai/schemas/content";
import type { ToneProfile } from "@notra/ai/schemas/tone";
import type { AgentType } from "@notra/ai/types/brand-references";
import type { RouteMetadata } from "@notra/ai/types/router";
import type { PostSourceMetadata } from "@notra/db/schema";

import type { PostSummary } from "./posts";
import type {
  BaseTonePromptInput,
  BlogPostTonePromptInput,
  ChangelogTonePromptInput,
  LinkedInTonePromptInput,
  TwitterTonePromptInput,
} from "./prompts";
import type { TccMetadata } from "./tcc";
import type {
  CommitWindow,
  GitHubSelectionFilters,
  GitHubToolRepositoryContext,
  GranolaToolContext,
  LinearToolContext,
} from "./tools";

export type ResolveIntegrationContext = (
  integrationId: string,
  options?: { organizationId?: string }
) => Promise<GitHubToolRepositoryContext>;

export type ResolveLinearIntegrationContext = (
  integrationId: string,
  options?: { organizationId?: string }
) => Promise<LinearToolContext>;

export type ResolveGranolaIntegrationContext = (
  integrationId: string,
  options: { organizationId: string }
) => Promise<GranolaToolContext>;

export type { AILogTarget } from "@notra/ai/observability";

export interface AgentDataPointSettings {
  includePullRequests?: boolean;
  includeCommits?: boolean;
  includeReleases?: boolean;
  includeLinearData?: boolean;
}

export interface AgentTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  modelId?: string;
  /**
   * Prompt size of the largest single model call behind this usage. Set it
   * when the usage aggregates several calls, so long-context pricing keys off
   * one request instead of the sum. Defaults to this usage's own prompt.
   */
  maxPromptTokens?: number;
  /**
   * Token cost already summed per model call. Aggregated usage should carry
   * it: prices can depend on the size of each individual request, which the
   * sum no longer shows.
   */
  tokenCostUsd?: number;
  computeMs?: number;
  totalUsd?: number;
  /** Router metadata of the last model call (gateway, upstream provider). */
  route?: RouteMetadata;
  raw?: unknown;
}

export interface ChangelogAgentResult {
  postId: string;
  title: string;
  posts: PostSummary[];
  usage?: AgentTokenUsage;
}

export interface BackgroundGenOptions {
  organizationId: string;
  collectionId: string;
  skillName: string;
  contentType: ContentType;
  brandAgentType: AgentType;
  contentLabel: string;
  voiceId?: string;
  repositories: Array<{
    integrationId: string;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
  }>;
  linearIntegrations?: LinearIntegrationRef[];
  promptInput: BaseTonePromptInput;
  sourceMetadata?: PostSourceMetadata;
  dataPointSettings?: AgentDataPointSettings;
  selectionFilters?: GitHubSelectionFilters;
  commitWindow?: CommitWindow;
  autoPublish?: boolean;
  resolveContext: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
  includeSearchBrandReferencesTool?: boolean;
}

export interface BackgroundGenResult {
  postId: string;
  title: string;
  posts: PostSummary[];
  usage?: AgentTokenUsage;
}

export interface LinearIntegrationRef {
  integrationId: string;
  teamName?: string;
}

export interface ChangelogAgentOptions {
  organizationId: string;
  collectionId: string;
  voiceId?: string;
  repositories: Array<{
    integrationId: string;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
  }>;
  linearIntegrations?: LinearIntegrationRef[];
  tone?: ToneProfile;
  promptInput: ChangelogTonePromptInput;
  sourceMetadata?: PostSourceMetadata;
  dataPointSettings?: AgentDataPointSettings;
  selectionFilters?: GitHubSelectionFilters;
  commitWindow?: CommitWindow;
  autoPublish?: boolean;
  resolveContext: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
}

export interface LinkedInAgentResult {
  postId: string;
  title: string;
  posts: PostSummary[];
  usage?: AgentTokenUsage;
}

export interface LinkedInAgentOptions {
  organizationId: string;
  collectionId: string;
  voiceId?: string;
  repositories: Array<{
    integrationId: string;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
  }>;
  linearIntegrations?: LinearIntegrationRef[];
  tone?: ToneProfile;
  promptInput: LinkedInTonePromptInput;
  sourceMetadata?: PostSourceMetadata;
  dataPointSettings?: AgentDataPointSettings;
  selectionFilters?: GitHubSelectionFilters;
  commitWindow?: CommitWindow;
  autoPublish?: boolean;
  resolveContext: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
}

export interface TwitterAgentResult {
  postId: string;
  title: string;
  posts: PostSummary[];
  usage?: AgentTokenUsage;
}

export interface TwitterAgentOptions {
  organizationId: string;
  collectionId: string;
  voiceId?: string;
  repositories: Array<{
    integrationId: string;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
  }>;
  linearIntegrations?: LinearIntegrationRef[];
  tone?: ToneProfile;
  promptInput: TwitterTonePromptInput;
  sourceMetadata?: PostSourceMetadata;
  dataPointSettings?: AgentDataPointSettings;
  selectionFilters?: GitHubSelectionFilters;
  commitWindow?: CommitWindow;
  autoPublish?: boolean;
  resolveContext: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
}

export interface BlogPostAgentResult {
  postId: string;
  title: string;
  posts: PostSummary[];
  usage?: AgentTokenUsage;
}

export interface BlogPostAgentOptions {
  organizationId: string;
  collectionId: string;
  voiceId?: string;
  repositories: Array<{
    integrationId: string;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
  }>;
  linearIntegrations?: LinearIntegrationRef[];
  tone?: ToneProfile;
  promptInput: BlogPostTonePromptInput;
  sourceMetadata?: PostSourceMetadata;
  dataPointSettings?: AgentDataPointSettings;
  selectionFilters?: GitHubSelectionFilters;
  commitWindow?: CommitWindow;
  autoPublish?: boolean;
  resolveContext: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
}

export interface ChatAgentContext {
  organizationId: string;
  sessionId?: string;
  currentMarkdown: string;
  selectedText?: string;
  onMarkdownUpdate: (markdown: string) => void;
  brandContext?: string;
  log?: AILogTarget;
  telemetryMetadata?: TccMetadata;
}
