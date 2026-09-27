import { useTranslations } from "next-intl";

import { AUTOMATION_OUTPUT_TYPES } from "@/constants/automation-output-types";

export function useOutputTypeLabel() {
  const t = useTranslations("automation.outputTypeLabels");
  const tLabels = useTranslations("common.labels");
  return (outputType: string) => {
    const known = AUTOMATION_OUTPUT_TYPES.find((type) => type === outputType);
    if (!known) {
      return outputType.replaceAll("_", " ");
    }
    if (known === "changelog" || known === "image") {
      return tLabels(known);
    }
    return t(known);
  };
}
