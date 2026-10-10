import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useSite } from "@/components/sites/site-context";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseUpdateSiteSettingsOptions } from "@/types/hooks/sites";
import type { SiteSettingsPatch } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";

export function useUpdateSiteSettings({
  onSaved,
}: UseUpdateSiteSettingsOptions = {}) {
  const t = useTranslations("sites.settings");
  const { organizationId, siteId } = useSite();
  const invalidateSites = useInvalidateSites();
  return useMutation({
    mutationFn: (patch: SiteSettingsPatch) =>
      dashboardOrpc.sites.update.call({ organizationId, siteId, ...patch }),
    onSuccess: async (result) => {
      toast.success(result.rebuilding ? t("savedRebuilding") : t("saved"));
      onSaved?.();
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("saveFailed")));
    },
  });
}
