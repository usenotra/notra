import { ONBOARDING_WEBSITE_PREFIX_REGEX } from "@notra/geo-core/constants/website-url";
import { ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES } from "@notra/schemas/constants/dashboard/onboarding";
import type { OnboardingHeardAboutNotraSource } from "@notra/schemas/types/dashboard/onboarding";

import { ONBOARDING_HEARD_ABOUT_NOTRA_LABELS } from "@/constants/onboarding";

export function isHeardAboutNotraSource(
  value: string | null | undefined
): value is OnboardingHeardAboutNotraSource {
  return ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES.some(
    (source) => source === value
  );
}

export function getHeardAboutNotraLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return isHeardAboutNotraSource(value)
    ? ONBOARDING_HEARD_ABOUT_NOTRA_LABELS[value]
    : value;
}

export function stripWebsitePrefix(value: string): string {
  return value.replace(ONBOARDING_WEBSITE_PREFIX_REGEX, "");
}
