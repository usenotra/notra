import { ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES } from "@notra/schemas/constants/dashboard/onboarding";

export const ONBOARDING_STEP_COUNT = 4;
export const ONBOARDING_STEP_WORKSPACE = 1;
export const ONBOARDING_STEP_VISIBILITY = 2;
export const ONBOARDING_STEP_COMPETITORS = 3;
export const ONBOARDING_STEP_PRICING = 4;
export const ONBOARDING_VISIBILITY_MAX_PROMPTS = 20;
export const ONBOARDING_VISIBLE_SUGGESTIONS = 3;
export const ONBOARDING_SUGGESTION_SKELETON_ROWS = [0, 1, 2, 3] as const;
export const ONBOARDING_FIELD_CLASS = "h-11 rounded-xl px-3.5";

export const ONBOARDING_HEARD_ABOUT_NOTRA_OPTIONS =
  ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES.map((value) => ({
    value,
  }));

export const ONBOARDING_EMAIL_PREFS = [
  { key: "marketingEmails" },
  { key: "dailySummary" },
] as const;
