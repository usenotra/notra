import type { GITHUB_MENTION_CONTENT_POLICY_REASONS } from "@notra/ai/constants/github-mention-content-policy";

export type GitHubMentionContentPolicyReason =
  (typeof GITHUB_MENTION_CONTENT_POLICY_REASONS)[keyof typeof GITHUB_MENTION_CONTENT_POLICY_REASONS];

export interface GitHubMentionActiveConstruct {
  reason: GitHubMentionContentPolicyReason;
  source: string;
}

export interface GitHubMentionParsedContent {
  constructs: GitHubMentionActiveConstruct[];
  error: string | null;
}

export interface GitHubMentionAstNode {
  type?: string;
  name?: string | null;
  tagName?: string;
  value?: unknown;
  url?: string;
  properties?: Record<string, unknown>;
  data?: { estree?: GitHubMentionAstNode };
  body?: GitHubMentionAstNode[];
  expression?: GitHubMentionAstNode;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
  children?: GitHubMentionAstNode[];
  attributes?: GitHubMentionAstNode[];
}
