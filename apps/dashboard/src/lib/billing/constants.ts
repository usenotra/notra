export const FEATURES = {
  TEAM_MEMBERS: "team_members",
  AI_CREDITS: "ai_credits",
  WORKFLOWS: "workflows",
  INTEGRATIONS: "integrations",
  LOG_RETENTION_7_DAYS: "log_retention_7_days",
  LOG_RETENTION_30_DAYS: "log_retention_30_days",
} as const;

export type FeatureId = (typeof FEATURES)[keyof typeof FEATURES];
