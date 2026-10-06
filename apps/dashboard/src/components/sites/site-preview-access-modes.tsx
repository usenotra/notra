"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import { useTranslations } from "use-intl";

import { SITE_PREVIEW_ACCESS_MODES } from "@/constants/site-preview-access";
import { cn } from "@/lib/utils";
import type { SitePreviewAccessModesProps } from "@/types/components/site-preview-access";
import type { SitePreviewAccessMode } from "@/types/site-preview-access";

export function SitePreviewAccessModes({
  idPrefix: id,
  mode,
  onModeChange,
}: SitePreviewAccessModesProps) {
  const t = useTranslations("sites.previewAccess");
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{t("whoLabel")}</legend>
      <RadioGroup
        className="divide-border gap-0 divide-y overflow-hidden rounded-lg border"
        onValueChange={(next) => onModeChange(next as SitePreviewAccessMode)}
        value={mode}
      >
        {SITE_PREVIEW_ACCESS_MODES.map((option) => (
          <label
            className={cn(
              "flex h-11 cursor-pointer items-center gap-3 px-3 text-sm transition-colors duration-150",
              option.mode === mode ? "bg-muted/60" : "hover:bg-muted/40"
            )}
            htmlFor={`${id}-${option.mode}`}
            key={option.mode}
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
              icon={option.icon}
              strokeWidth={1.5}
            />
            <span className="flex-1 font-medium">
              {t(`modes.${option.mode}.title`)}
            </span>
            <RadioGroupItem id={`${id}-${option.mode}`} value={option.mode} />
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
