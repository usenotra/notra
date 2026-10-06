"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { WebVisitorsSection } from "@/components/geo/web-visitors-section";
import { useSite } from "@/components/sites/site-context";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { useSiteAnalytics } from "@/lib/hooks/use-sites";

export function SiteAnalyticsPage() {
  const t = useTranslations("sites.analyticsPage");
  const { organizationId, siteId } = useSite();
  const geoRange = useGeoRange();
  const query = useSiteAnalytics(organizationId, siteId, geoRange.query);
  const data = query.data;
  const isEmpty =
    data !== undefined &&
    data.web.totals.views === 0 &&
    data.traffic.sources.length === 0;

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
      {isEmpty ? (
        <EmptyState
          description={t("emptyDescription")}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.traffic}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={t("emptyTitle")}
        />
      ) : null}
      {data !== undefined && !isEmpty ? (
        <WebVisitorsSection
          range={geoRange.query}
          traffic={data.traffic}
          web={data.web}
        />
      ) : null}
    </div>
  );
}
