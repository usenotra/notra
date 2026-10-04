import {
  ADDONS,
  FEATURES,
  LEGACY_PLANS,
  PLANS,
} from "@notra/ai/billing/features";
import type { ChartConfig } from "@notra/ui/components/ui/chart";

import type { PlanTierLimits } from "@/types/billing/plan";

export const BILLING_PRICE_REGEX = /^\d+([.,]\d+)?$/;

export const ANNUAL_PLAN_SUFFIXES = ["_annual", "_yearly"] as const;

export const PLAN_NAME_BILLING_INTERVAL_SUFFIX =
  /(?<=\S)(?:\s*\((?:monthly|annual|yearly)\)|\s+(?:monthly|annual|yearly))\s*$/i;

export const FEATURED_PLAN_TIER: string = PLANS.GROWTH;

export const LEGACY_PLAN_TIERS: Record<string, string> = {
  [LEGACY_PLANS.BASIC]: PLANS.STARTER,
  [LEGACY_PLANS.BASIC_YEARLY]: PLANS.STARTER,
  [LEGACY_PLANS.PRO]: PLANS.GROWTH,
  [LEGACY_PLANS.PRO_YEARLY]: PLANS.GROWTH,
};

export const ZDR_ADDON_PRICE_PERCENT = 20;

export const PLAN_TIER_LIMITS: Record<string, PlanTierLimits> = {
  [PLANS.STARTER]: {
    aiAnswers: 2000,
    imageGenerations: 8,
    longFormPosts: 10,
    pullRequestCredits: 10,
    projects: 1,
    references: 100,
    referenceOveragePrice: "0.05",
    prioritySupport: false,
  },
  [PLANS.GROWTH]: {
    aiAnswers: 6000,
    imageGenerations: 20,
    longFormPosts: 25,
    pullRequestCredits: 15,
    projects: 3,
    references: 500,
    referenceOveragePrice: "0.04",
    prioritySupport: false,
  },
  [PLANS.SCALE]: {
    aiAnswers: 12_000,
    imageGenerations: 45,
    longFormPosts: 50,
    pullRequestCredits: 25,
    projects: 10,
    references: 1000,
    referenceOveragePrice: "0.03",
    prioritySupport: true,
  },
};

export const INVOICE_CREDITS_TOP_UP_PRODUCT_ID = "ai_credits_top_up";

export const INVOICE_PRODUCT_NAME_FALLBACKS: Record<string, string> = {
  [PLANS.FREE]: "Free",
  [LEGACY_PLANS.BASIC]: "Basic",
  [LEGACY_PLANS.BASIC_YEARLY]: "Basic",
  [LEGACY_PLANS.PRO]: "Pro",
  [LEGACY_PLANS.PRO_YEARLY]: "Pro",
};

export const INVOICE_TABLE_COLUMN_COUNT = 4;

export const BILLING_PLAN_SKELETON_KEYS = [
  PLANS.STARTER,
  PLANS.GROWTH,
  PLANS.SCALE,
] as const;

export const BILLING_PLAN_FEATURE_SKELETON_KEYS = [
  "feature-1",
  "feature-2",
  "feature-3",
  "feature-4",
  "feature-5",
  "feature-6",
] as const;

export const BILLING_INVOICE_SKELETON_ROWS = 3;

export const INVOICE_SKELETON_COLUMN_WIDTHS = [
  "140px",
  "1fr",
  "120px",
  "120px",
] as const;

export const USAGE_METRIC_SKELETON_KEYS = [
  "answers",
  "credits",
  "pull-request-credits",
] as const;

export const USAGE_FEATURE_SKELETON_KEYS = [
  "feature-1",
  "feature-2",
  "feature-3",
  "feature-4",
] as const;

export const ZDR_ADDON_BY_TIER: Record<string, string> = {
  [PLANS.STARTER]: ADDONS.ZDR_STARTER,
  [PLANS.GROWTH]: ADDONS.ZDR_GROWTH,
  [PLANS.SCALE]: ADDONS.ZDR_SCALE,
};

export const ZDR_ADDON_PREFIX = "zdr_";
export const ANNUAL_ADDON_SUFFIX = "_annual";
export const ZDR_ADDON_ANCHOR = "zdr";
export const ZDR_CHECKOUT_SUCCESS_PARAM = "zdrCheckout";
export const PLANS_ANCHOR = "plans";

export const AUTUMN_ORGANIZATION_HEADER = "x-notra-organization";

export const USAGE_RANGES = ["7d", "30d", "90d"] as const;

export const USAGE_FEATURE_ORDER: readonly string[] = [
  FEATURES.AI_ANSWERS,
  FEATURES.IMAGE_GENERATIONS,
  FEATURES.LONG_FORM_POSTS,
  FEATURES.SOCIAL_POSTS,
  FEATURES.PROJECTS,
  FEATURES.REFERENCES,
  FEATURES.TEAM_MEMBERS,
  FEATURES.WORKFLOWS,
  FEATURES.INTEGRATIONS,
];

export const USAGE_ANSWERS_ACCENT = "#10b981";
export const USAGE_PULL_REQUEST_CREDITS_ACCENT = "#f59e0b";
export const USAGE_CHART_ACCENT = "#8b5cf6";

export const USAGE_ANSWERS_CHART_CONFIG = {
  ai_answers: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;
