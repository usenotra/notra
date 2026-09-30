"use client";

import { useTranslations } from "next-intl";

import { EmptyStateTrafficPreview } from "@/components/empty-state-preview";
import { GeoIngestSetup } from "@/components/geo/geo-ingest-setup";
import type { TrafficEmptyProps } from "@/types/geo";

export function TrafficEmpty({ setup }: TrafficEmptyProps) {
  const t = useTranslations("geo.trafficEmpty");
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
      >
        <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_100%)] opacity-[0.38]">
          <EmptyStateTrafficPreview />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pt-8 pb-4 text-center">
        <h3 className="text-lg font-semibold text-balance">{t("title")}</h3>
        <p className="text-muted-foreground mt-1.5 max-w-md text-sm leading-relaxed text-pretty">
          {t("description")}
        </p>
        <div className="mt-6 w-full text-left">
          <GeoIngestSetup
            className="border-border/80 bg-card rounded-2xl border p-4 sm:p-5"
            setup={setup}
          />
        </div>
      </div>
    </div>
  );
}
