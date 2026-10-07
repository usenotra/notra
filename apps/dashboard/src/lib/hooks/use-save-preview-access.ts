import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseSavePreviewAccessParams } from "@/types/hooks/sites";
import type { SitePreviewAccessPlan } from "@/types/site-preview-access";
import { toErrorMessage } from "@/utils/error-message";

export function useSavePreviewAccess({
  organizationId,
  siteId,
  onSaved,
}: UseSavePreviewAccessParams) {
  const t = useTranslations("sites.previewAccess");
  const invalidateSites = useInvalidateSites();
  return useMutation({
    mutationFn: async (plan: SitePreviewAccessPlan) => {
      await dashboardOrpc.sites.update.call({
        organizationId,
        siteId,
        previewsEnabled: plan.previewsEnabled,
        previewVisibility: plan.previewVisibility,
        previewPassword: plan.password,
      });
    },
    onSuccess: async () => {
      toast.success(t("saved"));
      onSaved();
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("saveFailed")));
    },
  });
}
