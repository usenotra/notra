import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteCreateInput } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";

export function useCreateSite() {
  const t = useTranslations("sites.new");
  const invalidateSites = useInvalidateSites();
  return useMutation({
    mutationFn: (input: SiteCreateInput) =>
      dashboardOrpc.sites.create.call(input),
    onSuccess: async () => {
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("createFailed")));
    },
  });
}
