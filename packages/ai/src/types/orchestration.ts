import type { AILogTarget } from "@notra/ai/observability";
import type {
  ResolveGranolaIntegrationContext,
  ResolveIntegrationContext,
  ResolveLinearIntegrationContext,
} from "@notra/ai/types/agents";
import type { PostToolsResult } from "@notra/ai/types/post-tools";
import type { RouteUsageSummary } from "@notra/ai/types/router";
import type { TccMetadata } from "@notra/ai/types/tcc";
import type { LanguageModelUsage, streamText, UIMessage } from "ai";

export interface ValidatedGitHubIntegration {
  id: string;
  type: "github";
  enabled: boolean;
  displayName: string;
  organizationId: string;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    defaultBranch: string | null;
    enabled: boolean;
  }>;
}

export interface ValidatedLinearIntegration {
  id: string;
  type: "linear";
  enabled: boolean;
  displayName: string;
  organizationId: string;
  linearTeamId?: string | null;
  linearTeamName?: string | null;
}

export interface ValidatedGranolaIntegration {
  id: string;
  type: "granola";
  enabled: boolean;
  displayName: string;
  organizationId: string;
  workspaceName?: string | null;
}

export type ValidatedIntegration =
  | ValidatedGitHubIntegration
  | ValidatedLinearIntegration
  | ValidatedGranolaIntegration;

export interface EnabledCapabilities {
  github: boolean;
  linear: boolean;
  skills: boolean;
  markdown: boolean;
}

export interface TextSelection {
  text: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

export interface GitHubContextItem {
  type: "github-repo";
  owner: string;
  repo: string;
  integrationId: string;
}

export interface LinearContextItem {
  type: "linear-team";
  integrationId: string;
  teamName?: string;
}

export interface McpServerContextItem {
  type: "mcp-server";
  integrationId: string;
  name: string;
}

export type ContextItem =
  | GitHubContextItem
  | LinearContextItem
  | McpServerContextItem;

export interface RoutingDecision {
  complexity: "simple" | "complex";
  requiresTools: boolean;
  reasoningHeavy: boolean;
  reasoning: string;
}

export type AutoThinkingLevel = "off" | "low" | "medium" | "high";

export interface AutoSelection {
  model: string;
  thinkingLevel: AutoThinkingLevel;
}

export interface RoutingResult {
  model: string;
  complexity: "simple" | "complex";
  requiresTools: boolean;
  reasoning: string;
  thinkingLevel?: AutoThinkingLevel;
}

export interface ToolSet {
  tools: Record<string, import("ai").Tool>;
  descriptions: string[];
}

export interface ImageDefaults {
  integrationId: string;
  branch: string;
  title: string;
  brandIdentityId?: string;
}

export interface RepoContext {
  integrationId: string;
  owner?: string;
  repo?: string;
}

export interface LinearContext {
  integrationId: string;
  teamName?: string;
  displayName?: string;
}

export interface OrchestrateInput {
  organizationId: string;
  messages: UIMessage[];
  currentMarkdown: string;
  contentType?: string;
  documentMode?: "plan";
  currentPostId?: string;
  userId?: string;
  imageDefaults?: ImageDefaults;
  selection?: TextSelection;
  context?: ContextItem[];
  maxSteps?: number;
  abortSignal?: AbortSignal;
  log?: AILogTarget;
  timezone?: string;
  telemetryMetadata?: TccMetadata;
  useMarkup?: boolean;
}

export interface OrchestrateResult {
  stream: ReturnType<typeof streamText>;
  routingDecision: RoutingResult;
}

export type StreamProviderOptions = NonNullable<
  Parameters<typeof streamText>[0]["providerOptions"]
>;

export interface OrchestrateDeps {
  integrationFetchers?: IntegrationFetchers;
  resolveContext?: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  onUsage?: (
    usage: LanguageModelUsage,
    modelId: string,
    routeUsage?: RouteUsageSummary
  ) => void | Promise<void>;
  log?: AILogTarget;
}

export interface BuildToolSetParams {
  organizationId: string;
  currentMarkdown: string;
  contentType?: string;
  currentPostId?: string;
  userId?: string;
  imageDefaults?: ImageDefaults;
  useMarkup?: boolean;
  onMarkdownUpdate?: (markdown: string) => void;
  validatedIntegrations: ValidatedIntegration[];
}

export interface BuildToolSetDeps {
  resolveContext?: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  skipTools?: boolean;
}

export interface BuildStandaloneToolSetParams {
  organizationId: string;
  chatId?: string;
  userId?: string;
  useMarkup?: boolean;
  validatedIntegrations: ValidatedIntegration[];
  postResult: PostToolsResult;
}

export interface BuildStandaloneToolSetDeps {
  resolveContext?: ResolveIntegrationContext;
  resolveLinearContext?: ResolveLinearIntegrationContext;
  resolveGranolaContext?: ResolveGranolaIntegrationContext;
}

export interface GitHubIntegrationData {
  id: string;
  organizationId: string;
  enabled: boolean;
  displayName: string;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
    enabled: boolean;
  }>;
}

export interface LinearIntegrationData {
  id: string;
  organizationId: string;
  enabled: boolean;
  displayName: string;
  linearTeamId?: string | null;
  linearTeamName?: string | null;
}

export type GetGitHubIntegrationById = (
  integrationId: string
) => Promise<GitHubIntegrationData | null>;

export type GetLinearIntegrationById = (
  integrationId: string
) => Promise<LinearIntegrationData | null>;

export type ListGitHubIntegrationsByOrganization = (
  organizationId: string
) => Promise<GitHubIntegrationData[]>;

export type ListLinearIntegrationsByOrganization = (
  organizationId: string
) => Promise<LinearIntegrationData[]>;

export interface IntegrationFetchers {
  getGitHubIntegrationById?: GetGitHubIntegrationById;
  getLinearIntegrationById?: GetLinearIntegrationById;
  listGitHubIntegrationsByOrganization?: ListGitHubIntegrationsByOrganization;
  listLinearIntegrationsByOrganization?: ListLinearIntegrationsByOrganization;
}
