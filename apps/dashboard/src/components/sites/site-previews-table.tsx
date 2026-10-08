"use client";

import {
  ArrowUpRight01Icon,
  GitBranchIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  Globe02Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteMeta } from "@/components/sites/site-meta";
import { SitePreviewDeleteDialog } from "@/components/sites/site-preview-delete-dialog";
import { SitePreviewRowMenu } from "@/components/sites/site-preview-row-menu";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import {
  SITE_TABLE_COMPACT_EMPTY_HEIGHT,
  SITE_TABLE_EMPTY_HEIGHT,
} from "@/constants/sites";
import { useSitePreviewLinks } from "@/lib/hooks/use-site-preview-links";
import { useRouter } from "@/lib/navigation";
import type {
  SiteOpenPreviewButtonProps,
  SitePreviewsTableProps,
} from "@/types/components/sites";
import type { SitePreviewRow } from "@/types/sites";
import { commitTitle, shortSha } from "@/utils/site-deployments";
import {
  displayUrl,
  githubPullRequestUrl,
  siteDeploymentHref,
} from "@/utils/site-links";

function OpenPreviewButton({
  label,
  tooltip,
  disabled,
  onOpen,
}: SiteOpenPreviewButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={disabled}
            onClick={onOpen}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={1.5} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function SitePreviewsTable({
  organizationId,
  organizationSlug,
  siteId,
  rows,
  repository,
  compact = false,
  emptyState,
}: SitePreviewsTableProps) {
  const t = useTranslations("sites.previewsPage");
  const tVisibility = useTranslations("sites.visibility");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<SitePreviewRow | null>(null);
  const rowHref = (row: SitePreviewRow) =>
    siteDeploymentHref(organizationSlug, siteId, row.latestDeploymentId);

  const { openPreview, copyShareLink } = useSitePreviewLinks({
    organizationId,
    siteId,
  });

  const previewColumn: TableColumn<SitePreviewRow> = {
    key: "preview",
    header: t("columns.preview"),
    width: "1.3fr",
    minWidth: "10rem",
    cell: (row) => {
      const prUrl = githubPullRequestUrl(repository, row.pullRequestNumber);
      const name = row.branch ?? row.previewKey;
      return (
        <span className="flex min-w-0 items-start gap-2.5">
          <HugeiconsIcon
            aria-hidden="true"
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
            icon={row.pullRequestNumber ? GitPullRequestIcon : GitBranchIcon}
            strokeWidth={1.5}
          />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate font-medium" title={name}>
                {name}
              </span>
              {row.pullRequestNumber && prUrl ? (
                <a
                  className="text-muted-foreground hover:text-foreground shrink-0 text-sm tabular-nums hover:underline"
                  href={prUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t("pullRequest", { number: row.pullRequestNumber })}
                </a>
              ) : null}
            </span>
            {compact ? null : (
              <span
                className="text-muted-foreground truncate text-xs"
                title={row.url}
              >
                {displayUrl(row.url)}
              </span>
            )}
          </span>
        </span>
      );
    },
  };

  const statusColumn: TableColumn<SitePreviewRow> = {
    key: "status",
    header: tCommon("labels.status"),
    width: "6.75rem",
    cell: (row) => <SiteStatusDot status={row.status} />,
  };

  const commitColumn: TableColumn<SitePreviewRow> = {
    key: "commit",
    header: tCommon("labels.commit"),
    width: "1.2fr",
    minWidth: "12rem",
    collapsePriority: 3,
    cell: (row) => {
      const title = commitTitle(row.commitMessage);
      return (
        <span className="flex min-w-0 flex-col">
          <span className="truncate" title={title ?? undefined}>
            {title ?? (
              <span className="text-muted-foreground">
                {t("noCommitMessage")}
              </span>
            )}
          </span>
          {row.commitSha ? (
            <SiteMeta className="text-xs" icon={GitCommitIcon} mono>
              {shortSha(row.commitSha)}
            </SiteMeta>
          ) : null}
        </span>
      );
    },
  };

  const accessColumn: TableColumn<SitePreviewRow> = {
    key: "access",
    header: t("columns.access"),
    width: "7.5rem",
    collapsePriority: 2,
    cell: (row) => {
      if (!row.visibility) {
        return compact ? (
          <SiteStatusDot status={row.status} />
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      }
      const isProtected = row.visibility === "protected";
      return (
        <SiteMeta icon={isProtected ? SquareLock02Icon : Globe02Icon}>
          {isProtected
            ? tVisibility("protected.title")
            : tVisibility("public.title")}
        </SiteMeta>
      );
    },
  };

  const updatedColumn: TableColumn<SitePreviewRow> = {
    key: "updated",
    header: tCommon("labels.updated"),
    width: "8.5rem",
    align: "right",
    collapsePriority: 1,
    cell: (row) => (
      <SiteRelativeTime
        className="text-muted-foreground whitespace-nowrap"
        date={row.updatedAt}
      />
    ),
  };

  const actionsColumn: TableColumn<SitePreviewRow> = {
    key: "actions",
    header: <span className="sr-only">{tCommon("labels.actions")}</span>,
    width: compact ? "3.25rem" : "4.75rem",
    align: "right",
    cell: (row) => (
      <span className="flex items-center justify-end gap-1">
        <OpenPreviewButton
          disabled={!row.served}
          label={t("openLabel", { name: row.branch ?? row.previewKey })}
          onOpen={() => openPreview(row)}
          tooltip={t("open")}
        />
        {compact ? null : (
          <SitePreviewRowMenu
            onCopyShareLink={() => copyShareLink(row)}
            onDelete={() => setDeleteTarget(row)}
            onViewDeployment={() => router.push(rowHref(row))}
            row={row}
          />
        )}
      </span>
    ),
  };

  const columns = compact
    ? [previewColumn, commitColumn, accessColumn, updatedColumn, actionsColumn]
    : [
        previewColumn,
        statusColumn,
        commitColumn,
        accessColumn,
        updatedColumn,
        actionsColumn,
      ];

  return (
    <>
      <DataTable
        autoHeight
        columns={columns}
        data={rows}
        emptyState={emptyState}
        getRowId={(row) => row.previewKey}
        height={
          compact ? SITE_TABLE_COMPACT_EMPTY_HEIGHT : SITE_TABLE_EMPTY_HEIGHT
        }
        onRowClick={(row) => router.push(rowHref(row))}
        onRowPointerEnter={(row) => router.prefetch(rowHref(row))}
        rowSizing="content"
        scrollFade={false}
      />
      {compact ? null : (
        <SitePreviewDeleteDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          organizationId={organizationId}
          preview={deleteTarget}
          siteId={siteId}
        />
      )}
    </>
  );
}
