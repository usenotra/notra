"use client";

import { formatGeoJourneyChip } from "@notra/geo-core/utils/ai-traffic";
import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { DirectionDonut } from "@/components/geo/directions/direction-donut";
import { DirectionEngineBars } from "@/components/geo/directions/direction-engine-bars";
import { DirectionPagesTable } from "@/components/geo/directions/direction-pages-table";
import {
  GEO_DIRECTIONS_CHECK_COUNT,
  GEO_DIRECTIONS_COMPANY,
  GEO_DIRECTIONS_ENGINE_COUNT,
  GEO_DIRECTIONS_JOURNEYS,
  GEO_DIRECTIONS_VISIBILITY,
  GEO_DIRECTIONS_VISIBILITY_DELTA,
  GEO_DIRECTIONS_LAST_SCAN,
} from "@/constants/geo-directions";
import { formatMentionRate } from "@/utils/geo-charts";

const LEAD_JOURNEY = GEO_DIRECTIONS_JOURNEYS[0];

export function DirectionReport() {
  const t = useTranslations("geo.directions");
  const tGeoShared = useTranslations("geo.shared");
  const format = useFormatter();
  const search = tGeoShared("search");
  const strong = (chunks: ReactNode) => (
    <span className="text-foreground font-semibold">{chunks}</span>
  );

  return (
    <article className="mx-auto max-w-2xl space-y-10">
      <header className="space-y-4">
        <p className="text-muted-foreground text-xs first-letter:uppercase">
          {t("report.meta", {
            week: t("report.weekOf", {
              date: format.dateTime(new Date(GEO_DIRECTIONS_LAST_SCAN), {
                month: "short",
                day: "numeric",
              }),
            }),
            checks: GEO_DIRECTIONS_CHECK_COUNT,
            engines: GEO_DIRECTIONS_ENGINE_COUNT,
          })}
        </p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight">
          {t.rich("report.headline", {
            company: GEO_DIRECTIONS_COMPANY,
            rate: formatMentionRate(GEO_DIRECTIONS_VISIBILITY),
            delta: GEO_DIRECTIONS_VISIBILITY_DELTA,
            up: (chunks) => <span className="text-geo-up">{chunks}</span>,
          })}
        </h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("report.winTitle", { search })}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.rich("report.winBody", { search, strong })}
        </p>
        <DirectionEngineBars />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("report.changelogTitle")}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.rich("report.changelogBody", { strong })}
        </p>
        <DirectionPagesTable />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("report.shareTitle")}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.rich("report.shareBody", { strong })}
        </p>
        <DirectionDonut />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("report.agentsTitle")}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.rich("report.agentsBody", {
            journey: formatGeoJourneyChip(LEAD_JOURNEY?.journeyId ?? ""),
            strong,
            chip: (chunks) => (
              <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-xs">
                {chunks}
              </span>
            ),
            path: (chunks) => (
              <span className="text-foreground font-mono text-xs">
                {chunks}
              </span>
            ),
          })}
        </p>
      </section>
    </article>
  );
}
