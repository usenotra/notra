"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteRollbackDialogProps } from "@/types/components/sites";
import { toErrorMessage } from "@/utils/error-message";
import { commitTitle, shortSha } from "@/utils/site-deployments";

export function SiteRollbackDialog({
  organizationId,
  siteId,
  deployment,
  onOpenChange,
}: SiteRollbackDialogProps) {
  const t = useTranslations("sites.rollback");
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
    <ConfirmDialog
      confirmLabel={t("confirm")}
      description={t("description")}
      onConfirm={() => {
        if (deployment) {
          rollbackMutation.mutate(deployment.id);
        }
      }}
      onOpenChange={onOpenChange}
      open={deployment !== null}
      pending={rollbackMutation.isPending}
      title={t("title")}
    >
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
    </ConfirmDialog>
  );
}
