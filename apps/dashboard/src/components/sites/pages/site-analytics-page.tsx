"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import Link from "@/components/framework/link";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { WebVisitorsSection } from "@/components/geo/web-visitors-section";
import { useSite } from "@/components/sites/site-context";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { useSiteAnalytics } from "@/lib/hooks/use-sites";
import { siteHref } from "@/utils/site-links";

export function SiteAnalyticsPage() {
  const t = useTranslations("sites.analyticsPage");
  const { organizationId, organizationSlug, siteId, detail, liveDeployment } =
    useSite();
  const analyticsOn = detail.site.analyticsEnabled;
  const geoRange = useGeoRange();
  const query = useSiteAnalytics(organizationId, siteId, geoRange.query);
  const data = query.data;
  const hasVisits =
    data !== undefined &&
    (data.web.totals.views > 0 ||
      data.traffic.sources.some((source) => source.visits > 0));
  const hadVisitsBefore =
    data !== undefined &&
    (data.web.totals.previousViews > 0 ||
      data.traffic.sources.some((source) => (source.previousVisits ?? 0) > 0));
  const settingsLink = (
    <Link
      className={buttonVariants({ variant: "outline" })}
      href={siteHref(organizationSlug, siteId, "settings")}
    >
      {t("offAction")}
    </Link>
  );

  let emptyState: ReactNode = null;
  if (data !== undefined && !hasVisits) {
    if (!analyticsOn) {
      emptyState = (
        <EmptyState
          action={settingsLink}
          description={t("offDescription")}
          title={t("offTitle")}
        />
      );
    } else if (hadVisitsBefore) {
      emptyState = (
        <EmptyState
          description={t("emptyRangeDescription")}
          title={t("emptyRangeTitle")}
        />
      );
    } else {
      emptyState = (
        <EmptyState
          description={
            liveDeployment
              ? t("emptyDescription")
              : t("notPublishedDescription")
          }
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.traffic}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={liveDeployment ? t("emptyTitle") : t("notPublishedTitle")}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading description={t("description")} title={t("title")}>
        <GeoRangePicker control={geoRange} />
      </PageHeading>
      {query.isError && data === undefined ? (
        <EmptyState
          description={t("errorDescription")}
          title={t("errorTitle")}
        />
      ) : null}
      {data === undefined && !query.isError ? (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : null}
      {emptyState}
      {data !== undefined && hasVisits ? (
        <WebVisitorsSection
          engagement={data.engagement}
          range={geoRange.query}
          traffic={data.traffic}
          web={data.web}
        />
      ) : null}
    </div>
  );
}
