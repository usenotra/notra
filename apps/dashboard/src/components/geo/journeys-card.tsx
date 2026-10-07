"use client";

import { Route01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GeoJourney } from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoSource,
} from "@notra/geo-core/utils/ai-traffic";
import {
  InstrumentEmpty,
  InstrumentModule,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import {
  InfiniteDataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import { EngineIcon } from "@/components/geo/engine-icon";
import { JourneyEmpty } from "@/components/geo/journey-empty";
import { JourneyPathSummary } from "@/components/geo/journey-path-summary";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneysCardProps } from "@/types/geo";
import { withGeoProject } from "@/utils/geo-paths";
import { tableHeightFor } from "@/utils/table";

const JOURNEYS_PAGE_SIZE = 50;

export function JourneysCard({
  failed,
  journeys,
  organizationSlug,
  onOpenJourney,
  onPrefetchJourney,
  loading = false,
}: JourneysCardProps) {
  const t = useTranslations("geo.journeysCard");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const [limit, setLimit] = useState(JOURNEYS_PAGE_SIZE);
  const { projectId } = useGeoProjectScope();
  const hasMore = limit < journeys.length;

  const columns: TableColumn<GeoJourney>[] = [
    {
      key: "source",
      header: tCommon("labels.source"),
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <button
          aria-label={t("openJourney", {
            source: formatGeoSource(row.source),
            time: formatAiTrafficTimestamp(row.lastSeenAt, locale),
          })}
          className="focus-visible:ring-ring flex min-h-8 w-full min-w-0 items-center gap-2 rounded-sm text-left text-sm hover:underline focus-visible:ring-2"
          onClick={() => onOpenJourney(row)}
          type="button"
        >
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
        </button>
      ),
      sortValue: (row) => formatGeoSource(row.source),
    },
    {
      key: "pages",
      header: tGeoShared("pages"),
      width: "5.625rem",
      sortable: true,
      cell: (row) => <span className="text-sm tabular-nums">{row.pages}</span>,
    },
    {
      key: "lastSeenAt",
      header: tGeoShared("lastSeen"),
      width: "9.375rem",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt, locale)}
        </span>
      ),
    },
    {
      key: "entryPath",
      header: tGeoShared("path"),
      width: "2fr",
      cell: (row) => (
        <JourneyPathSummary
          distinctPaths={row.distinctPaths}
          entryPath={row.entryPath}
          paths={row.samplePaths}
        />
      ),
      sortValue: (row) => row.entryPath,
    },
  ];

  if (journeys.length === 0) {
    return (
      <InstrumentModule eyebrow={tGeoShared("agentJourneys")}>
        {failed ? (
          <InstrumentEmpty
            message={t("loadFailed")}
            seed="geo-journeys-error"
          />
        ) : (
          <JourneyEmpty
            action={
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={withGeoProject(
                      `/${organizationSlug}/geo/traffic`,
                      projectId
                    )}
                  />
                }
              >
                {t("viewAiTraffic")}
              </Button>
            }
            className="min-h-72 px-6 py-10 [&_h3]:text-lg"
            description={t("emptyDescription")}
            media={<HugeiconsIcon icon={Route01Icon} className="size-5" />}
            title={t("emptyTitle")}
          />
        )}
      </InstrumentModule>
    );
  }

  return (
    <InstrumentSection eyebrow={tGeoShared("agentJourneys")}>
      <InfiniteDataTable
        columns={columns}
        data={journeys}
        defaultSort={{ key: "lastSeenAt", direction: "desc" }}
        emptyState={tGeoShared("noAgentJourneysCapturedYet")}
        getRowId={(row) => row.journeyId}
        height={tableHeightFor(journeys.length)}
        loading={loading}
        onEndReached={
          hasMore
            ? () => setLimit((value) => value + JOURNEYS_PAGE_SIZE)
            : undefined
        }
        onRowClick={onOpenJourney}
        onRowPointerEnter={onPrefetchJourney}
        visibleRowCount={limit}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </InstrumentSection>
  );
}
