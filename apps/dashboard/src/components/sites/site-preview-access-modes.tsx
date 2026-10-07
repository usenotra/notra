"use client";

import { Label } from "@notra/ui/components/ui/label";
import { useTranslations } from "use-intl";

import { SITE_PREVIEW_ACCESS_MODES } from "@/constants/site-preview-access";
import type { SitePreviewAccessModesProps } from "@/types/components/site-preview-access";
import type { SitePreviewAccessMode } from "@/types/site-preview-access";

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
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        id={`${id}-mode`}
        onChange={(event) =>
          onModeChange(event.target.value as SitePreviewAccessMode | "off")
        }
        value={mode}
      >
        {SITE_PREVIEW_ACCESS_MODES.map((option) => (
          <option
            id={`${id}-${option.mode}`}
            key={option.mode}
            value={option.mode}
          >
            {t(`modes.${option.mode}.title`)}
          </option>
        ))}
        <option value="off">{t("trigger.off")}</option>
      </select>
    </div>
  );
}
