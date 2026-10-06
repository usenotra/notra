"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SitePreviewDeleteDialogProps } from "@/types/components/sites";
import { toErrorMessage } from "@/utils/error-message";

export function SitePreviewDeleteDialog({
  organizationId,
  siteId,
  preview,
  onOpenChange,
}: SitePreviewDeleteDialogProps) {
  const t = useTranslations("sites.previewsPage");
  const invalidateSites = useInvalidateSites();

  const deleteMutation = useMutation({
    mutationFn: (previewKey: string) =>
      dashboardOrpc.sites.previews.delete.call({
        organizationId,
        siteId,
        previewKey,
      }),
    onSuccess: async () => {
      toast.success(t("deleted"));
      onOpenChange(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("deleteFailed")));
    },
  });

  return (
    <ConfirmDialog
      confirmLabel={t("delete")}
      description={t("deleteDescription", {
        name: preview?.branch ?? preview?.previewKey ?? "",
      })}
      variant="destructive"
      onConfirm={() => {
        if (preview) {
          deleteMutation.mutate(preview.previewKey);
        }
      }}
      onOpenChange={onOpenChange}
      open={preview !== null}
      pending={deleteMutation.isPending}
      title={t("deleteTitle")}
    />
  );
}
