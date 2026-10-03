import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteScope } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";

/** Re-checks a custom domain now and toasts whether it verified. */
export function useSiteDomainCheck({
  organizationId,
  siteId,
  domainId,
}: SiteScope & { domainId: string }) {
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
