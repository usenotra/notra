"use client";

import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";

const SLACK_ERROR_MESSAGES: Record<string, string> = {
  workspace_already_connected: "This Slack workspace is already connected",
  workspace_connected_elsewhere:
    "This Slack workspace is already connected to another organization",
  slack_not_configured:
    "Slack OAuth is not configured. Set SLACK_AGENT_CLIENT_ID and SLACK_AGENT_CLIENT_SECRET.",
};

export function useSlackConnectionToast() {
  const [{ slackConnected, error }, setParams] = useQueryStates(
    { slackConnected: parseAsBoolean, error: parseAsString },
    { history: "replace" }
  );

  useEffect(() => {
    if (slackConnected) {
      toast.success("Slack workspace connected successfully");
      void setParams({ slackConnected: null, error: null });
    } else if (error && Object.hasOwn(SLACK_ERROR_MESSAGES, error)) {
      toast.error(SLACK_ERROR_MESSAGES[error]);
      void setParams({ slackConnected: null, error: null });
    }
  }, [slackConnected, error, setParams]);
}
