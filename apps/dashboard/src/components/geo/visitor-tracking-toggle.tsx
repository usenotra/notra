"use client";

import { Switch } from "@notra/ui/components/ui/switch";
import { useId } from "react";
import { useTranslations } from "use-intl";

import { useSetTrackVisitors } from "@/lib/hooks/use-geo";
import type { VisitorTrackingToggleProps } from "@/types/geo";

export function VisitorTrackingToggle({
  organizationId,
  enabled,
  siteCounts,
}: VisitorTrackingToggleProps) {
  const t = useTranslations("geo.webVisitors");
  const id = useId();
  const setTracking = useSetTrackVisitors(organizationId);
  const checked = setTracking.isPending
    ? (setTracking.variables ?? enabled)
    : enabled;
  let copy = { title: t("trackTitle"), description: t("trackDescription") };
  if (checked) {
    copy = { title: t("trackOn"), description: t("trackOnDescription") };
  } else if (siteCounts) {
    copy = {
      title: t("trackSiteTitle"),
      description: t("trackSiteDescription"),
    };
  }
  return (
    <div className="border-shell-border bg-shell flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
      <div className="min-w-0">
        <label className="text-sm font-medium" htmlFor={id}>
          {copy.title}
        </label>
        <p className="text-muted-foreground text-sm">{copy.description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={setTracking.isPending}
        id={id}
        onCheckedChange={(next) => setTracking.mutate(next)}
      />
    </div>
  );
}
