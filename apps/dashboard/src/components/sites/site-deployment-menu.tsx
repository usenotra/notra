"use client";

import {
  ArrowTurnBackwardIcon,
  ArrowUpRight01Icon,
  Copy01Icon,
  Delete02Icon,
  Link04Icon,
  MoreHorizontalIcon,
  RefreshIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useRouter } from "@/lib/navigation";
import type { SiteDeploymentMenuProps } from "@/types/components/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { isDeploymentInProgress, shortSha } from "@/utils/site-deployments";

export function SiteDeploymentMenu({
  deployment,
  canRollback,
  detailHref,
  redeployPending,
  onRedeploy,
  onRollback,
  preview,
  onOpenPreview,
  onCopyShareLink,
  onDeletePreview,
}: SiteDeploymentMenuProps) {
  const t = useTranslations("sites.deployments.actions");
  const tPage = useTranslations("sites.deploymentsPage.actions");
  const tPreview = useTranslations("sites.previewsPage");
  const router = useRouter();
  const finished = !isDeploymentInProgress(deployment.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("label", { sha: shortSha(deployment.commitSha) })}
            className="text-muted-foreground"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {detailHref ? (
          <DropdownMenuItem onClick={() => router.push(detailHref)}>
            <HugeiconsIcon icon={ViewIcon} size={14} strokeWidth={1.75} />
            {t("view")}
          </DropdownMenuItem>
        ) : null}
        {deployment.live && (deployment.kind === "production" || preview) ? (
          <>
            <DropdownMenuItem
              onClick={() =>
                preview && onOpenPreview
                  ? onOpenPreview()
                  : window.open(deployment.url, "_blank", "noopener,noreferrer")
              }
            >
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                strokeWidth={1.75}
              />
              {t("visit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                preview?.visibility === "protected" && onCopyShareLink
                  ? onCopyShareLink()
                  : copyTextToClipboard(deployment.url, tPage("copied"))
              }
            >
              <HugeiconsIcon
                icon={
                  preview?.visibility === "protected" ? Link04Icon : Copy01Icon
                }
                size={14}
                strokeWidth={1.75}
              />
              {preview?.visibility === "protected"
                ? tPreview("copyShareLink")
                : tPage("copyUrl")}
            </DropdownMenuItem>
          </>
        ) : null}
        {finished && (detailHref || deployment.live) ? (
          <DropdownMenuSeparator />
        ) : null}
        {finished ? (
          <DropdownMenuItem disabled={redeployPending} onClick={onRedeploy}>
            <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.75} />
            {t("redeploy")}
          </DropdownMenuItem>
        ) : null}
        {canRollback ? (
          <DropdownMenuItem onClick={onRollback}>
            <HugeiconsIcon
              icon={ArrowTurnBackwardIcon}
              size={14}
              strokeWidth={1.75}
            />
            {t("rollback")}
          </DropdownMenuItem>
        ) : null}
        {preview?.served && onDeletePreview ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeletePreview} variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.75} />
              {tPreview("delete")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
