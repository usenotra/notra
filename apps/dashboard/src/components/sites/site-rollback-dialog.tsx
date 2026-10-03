"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteRollbackDialogProps } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { commitTitle, shortSha } from "@/utils/site-deployments";

export function SiteRollbackDialog({
  organizationId,
  siteId,
  deployment,
  onOpenChange,
}: SiteRollbackDialogProps) {
  const t = useTranslations("sites.rollback");
  const tCommon = useTranslations("common");
  const invalidateSites = useInvalidateSites();
  const rollbackMutation = useMutation({
    mutationFn: (deploymentId: string) =>
      dashboardOrpc.sites.deployments.rollback.call({
        organizationId,
        siteId,
        deploymentId,
      }),
    onSuccess: async () => {
      toast.success(t("done"));
      onOpenChange(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("failed")));
    },
  });

  const title = deployment ? commitTitle(deployment.commitMessage) : null;

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={deployment !== null}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {deployment ? (
          <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
            <p className="truncate font-medium">
              {title ?? t("noCommitMessage")}
            </p>
            <p className="text-muted-foreground font-mono text-xs">
              {shortSha(deployment.commitSha)} · {deployment.branch}
            </p>
          </div>
        ) : null}
        <ResponsiveDialogFooter>
          <Button
            disabled={rollbackMutation.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            loading={rollbackMutation.isPending}
            onClick={() => {
              if (deployment) {
                rollbackMutation.mutate(deployment.id);
              }
            }}
          >
            {t("confirm")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
