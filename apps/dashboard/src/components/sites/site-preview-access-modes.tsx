"use client";

import { Label } from "@notra/ui/components/ui/label";
import { useTranslations } from "use-intl";

import { SITE_PREVIEW_ACCESS_MODES } from "@/constants/site-preview-access";
import type { SitePreviewAccessModesProps } from "@/types/components/site-preview-access";

export function SitePreviewAccessModes({
  idPrefix: id,
  mode,
  onModeChange,
}: SitePreviewAccessModesProps) {
  const t = useTranslations("sites.previewAccess");
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-mode`}>{t("whoLabel")}</Label>
      <select
        className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:ring-2 md:text-sm"
        id={`${id}-mode`}
        onChange={(event) => {
          const next = SITE_PREVIEW_ACCESS_MODES.find(
            (option) => option.mode === event.target.value
          );
          onModeChange(next?.mode ?? "off");
        }}
        value={mode}
      >
        {SITE_PREVIEW_ACCESS_MODES.map((option) => (
          <option key={option.mode} value={option.mode}>
            {t(`trigger.${option.mode}`)}
          </option>
        ))}
        <option value="off">{t("trigger.off")}</option>
      </select>
    </div>
  );
}
