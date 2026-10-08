"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { SiteDeploymentMenu } from "@/components/sites/site-deployment-menu";
import { SiteEnvironmentBadge } from "@/components/sites/site-environment-badge";
import { SitePreviewDeleteDialog } from "@/components/sites/site-preview-delete-dialog";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteRollbackDialog } from "@/components/sites/site-rollback-dialog";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import {
  SITE_DEPLOYMENT_ROW_HEIGHT,
  SITE_MANUAL_TRIGGER_ICONS,
  SITE_TABLE_EMPTY_HEIGHT,
} from "@/constants/sites";
import { useNow } from "@/lib/hooks/use-now";
import { useRedeployDeployment } from "@/lib/hooks/use-site-deployments";
import { useSitePreviewLinks } from "@/lib/hooks/use-site-preview-links";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { SiteDeploymentsTableProps } from "@/types/components/sites";
import type { SiteDeployment, SitePreviewRow } from "@/types/sites";
import {
  commitTitle,
  deploymentElapsedMs,
  formatBuildDuration,
  hasDeploymentInProgress,
  shortSha,
} from "@/utils/site-deployments";
import { siteDeploymentHref } from "@/utils/site-links";
import { servedPreviewForDeployment } from "@/utils/site-previews";

export function SiteDeploymentsTable({
  organizationId,
  organizationSlug,
  siteId,
  deployments,
  emptyState,
  withActions = false,
  highlightNewRows = false,
  emptyHeight = SITE_TABLE_EMPTY_HEIGHT,
  pageSize,
  previewRows = [],
}: SiteDeploymentsTableProps) {
  const t = useTranslations("sites.deploymentsPage");
  const tTriggers = useTranslations("sites.triggers");
  const tDeployments = useTranslations("sites.deployments");
  const router = useRouter();
  const scope = { organizationId, siteId };
  const redeploy = useRedeployDeployment(scope);
  const { openPreview, copyShareLink } = useSitePreviewLinks(scope);
  const [deleteTarget, setDeleteTarget] = useState<SitePreviewRow | null>(null);
  const now = useNow(hasDeploymentInProgress(deployments));
  const [rollbackTarget, setRollbackTarget] = useState<SiteDeployment | null>(
    null
  );
  const [mountedAt] = useState(() => Date.now());
  const href = (deployment: SiteDeployment) =>
    siteDeploymentHref(organizationSlug, siteId, deployment.id);

  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(deployments.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const pageRowCount = Math.min(
    pageSize,
    deployments.length - (page - 1) * pageSize
  );
  const tableHeight =
    deployments.length > 0
      ? (pageRowCount + 1) * SITE_DEPLOYMENT_ROW_HEIGHT
      : emptyHeight;

  const columns: TableColumn<SiteDeployment>[] = [
    {
      key: "deployment",
      header: t("columns.deployment"),
      width: "1fr",
      minWidth: "16rem",
      sortable: true,
      sortValue: (deployment) => commitTitle(deployment.commitMessage) ?? "",
      cell: (deployment) => {
        const title = commitTitle(deployment.commitMessage);
        const triggerIcon = SITE_MANUAL_TRIGGER_ICONS[deployment.trigger];
        return (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                "truncate text-sm font-medium",
                !title && "text-muted-foreground font-normal"
              )}
              title={title ?? undefined}
            >
              {title ?? tDeployments("noCommitMessage")}
            </span>
            <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
              <span className="shrink-0 font-mono">
                {shortSha(deployment.commitSha)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate font-mono" title={deployment.branch}>
                {deployment.branch}
              </span>
              {triggerIcon ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="size-3"
                      icon={triggerIcon}
                      strokeWidth={2}
                    />
                    {tTriggers(deployment.trigger)}
                  </span>
                </>
              ) : null}
            </span>
          </span>
        );
      },
    },
    {
      key: "environment",
      header: t("columns.environment"),
      width: "10rem",
      collapsePriority: 2,
      sortable: true,
      sortValue: (deployment) => deployment.kind,
      cell: (deployment) => (
        <SiteEnvironmentBadge
          kind={deployment.kind}
          live={deployment.live}
          previewKey={deployment.previewKey}
        />
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      width: "9rem",
      sortable: true,
      sortValue: (deployment) => deployment.status,
      cell: (deployment) => (
        <SiteStatusDot
          duration={
            deployment.status === "ready" ||
            deployment.status === "building" ||
            deployment.status === "uploading"
              ? formatBuildDuration(deploymentElapsedMs(deployment, now))
              : null
          }
          live={deployment.live}
          status={deployment.status}
        />
      ),
    },
    {
      key: "author",
      header: t("columns.author"),
      width: "10rem",
      collapsePriority: 3,
      sortable: true,
      sortValue: (deployment) =>
        deployment.commitAuthor ?? tTriggers(deployment.trigger),
      cell: (deployment) => (
        <span
          className="text-muted-foreground block truncate text-xs"
          title={tTriggers(deployment.trigger)}
        >
          {deployment.commitAuthor ?? tTriggers(deployment.trigger)}
        </span>
      ),
    },
    {
      key: "created",
      header: t("columns.created"),
      width: "8rem",
      align: "right",
      collapsePriority: 1,
      sortable: true,
      sortValue: (deployment) => new Date(deployment.createdAt).getTime(),
      cell: (deployment) => (
        <SiteRelativeTime
          className="text-muted-foreground text-xs whitespace-nowrap tabular-nums"
          date={deployment.createdAt}
        />
      ),
    },
  ];

  if (withActions) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">{t("columns.actions")}</span>,
      width: "3.25rem",
      align: "right",
      cell: (deployment) => {
        const preview = servedPreviewForDeployment(deployment, previewRows);
        return (
          <span
            className="-my-1 flex justify-end"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <SiteDeploymentMenu
              canRollback={deployment.canRollback}
              deployment={deployment}
              detailHref={href(deployment)}
              onRedeploy={() => redeploy.mutate(deployment.id)}
              onRollback={() => setRollbackTarget(deployment)}
              redeployPending={redeploy.isPending}
              preview={preview}
              onOpenPreview={preview ? () => openPreview(preview) : undefined}
              onCopyShareLink={
                preview ? () => copyShareLink(preview) : undefined
              }
              onDeletePreview={
                preview ? () => setDeleteTarget(preview) : undefined
              }
            />
          </span>
        );
      },
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={deployments}
        emptyState={emptyState}
        getRowClassName={(deployment) =>
          highlightNewRows &&
          new Date(deployment.createdAt).getTime() > mountedAt
            ? "motion-safe:animate-[geo-log-row-glow_2.4s_ease-out_backwards]"
            : undefined
        }
        defaultSort={{ key: "created", direction: "desc" }}
        getRowId={(deployment) => deployment.id}
        height={tableHeight}
        onRowClick={(deployment) => router.push(href(deployment))}
        onRowPointerEnter={(deployment) => router.prefetch(href(deployment))}
        pagination={
          deployments.length > pageSize
            ? {
                page,
                pageSize,
                onPageChange: (next) =>
                  setPage(Math.min(Math.max(1, next), pageCount)),
              }
            : undefined
        }
        resizable
        rowHeight={SITE_DEPLOYMENT_ROW_HEIGHT}
        scrollFade={false}
      />
      {withActions ? (
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
      ) : null}
      {withActions ? (
        <SiteRollbackDialog
          deployment={rollbackTarget}
          onOpenChange={(open) => {
            if (!open) {
              setRollbackTarget(null);
            }
          }}
          organizationId={organizationId}
          siteId={siteId}
        />
      ) : null}
    </>
  );
}
