"use client";

import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useTranslations } from "use-intl";

import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteRepositoryHoverCard } from "@/components/sites/site-repository-hover-card";
import {
  SiteOfflineStatus,
  SiteStatusDot,
} from "@/components/sites/site-status-dot";
import { SITE_LIST_TABLE_ROW_HEIGHT } from "@/constants/sites";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRouter } from "@/lib/navigation";
import type { SitesTableProps } from "@/types/components/sites";
import type { SiteListItem } from "@/types/sites";
import { displayUrl, siteHref } from "@/utils/site-links";
import { paginatedTableHeightFor } from "@/utils/table";

export function SitesTable({
  organizationId,
  organizationSlug,
  sites,
}: SitesTableProps) {
  const t = useTranslations("sites.list");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const columns: TableColumn<SiteListItem>[] = [
    {
      key: "name",
      header: t("columns.site"),
      width: "1.4fr",
      minWidth: "14rem",
      sortable: true,
      cell: (site) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{site.name}</span>
          <a
            className="text-muted-foreground hover:text-foreground w-fit max-w-full truncate text-xs hover:underline"
            href={site.liveUrl}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            {displayUrl(site.liveUrl)}
          </a>
        </span>
      ),
    },
    {
      key: "repository",
      header: tCommon("labels.repository"),
      width: "1.2fr",
      minWidth: "12rem",
      collapsePriority: 2,
      sortValue: (site) =>
        site.repository
          ? `${site.repository.owner}/${site.repository.name}`
          : "",
      cell: (site) =>
        site.repository ? (
          <SiteRepositoryHoverCard
            branch={site.productionBranch}
            name={site.repository.name}
            organizationId={organizationId}
            owner={site.repository.owner}
            siteId={site.id}
          />
        ) : (
          <span className="text-muted-foreground">{t("notConnected")}</span>
        ),
    },
    {
      key: "status",
      header: tCommon("labels.status"),
      width: "8.5rem",
      sortValue: (site) => site.latestDeployment?.status ?? "",
      cell: (site) => {
        if (site.status === "suspended") {
          return <SiteOfflineStatus />;
        }
        if (!site.latestDeployment) {
          return (
            <span className="text-muted-foreground">{t("noDeployments")}</span>
          );
        }
        return (
          <SiteStatusDot
            live={site.latestDeployment.live}
            status={site.latestDeployment.status}
          />
        );
      },
    },
    {
      key: "updated",
      header: t("columns.lastDeployment"),
      width: "9rem",
      align: "right",
      collapsePriority: 1,
      sortable: true,
      sortValue: (site) =>
        site.latestDeployment
          ? new Date(site.latestDeployment.createdAt).getTime()
          : 0,
      cell: (site) =>
        site.latestDeployment ? (
          <SiteRelativeTime
            className="text-muted-foreground"
            date={site.latestDeployment.createdAt}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sites}
      getRowId={(site) => site.id}
      height={paginatedTableHeightFor(sites.length, SITE_LIST_TABLE_ROW_HEIGHT)}
      onRowClick={(site) => router.push(siteHref(organizationSlug, site.id))}
      onRowPointerEnter={(site) =>
        router.prefetch(siteHref(organizationSlug, site.id))
      }
      headerHeight={TABLE_ROW_HEIGHT}
      rowHeight={SITE_LIST_TABLE_ROW_HEIGHT}
      scrollFade={false}
    />
  );
}
