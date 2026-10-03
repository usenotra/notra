"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { EmptyStateAnalyticsPreview } from "@/components/empty-state-preview";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { trackEvent } from "@/lib/analytics/posthog-client";
import type { GeoSetupEmptyProps } from "@/types/geo";

export function GeoSetupEmpty({ organizationId, page }: GeoSetupEmptyProps) {
  const t = useTranslations("geo.geoSetupEmpty");
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_SETUP_EMPTY_VIEWED, { page: page ?? null });
  }, [page]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
      >
        <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_100%)] opacity-[0.38]">
          <EmptyStateAnalyticsPreview />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pt-16 pb-8 text-center">
        <h3 className="text-lg font-semibold text-balance">{t("title")}</h3>
        <p className="text-muted-foreground mt-1.5 max-w-md text-sm leading-relaxed text-pretty">
          {t("description")}
        </p>
        <GeoSetupButton
          className="mt-6"
          organizationId={organizationId}
          size="sm"
        >
          {t("action")}
        </GeoSetupButton>
      </div>
    </div>
  );
}
