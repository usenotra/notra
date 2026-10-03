"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "use-intl";

import { useGeoLiveStatus } from "@/components/providers/geo-live-provider";

/**
 * "Live" next to a GEO page header while updates stream in. The dot rings
 * once per announcement, keyed on the update count, so it draws the eye only
 * when the numbers on the page are about to change.
 */
export function GeoLiveIndicator() {
  const t = useTranslations("geo.liveIndicator");
  const { connected, updates } = useGeoLiveStatus();

  if (!connected) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={`${t("label")}: ${t("hint")}`}
            className="text-muted-foreground geo-live-in inline-flex h-8 cursor-help items-center gap-2 px-1 text-xs font-medium"
            type="button"
          />
        }
      >
        <span aria-hidden="true" className="relative flex size-2">
          {updates > 0 ? (
            <span
              className="bg-success/60 geo-live-ping absolute inline-flex size-full rounded-full"
              key={updates}
            />
          ) : null}
          <span className="bg-success relative inline-flex size-2 rounded-full" />
        </span>
        {t("label")}
      </TooltipTrigger>
      <TooltipContent>{t("hint")}</TooltipContent>
    </Tooltip>
  );
}
