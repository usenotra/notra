import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseSiteDomainCheckParams } from "@/types/hooks/sites";
import { toErrorMessage } from "@/utils/error-message";

export function useSiteDomainCheck({
  organizationId,
  siteId,
  domainId,
}: UseSiteDomainCheckParams) {
  const t = useTranslations("sites.domainsPage");
  const invalidateSites = useInvalidateSites();
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.domains.refresh.call({
        organizationId,
        siteId,
        domainId,
      }),
    onSuccess: async (result) => {
      if (result.status === "active") {
        toast.success(
          result.rebuilding ? t("verifiedRebuilding") : t("verified")
        );
      } else {
        toast.message(t("notVerifiedYet"), {
          description: result.lastError ?? undefined,
        });
      }
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("checkFailed")));
    },
  });
}
