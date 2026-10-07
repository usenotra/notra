import { useTranslations } from "use-intl";

import type { UsageFeatureId } from "@/types/billing/usage-feature";
import type { FeatureData } from "@/types/hooks/billing";
import { isUsageFeatureId } from "@/utils/usage-feature-id";

export function useUsageFeatureName() {
  const t = useTranslations("billing");
  const tBillingShared = useTranslations("billing.shared");
  const tLabels = useTranslations("common.labels");
  const labels: Record<UsageFeatureId, string> = {
    team_members: t("features.team_members"),
    ai_credits: tLabels("credits"),
    pull_request_credits: t("shared.pullRequestCredits"),
    ai_answers: tBillingShared("aiAnswers"),
    long_form_posts: t("features.long_form_posts"),
    social_posts: t("features.social_posts"),
    image_generations: t("features.image_generations"),
    projects: tLabels("projects"),
    workflows: t("features.workflows"),
    integrations: tLabels("integrations"),
    references: tLabels("references"),
    log_retention_7_days: t("features.log_retention_7_days"),
    log_retention_14_days: t("features.log_retention_14_days"),
    log_retention_30_days: t("features.log_retention_30_days"),
    zdr: t("shared.zeroDataRetention"),
  };
  return (feature: Pick<FeatureData, "id" | "name">) =>
    isUsageFeatureId(feature.id) ? labels[feature.id] : feature.name;
}
