import { useTranslations } from "next-intl";

import type { WizardStep, WizardStepLabel } from "@/types/content/create";

export function useWizardStepLabels(): Record<WizardStep, WizardStepLabel> {
  const t = useTranslations("content.create.dialog");
  const tLabels = useTranslations("common.labels");
  const tShared = useTranslations("content.shared");
  return {
    formats: {
      title: tShared("createContent"),
      label: t("steps.formats.label"),
    },
    activity: {
      title: tLabels("activity"),
      label: tLabels("activity"),
    },
    identities: {
      title: tLabels("brandIdentityTitle"),
      label: tLabels("identity"),
    },
  };
}
