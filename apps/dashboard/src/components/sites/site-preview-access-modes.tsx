"use client";

import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "use-intl";

import { SITE_PREVIEW_ACCESS_MODES } from "@/constants/site-preview-access";
import type { SitePreviewAccessModesProps } from "@/types/components/site-preview-access";

export function SitePreviewAccessModes({
  idPrefix: id,
  mode,
  onModeChange,
}: SitePreviewAccessModesProps) {
  const t = useTranslations("sites.previewAccess");
  const items = [
    ...SITE_PREVIEW_ACCESS_MODES.map((option) => ({
      value: option.mode,
      label: t(`trigger.${option.mode}`),
    })),
    { value: "off" as const, label: t("trigger.off") },
  ];
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-mode`}>{t("whoLabel")}</Label>
      <Select
        items={items}
        onValueChange={(value) => {
          const next = items.find((item) => item.value === value);
          if (next) {
            onModeChange(next.value);
          }
        }}
        value={mode}
      >
        <SelectTrigger className="w-full" id={`${id}-mode`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
