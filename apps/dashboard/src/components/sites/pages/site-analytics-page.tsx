"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import Link from "@/components/framework/link";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { WebVisitorsSection } from "@/components/geo/web-visitors-section";
import { useSite } from "@/components/sites/site-context";
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
  const canShowAnalytics = data?.web.configured && (hasVisits || analyticsOn);
  const settingsLink = (
    <Link
      className={buttonVariants({ variant: "outline" })}
      href={siteHref(organizationSlug, siteId, "settings")}
    >
      {t("offAction")}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeading description={t("description")} title={t("title")}>
        <GeoRangePicker control={geoRange} />
      </PageHeading>
      {(query.isError && data === undefined) ||
      (data !== undefined &&
        !data.web.configured &&
        (hasVisits || analyticsOn)) ? (
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
      {data !== undefined && !hasVisits && !analyticsOn ? (
        <EmptyState
          action={settingsLink}
          description={t("offDescription")}
          title={t("offTitle")}
        />
      ) : null}
      {canShowAnalytics && !liveDeployment ? (
        <Alert>
          <AlertTitle>{t("notPublishedTitle")}</AlertTitle>
          <AlertDescription>{t("notPublishedDescription")}</AlertDescription>
        </Alert>
      ) : null}
      {data !== undefined && canShowAnalytics ? (
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
