import type { OnboardingHeardAboutNotraSource } from "@notra/schemas/types/dashboard/onboarding";
import { useTranslations } from "use-intl";

export function useHeardAboutLabels(): Record<
  OnboardingHeardAboutNotraSource,
  string
> {
  const t = useTranslations("onboarding.heardAbout");
  const tLabels = useTranslations("common.labels");
  return {
    x: t("x"),
    linkedin: tLabels("linkedin"),
    github: tLabels("github"),
    search: t("search"),
    blog_or_newsletter: t("blog_or_newsletter"),
    friend_or_colleague: t("friend_or_colleague"),
    other: tLabels("otherNeuter"),
  };
}
