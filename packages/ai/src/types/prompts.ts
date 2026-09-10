export type { TextSelection } from "./orchestration";

import type { ChatWorkspace } from "./chat-workspace";
import type { TextSelection } from "./orchestration";

export interface BaseTonePromptInput {
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
}

export type ChangelogTonePromptInput = BaseTonePromptInput;
export type LinkedInTonePromptInput = BaseTonePromptInput;
export type TwitterTonePromptInput = BaseTonePromptInput;
export type BlogPostTonePromptInput = BaseTonePromptInput;

export interface ContentEditorChatPromptParams {
  selection?: TextSelection;
  contentType?: string;
  documentMode?: "plan";
  repoContext?: Array<{
    integrationId: string;
  }>;
  linearContext?: Array<{
    integrationId: string;
  }>;
  toolDescriptions?: string[];
  hasGitHubEnabled?: boolean;
  hasLinearEnabled?: boolean;
  timezone?: string;
}

export interface StandaloneChatPromptParams {
  skillSummaries?: Array<{
    name: string;
    description: string;
  }>;
  repoContext?: Array<{
    integrationId: string;
    owner?: string;
    repo?: string;
  }>;
  linearContext?: Array<{
    integrationId: string;
    teamName?: string;
    displayName?: string;
  }>;
  mcpContext?: Array<{
    integrationId: string;
    name: string;
  }>;
  toolDescriptions?: string[];
  hasGitHubEnabled: boolean;
  hasLinearEnabled: boolean;
  hasMcpEnabled: boolean;
  timezone?: string;
  workspace?: ChatWorkspace | null;
}

export interface GithubWebhookMemoryPromptParams {
  eventType: "release" | "push";
  repository: string;
  action: string;
  data: Record<string, unknown>;
}
