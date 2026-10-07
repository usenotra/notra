"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { trackEvent } from "@/lib/analytics/posthog-client";
import { GSC_ERROR_CODES } from "@/lib/integrations/google-search-console/oauth-errors";

function isGscErrorCode(
  value: string
): value is (typeof GSC_ERROR_CODES)[number] {
  return GSC_ERROR_CODES.some((code) => code === value);
}

export function useGscConnectionToast() {
  const t = useTranslations("integrations.connectionToasts");
  const tShared = useTranslations("integrations.shared");
  const [{ gscConnected, error }, setParams] = useQueryStates(
    { gscConnected: parseAsBoolean, error: parseAsString },
    { history: "replace" }
  );
  const trackedResultRef = useRef<string | null>(null);
  const connectionSucceeded = gscConnected === true;

  useEffect(() => {
    const resultKey = `${gscConnected ?? ""}:${error ?? ""}`;
    const alreadyTracked = trackedResultRef.current === resultKey;

    if (gscConnected) {
      if (!alreadyTracked) {
        trackedResultRef.current = resultKey;
        trackEvent(POSTHOG_EVENTS.GSC_CONNECT_SUCCEEDED);
      }
      toast.success(t("gscConnected"), {
        id: "gsc-connected",
      });
    } else if (error && isGscErrorCode(error)) {
      if (!alreadyTracked) {
        trackedResultRef.current = resultKey;
        trackEvent(POSTHOG_EVENTS.GSC_CONNECT_FAILED, { error_code: error });
      }
      let message: string;
      if (error === "gsc_forbidden") {
        message = tShared("youDoNotHaveAccess");
      } else if (error === "gsc_not_configured") {
        message = tShared("googleSearchConsoleIsNot");
      } else {
        message = t(`gscErrors.${error}`);
      }
      toast.error(message, { id: `gsc-error-${error}` });
    } else {
      return;
    }

    void setParams({ gscConnected: null, error: null });
  }, [gscConnected, error, setParams, t, tShared]);

  return connectionSucceeded;
}
