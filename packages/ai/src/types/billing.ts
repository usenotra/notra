import type { CheckResponse } from "autumn-js";

import type { AgentTokenUsage } from "./agents";

export interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  cacheReadPerMillionTokens: number;
  cacheWritePerMillionTokens: number;
  /**
   * Providers that charge more for long prompts bill the whole request at the
   * higher rate once its prompt exceeds `promptTokens`.
   */
  longContext?: LongContextPricing;
}

export interface LongContextPricing extends Omit<ModelPricing, "longContext"> {
  /** Prompt size, in tokens, above which the higher rates apply. */
  promptTokens: number;
}

export type AiCreditBillingBasis = "reported_total_usd" | "tokens";

export type TeamMembersLimitStatus =
  | "allowed"
  | "limit-reached"
  | "check-unavailable";

export interface AiCreditCostResult {
  costCents: number;
  billingBasis: AiCreditBillingBasis;
  reportedCostCents?: number;
  tokenCostCents: number;
}

export type ContentBillingMode =
  | "unmetered"
  | "plan_quota"
  | "ai_credits"
  | "plan_included";

export type ContentQuotaFeatureId =
  | "long_form_posts"
  | "social_posts"
  | "image_generations"
  | "ai_answers";

export type ContentBillingFeatureId = ContentQuotaFeatureId | "ai_credits";

export type ContentBillingDenialReason =
  | "quota_exhausted"
  | "insufficient_ai_credits"
  | "no_entitlement";

export interface ContentBillingReservation {
  allowed: boolean;
  mode: ContentBillingMode;
  featureId: ContentBillingFeatureId | null;
  reserved: boolean;
  lockId: string | null;
  useMarkup: boolean;
  reason?: ContentBillingDenialReason;
  shouldNotify?: boolean;
  balanceRemaining?: number | null;
}

export interface ReserveContentBillingInput {
  organizationId: string;
  outputType: string | null;
  quotaFeatureId?: ContentQuotaFeatureId;
  units?: number;
  executionId?: string;
  lockTtlMs?: number;
  countTowardQuota?: boolean;
  /**
   * When this run has no content quota and credits are missing or empty, an
   * active paid plan still includes it. Posts and scans leave this unset.
   */
  allowPlanIncluded?: boolean;
}

export type GitHubMentionBillingFeatureId =
  | "pull_request_credits"
  | "ai_credits";

export type GitHubMentionBillingMode =
  | "unmetered"
  | "pull_request_credits"
  | "ai_credits";

export type GitHubMentionBillingDenialReason =
  | "pull_request_credits_exhausted"
  | "insufficient_ai_credits"
  | "no_entitlement";

export interface GitHubMentionBillingReservation {
  allowed: boolean;
  mode: GitHubMentionBillingMode;
  featureId: GitHubMentionBillingFeatureId | null;
  /** Set while Autumn holds balance for this run; null when nothing is metered. */
  lockId: string | null;
  useMarkup: boolean;
  reason?: GitHubMentionBillingDenialReason;
  balanceRemaining?: number | null;
}

export interface AutumnFeatureCheck {
  response: CheckResponse | null;
  /** The lock already exists, so an earlier attempt reserved this same run. */
  duplicateLock: boolean;
}

export type ChatBillingMode = "unmetered" | "ai_credits" | "plan_included";

export interface ChatBillingCheck {
  allowed: boolean;
  mode: ChatBillingMode;
  chargeAiCredits: boolean;
  useMarkup: boolean;
  balanceRemaining: number | null;
}

export interface ConfirmContentBillingInput {
  reservation: ContentBillingReservation;
  units?: number;
  usage?: AgentTokenUsage;
  fallbackModelId?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface ContentQuotaLabel {
  singular: string;
  plural: string;
}
