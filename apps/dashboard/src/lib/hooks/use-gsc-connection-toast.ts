"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { trackEvent } from "@/lib/analytics/posthog-client";
import { GSC_ERROR_MESSAGES } from "@/lib/integrations/google-search-console/oauth-errors";

export function useGscConnectionToast() {
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
      toast.success("Google Search Console connected", {
        id: "gsc-connected",
      });
    } else if (error && Object.hasOwn(GSC_ERROR_MESSAGES, error)) {
      if (!alreadyTracked) {
        trackedResultRef.current = resultKey;
        trackEvent(POSTHOG_EVENTS.GSC_CONNECT_FAILED, { error_code: error });
      }
      toast.error(GSC_ERROR_MESSAGES[error], { id: `gsc-error-${error}` });
    } else {
      return;
    }

    void setParams({ gscConnected: null, error: null });
  }, [gscConnected, error, setParams]);

  return connectionSucceeded;
}
