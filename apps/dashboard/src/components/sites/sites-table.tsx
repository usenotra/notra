"use client";

import { GitBranchIcon, Github01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Table, type TableColumn } from "@/components/motion/table";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import { SITE_LIST_TABLE_ROW_HEIGHT } from "@/constants/sites";
import type { SiteListItem, SitesTableProps } from "@/types/sites";
import { displayUrl } from "@/utils/site-links";
import { tableHeightFor } from "@/utils/table";

export function SitesTable({ organizationSlug, sites }: SitesTableProps) {
  const t = useTranslations("sites.list");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("sites.detail");
  const router = useRouter();
  const siteHref = (site: SiteListItem) =>
    `/${organizationSlug}/sites/${site.id}`;

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
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <HugeiconsIcon
                aria-hidden="true"
                className="text-muted-foreground shrink-0"
                icon={Github01Icon}
                size={14}
              />
              <span className="truncate">
                {site.repository.owner}/{site.repository.name}
              </span>
            </span>
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
              <HugeiconsIcon
                aria-hidden="true"
                className="shrink-0"
                icon={GitBranchIcon}
                size={12}
              />
              <span className="truncate font-mono">
                {site.productionBranch}
              </span>
            </span>
          </span>
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
          return (
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <span
                aria-hidden="true"
                className="bg-muted-foreground/40 size-2 rounded-full"
              />
              {tDetail("offline")}
            </span>
          );
        }
        if (!site.latestDeployment) {
          return (
            <span className="text-muted-foreground text-xs">
              {t("noDeployments")}
            </span>
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
    <Table
      className="rounded-2xl"
      columns={columns}
      data={sites}
      getRowId={(site) => site.id}
      height={tableHeightFor(sites.length, SITE_LIST_TABLE_ROW_HEIGHT)}
      onRowClick={(site) => router.push(siteHref(site))}
      onRowPointerEnter={(site) => router.prefetch(siteHref(site))}
      rowHeight={SITE_LIST_TABLE_ROW_HEIGHT}
      scrollFade={false}
    />
  );
}
