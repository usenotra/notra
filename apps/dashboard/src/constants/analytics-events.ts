export const PAYWALL_KINDS = {
  GEO_LOCKED: "geo_locked",
  TRIAL_EXPIRED: "trial_expired",
  UPGRADE_CARD: "upgrade_card",
  NAV_LOCK: "nav_lock",
} as const;

export const PLAN_SURFACES = {
  ONBOARDING: "onboarding",
  BILLING_PAGE: "billing_page",
  SIDEBAR: "sidebar",
  SIDEBAR_TRIAL_EXPIRED: "sidebar_trial_expired",
  GEO_PAYWALL: "geo_paywall",
} as const;

export const BILLING_INTERVALS = {
  MONTH: "month",
  YEAR: "year",
} as const;

export const ONBOARDING_STEPS = {
  WORKSPACE: "workspace",
  VISIBILITY: "visibility",
  COMPETITORS: "competitors",
  PRICING: "pricing",
} as const;

export const CALLBACK_DESTINATIONS = {
  ONBOARDING: "onboarding",
  DASHBOARD: "dashboard",
  BANNED: "banned",
  LOGIN: "login",
  RETURN_TO: "return_to",
} as const;

export const ANALYTICS_AUTH_METHODS = {
  PASSWORD: "password",
  GOOGLE: "google",
  GITHUB: "github",
  SSO: "sso",
  UNKNOWN: "unknown",
} as const;

export const WORKOS_AUTH_METHOD_TO_ANALYTICS: Record<
  string,
  (typeof ANALYTICS_AUTH_METHODS)[keyof typeof ANALYTICS_AUTH_METHODS]
> = {
  Password: ANALYTICS_AUTH_METHODS.PASSWORD,
  EmailVerification: ANALYTICS_AUTH_METHODS.PASSWORD,
  GoogleOAuth: ANALYTICS_AUTH_METHODS.GOOGLE,
  GitHubOAuth: ANALYTICS_AUTH_METHODS.GITHUB,
  SSO: ANALYTICS_AUTH_METHODS.SSO,
};

export const LOGIN_ERROR_CODES = {
  PASSWORD_REJECTED: "password_rejected",
  VERIFICATION_REJECTED: "verification_rejected",
} as const;

export const PASSWORD_RESET_OUTCOMES = {
  SENT: "sent",
  INVALID: "invalid",
  RATE_LIMITED: "rate_limited",
  FAILED: "failed",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export const QUOTA_FEATURES = {
  TEAM_MEMBERS: "team_members",
} as const;

export const ENTITLEMENT_FEATURES = {
  AI_ANSWERS: "ai_answers",
} as const;

export const ENTITLEMENT_SURFACES = {
  DASHBOARD: "dashboard",
} as const;

export const SUGGESTION_OUTCOMES = {
  OK: "ok",
  EMPTY: "empty",
  ERROR: "error",
} as const;

export const FIRST_LOGIN_WINDOW_MS = 60_000;

export const ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS = {
  NO_COMPANY_DOMAIN: "no_company_domain",
  WEBSITE_UNREACHABLE: "website_unreachable",
  RATE_LIMITED: "rate_limited",
  QUEUE_FAILED: "queue_failed",
} as const;

export const CHECKOUT_SURFACES = {
  SUCCESS_PAGE: "success_page",
} as const;
