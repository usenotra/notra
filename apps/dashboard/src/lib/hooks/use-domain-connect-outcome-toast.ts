import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SITE_DOMAIN_CONNECT_PARAM } from "@/constants/sites";
import { usePathname, useSearchParams } from "@/lib/navigation";
import { parseSiteDomainConnectOutcome } from "@/utils/site-domains";

export function useDomainConnectOutcomeToast() {
  const t = useTranslations("sites.domainsPage.connectResult");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const handled = useRef(false);
  const outcome = parseSiteDomainConnectOutcome(
    searchParams.get(SITE_DOMAIN_CONNECT_PARAM)
  );

  useEffect(() => {
    if (!outcome || handled.current) {
      return;
    }
    handled.current = true;
    if (outcome === "success") {
      toast.success(t("success"), { description: t("successDescription") });
    } else if (outcome === "cancelled") {
      toast.message(t("cancelled"), { description: t("cancelledDescription") });
    } else {
      toast.error(t("error"), { description: t("errorDescription") });
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete(SITE_DOMAIN_CONNECT_PARAM);
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname
    );
  }, [outcome, pathname, searchParams, t]);
}
