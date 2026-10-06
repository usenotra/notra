"use client";

import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { useTranslations } from "use-intl";

import { useSite } from "@/components/sites/site-context";
import type { SitePreviewBuildToggleProps } from "@/types/components/site-preview-access";

export function SitePreviewBuildToggle({
  id,
  enabled,
  onEnabledChange,
}: SitePreviewBuildToggleProps) {
  const t = useTranslations("sites.previewAccess");
  const { detail } = useSite();
  const { site } = detail;
  const openPreviewCount = detail.previews.length;

  return (
    <div className="space-y-2">
      <div className="flex h-11 items-center justify-between gap-4 rounded-lg border px-3">
        <Label htmlFor={id}>{t("buildLabel")}</Label>
        <Switch checked={enabled} id={id} onCheckedChange={onEnabledChange} />
      </div>
      {site.previewsEnabled && !enabled ? (
        <p className="text-muted-foreground bg-muted rounded-lg px-3 py-2 text-sm text-pretty">
          {openPreviewCount > 0
            ? t("buildOffWarning", { count: openPreviewCount })
            : t("buildOffHint")}
        </p>
      ) : null}
    </div>
  );
}
