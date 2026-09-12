import type { ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES } from "../../constants/dashboard/onboarding";

export type OnboardingHeardAboutNotraSource =
  (typeof ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES)[number];

export interface OnboardingAttributionValue {
  heardAboutNotraSource: OnboardingHeardAboutNotraSource | "" | null;
  heardAboutNotraOther?: string | null;
}
