"use client";

import {
  ArrowUpRight01Icon,
  Delete02Icon,
  GitBranchIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  Globe02Icon,
  Link04Icon,
  MoreHorizontalIcon,
  Rocket01Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { Table, type TableColumn } from "@/components/motion/table";
import { SiteMeta } from "@/components/sites/site-meta";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import {
  SITE_SHARE_LINK_DAYS,
  SITE_TABLE_COMPACT_EMPTY_HEIGHT,
  SITE_TABLE_EMPTY_HEIGHT,
} from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SitePreviewRow, SitePreviewsTableProps } from "@/types/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { toErrorMessage } from "@/utils/error-message";
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
}: {
  label: string;
  tooltip: string;
  disabled: boolean;
  onOpen: () => void;
}) {
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

/** Open previews in Vercel-style rows; a row opens the deployment behind it. */
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
  const invalidateSites = useInvalidateSites();
  const [deleteTarget, setDeleteTarget] = useState<SitePreviewRow | null>(null);
  const rowHref = (row: SitePreviewRow) =>
    siteDeploymentHref(organizationSlug, siteId, row.latestDeploymentId);

  const deleteMutation = useMutation({
    mutationFn: (previewKey: string) =>
      dashboardOrpc.sites.previews.delete.call({
        organizationId,
        siteId,
        previewKey,
      }),
    onSuccess: async () => {
      toast.success(t("deleted"));
      setDeleteTarget(null);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("deleteFailed")));
    },
  });

  const openPreview = async (row: SitePreviewRow) => {
    if (row.visibility !== "protected") {
      window.open(row.url, "_blank", "noopener,noreferrer");
      return;
    }
    // Open synchronously so the popup isn't blocked, then point it at the signed URL.
    const popup = window.open("", "_blank");
    try {
      const { url } = await dashboardOrpc.sites.previews.accessUrl.call({
        organizationId,
        siteId,
        previewKey: row.previewKey,
        kind: "member",
      });
      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      popup?.close();
      toast.error(toErrorMessage(error, t("openFailed")));
    }
  };

  const copyShareLink = async (row: SitePreviewRow) => {
    try {
      const { url } = await dashboardOrpc.sites.previews.accessUrl.call({
        organizationId,
        siteId,
        previewKey: row.previewKey,
        kind: "share",
      });
      await copyTextToClipboard(
        url,
        t("shareCopied", { days: SITE_SHARE_LINK_DAYS })
      );
    } catch (error) {
      toast.error(toErrorMessage(error, t("shareFailed")));
    }
  };

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
        // The overview has no status column; show the first build here instead.
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

  const compactActionsColumn: TableColumn<SitePreviewRow> = {
    key: "actions",
    header: <span className="sr-only">{tCommon("labels.actions")}</span>,
    width: "3.25rem",
    align: "right",
    cell: (row) => (
      <OpenPreviewButton
        disabled={!row.served}
        label={t("openLabel", { name: row.branch ?? row.previewKey })}
        onOpen={() => openPreview(row)}
        tooltip={t("open")}
      />
    ),
  };

  const actionsColumn: TableColumn<SitePreviewRow> = {
    key: "actions",
    header: <span className="sr-only">{tCommon("labels.actions")}</span>,
    width: "4.75rem",
    align: "right",
    cell: (row) => (
      <span className="flex items-center justify-end gap-1">
        <OpenPreviewButton
          disabled={!row.served}
          label={t("openLabel", { name: row.branch ?? row.previewKey })}
          onOpen={() => openPreview(row)}
          tooltip={t("open")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={t("actionsLabel", {
                  name: row.branch ?? row.previewKey,
                })}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {row.visibility === "protected" ? (
              <DropdownMenuItem onClick={() => copyShareLink(row)}>
                <HugeiconsIcon icon={Link04Icon} size={14} strokeWidth={1.5} />
                {t("copyShareLink")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!row.served}
                onClick={() =>
                  copyTextToClipboard(row.url, tCommon("toasts.copied"))
                }
              >
                <HugeiconsIcon icon={Link04Icon} size={14} strokeWidth={1.5} />
                {t("copyLink")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push(rowHref(row))}>
              <HugeiconsIcon icon={Rocket01Icon} size={14} strokeWidth={1.5} />
              {t("viewDeployment")}
            </DropdownMenuItem>
            {row.served ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(row)}
                  variant="destructive"
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                  {t("delete")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    ),
  };

  const columns = compact
    ? [
        previewColumn,
        commitColumn,
        accessColumn,
        updatedColumn,
        compactActionsColumn,
      ]
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
      <Table
        autoHeight
        className="rounded-2xl"
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
        <ResponsiveDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          open={deleteTarget !== null}
        >
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{t("deleteTitle")}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t("deleteDescription", {
                  name: deleteTarget?.branch ?? deleteTarget?.previewKey ?? "",
                })}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogFooter>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
                variant="outline"
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (deleteTarget) {
                    deleteMutation.mutate(deleteTarget.previewKey);
                  }
                }}
                variant="destructive"
              >
                {t("delete")}
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}
    </>
  );
}
