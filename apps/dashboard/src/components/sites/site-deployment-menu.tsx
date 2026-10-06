"use client";

import {
  ArrowTurnBackwardIcon,
  ArrowUpRight01Icon,
  Copy01Icon,
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
import { cn } from "@/lib/utils";
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
  triggerVariant = "ghost",
  showVisit = true,
  className,
}: SiteDeploymentMenuProps) {
  const t = useTranslations("sites.deployments.actions");
  const tPage = useTranslations("sites.deploymentsPage.actions");
  const router = useRouter();
  const finished = !isDeploymentInProgress(deployment.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("label", { sha: shortSha(deployment.commitSha) })}
            className={cn("text-muted-foreground", className)}
            size="icon-sm"
            variant={triggerVariant}
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
        {deployment.live ? (
          <>
            {showVisit ? (
              <DropdownMenuItem
                onClick={() =>
                  window.open(deployment.url, "_blank", "noopener,noreferrer")
                }
              >
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  size={14}
                  strokeWidth={1.75}
                />
                {t("visit")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() =>
                copyTextToClipboard(deployment.url, tPage("copied"))
              }
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={1.75} />
              {tPage("copyUrl")}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
