export const FEATURES = {
  TEAM_MEMBERS: "team_members",
  AI_CREDITS: "ai_credits",
  AI_ANSWERS: "ai_answers",
  LONG_FORM_POSTS: "long_form_posts",
  SOCIAL_POSTS: "social_posts",
  IMAGE_GENERATIONS: "image_generations",
  PROJECTS: "projects",
  WORKFLOWS: "workflows",
  INTEGRATIONS: "integrations",
  REFERENCES: "references",
  LOG_RETENTION_7_DAYS: "log_retention_7_days",
  LOG_RETENTION_14_DAYS: "log_retention_14_days",
  LOG_RETENTION_30_DAYS: "log_retention_30_days",
  ZDR: "zdr",
} as const;

export const PLANS = {
  FREE: "free",
  STARTER: "starter",
  STARTER_ANNUAL: "starter_annual",
  GROWTH: "growth",
  GROWTH_ANNUAL: "growth_annual",
  SCALE: "scale",
  SCALE_ANNUAL: "scale_annual",
} as const;

export const LEGACY_PLANS = {
  BASIC: "basic",
  BASIC_YEARLY: "basic_yearly",
  PRO: "pro",
  PRO_YEARLY: "pro_yearly",
} as const;

export const ACTIVE_PAID_PLAN_IDS: Set<string> = new Set([
  PLANS.STARTER,
  PLANS.STARTER_ANNUAL,
  PLANS.GROWTH,
  PLANS.GROWTH_ANNUAL,
  PLANS.SCALE,
  PLANS.SCALE_ANNUAL,
]);

export const LEGACY_PLAN_IDS: Set<string> = new Set(
  Object.values(LEGACY_PLANS)
);

export const PAID_OR_LEGACY_PLAN_IDS: Set<string> = new Set([
  ...ACTIVE_PAID_PLAN_IDS,
  ...LEGACY_PLAN_IDS,
]);

export const ADDONS = {
  AI_CREDITS_TOPUP: "ai_credits_top_up",
  ZDR_STARTER: "zdr_starter",
  ZDR_GROWTH: "zdr_growth",
  ZDR_SCALE: "zdr_scale",
} as const;

export const TOPUP_MIN_DOLLARS = 5;
export const TOPUP_MAX_DOLLARS = 500;

export const TOPUP_PRESETS = [5, 10, 25, 50] as const;

export type FeatureId = (typeof FEATURES)[keyof typeof FEATURES];
