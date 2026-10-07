"use client";

import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

const SLACK_ERROR_MESSAGE_KEYS = {
  workspace_already_connected: "slackAlreadyConnected",
  workspace_connected_elsewhere: "slackConnectedElsewhere",
  slack_not_configured: "slackNotConfigured",
} as const;

function isSlackErrorCode(
  value: string
): value is keyof typeof SLACK_ERROR_MESSAGE_KEYS {
  return Object.hasOwn(SLACK_ERROR_MESSAGE_KEYS, value);
}

export function useSlackConnectionToast() {
  const t = useTranslations("integrations.connectionToasts");
  const [{ slackConnected, error }, setParams] = useQueryStates(
    { slackConnected: parseAsBoolean, error: parseAsString },
    { history: "replace" }
  );

  useEffect(() => {
    if (slackConnected) {
      toast.success(t("slackConnected"));
      void setParams({ slackConnected: null, error: null });
    } else if (error && isSlackErrorCode(error)) {
      toast.error(t(SLACK_ERROR_MESSAGE_KEYS[error]));
      void setParams({ slackConnected: null, error: null });
    }
  }, [slackConnected, error, setParams, t]);
}
