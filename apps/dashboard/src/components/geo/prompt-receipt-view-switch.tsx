"use client";

import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import { useTranslations } from "next-intl";

import type { PromptReceiptViewSwitchProps } from "@/types/geo";

export function PromptReceiptViewSwitch({
  view,
  onChange,
}: PromptReceiptViewSwitchProps) {
  const t = useTranslations("geo.promptReceiptViewSwitch");
  return (
    <PermissionRow
      className="w-fit shrink-0"
      label={t("groupLabel")}
      layout="compact"
      onValueChange={(value) => {
        if (value === "analysis" || value === "raw") {
          onChange(value);
        }
      }}
      value={view}
    >
      <PermissionOption value="analysis">{t("analysis")}</PermissionOption>
      <PermissionOption value="raw">{t("raw")}</PermissionOption>
    </PermissionRow>
  );
}
