"use client";

import { GitBranchIcon, GitCommitIcon } from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Table, type TableColumn } from "@/components/motion/table";
import { SiteDeploymentMenu } from "@/components/sites/site-deployment-menu";
import { SiteMeta } from "@/components/sites/site-meta";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SiteRollbackDialog } from "@/components/sites/site-rollback-dialog";
import { SiteStatusDot } from "@/components/sites/site-status-dot";
import { SITE_TABLE_EMPTY_HEIGHT } from "@/constants/sites";
import {
  useNow,
  useRedeployDeployment,
} from "@/lib/hooks/use-site-deployments";
import { cn } from "@/lib/utils";
import type { SiteDeployment } from "@/types/sites";
import {
  commitTitle,
  deploymentElapsedMs,
  formatBuildDuration,
  hasDeploymentInProgress,
  shortSha,
} from "@/utils/site-deployments";
import { siteDeploymentHref } from "@/utils/site-links";

/**
 * Deployments as rows: commit, status, environment, when and by whom. The
 * deployments page and the overview's activity share it, so a build reads
 * the same everywhere; the page adds a row menu, the overview stays bare.
 */
export function SiteDeploymentsTable({
  organizationId,
  organizationSlug,
  siteId,
  deployments,
  emptyState,
  withActions = false,
  highlightNewRows = false,
  emptyHeight = SITE_TABLE_EMPTY_HEIGHT,
}: {
  organizationId: string;
  organizationSlug: string;
  siteId: string;
  deployments: SiteDeployment[];
  emptyState?: ReactNode;
  /** Row menu with Redeploy and Restore. */
  withActions?: boolean;
  /** Glow rows that arrive after the first render, e.g. a build that just started. */
  highlightNewRows?: boolean;
  emptyHeight?: number;
}) {
  const t = useTranslations("sites.deploymentsPage");
  const tKinds = useTranslations("sites.kinds");
  const tTriggers = useTranslations("sites.triggers");
  const tDeployments = useTranslations("sites.deployments");
  const router = useRouter();
  const scope = { organizationId, siteId };
  const redeploy = useRedeployDeployment(scope);
  const now = useNow(hasDeploymentInProgress(deployments));
  const [rollbackTarget, setRollbackTarget] = useState<SiteDeployment | null>(
    null
  );
  // Only builds created while the page is open glow; filtering never does.
  const [mountedAt] = useState(() => Date.now());
  const href = (deployment: SiteDeployment) =>
    siteDeploymentHref(organizationSlug, siteId, deployment.id);

  const columns: TableColumn<SiteDeployment>[] = [
    {
      key: "deployment",
      header: t("columns.deployment"),
      width: "1fr",
      minWidth: "12rem",
      cell: (deployment) => {
        const title = commitTitle(deployment.commitMessage);
        return (
          <span className="flex min-w-0 flex-col gap-1">
            <span
              className={cn(
                "block min-w-0 truncate font-medium",
                !title && "text-muted-foreground font-normal"
              )}
              title={title ?? undefined}
            >
              {title ?? tDeployments("noCommitMessage")}
            </span>
            <span className="flex min-w-0 items-center gap-3">
              <SiteMeta className="shrink-0 text-xs" icon={GitCommitIcon} mono>
                {shortSha(deployment.commitSha)}
              </SiteMeta>
              <span className="min-w-0" title={deployment.branch}>
                <SiteMeta
                  className="max-w-full text-xs"
                  icon={GitBranchIcon}
                  mono
                >
                  {deployment.branch}
                </SiteMeta>
              </span>
              {/* Narrow screens drop the environment and time columns. */}
              <SiteRelativeTime
                className="text-muted-foreground shrink-0 text-xs @min-[48rem]/main:hidden"
                date={deployment.createdAt}
              />
            </span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("columns.status"),
      width: "8.5rem",
      cell: (deployment) => (
        <SiteStatusDot
          className="h-5"
          duration={
            deployment.status === "ready" ||
            deployment.status === "building" ||
            deployment.status === "uploading"
              ? formatBuildDuration(deploymentElapsedMs(deployment, now))
              : null
          }
          status={deployment.status}
        />
      ),
    },
    {
      key: "environment",
      header: t("columns.environment"),
      width: "9rem",
      collapsePriority: 2,
      cell: (deployment) => {
        let detail: string | null = deployment.previewKey;
        if (deployment.live) {
          detail = detail ? `${detail} · ${t("current")}` : t("current");
        }
        return (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate">{tKinds(deployment.kind)}</span>
            {detail ? (
              <span
                className="text-muted-foreground truncate text-xs"
                title={detail}
              >
                {detail}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "created",
      header: t("columns.created"),
      width: "9rem",
      align: "right",
      collapsePriority: 1,
      cell: (deployment) => (
        <span className="flex min-w-0 flex-col items-end gap-1">
          <SiteRelativeTime
            className="text-muted-foreground whitespace-nowrap"
            date={deployment.createdAt}
          />
          <span
            className="text-muted-foreground max-w-full truncate text-xs"
            title={tTriggers(deployment.trigger)}
          >
            {deployment.commitAuthor ?? tTriggers(deployment.trigger)}
          </span>
        </span>
      ),
    },
  ];

  if (withActions) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">{t("columns.actions")}</span>,
      width: "3.25rem",
      align: "right",
      cell: (deployment) => (
        // Menu events bubble through the portal to the row; keep them here.
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
          />
        </span>
      ),
    });
  }

  return (
    <>
      <Table
        autoHeight
        className="rounded-2xl"
        columns={columns}
        data={deployments}
        emptyState={emptyState}
        getRowClassName={(deployment) =>
          highlightNewRows &&
          new Date(deployment.createdAt).getTime() > mountedAt
            ? "motion-safe:animate-[geo-log-row-glow_2.4s_ease-out_backwards]"
            : undefined
        }
        getRowId={(deployment) => deployment.id}
        height={emptyHeight}
        onRowClick={(deployment) => router.push(href(deployment))}
        onRowPointerEnter={(deployment) => router.prefetch(href(deployment))}
        rowSizing="content"
        scrollFade={false}
      />
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
