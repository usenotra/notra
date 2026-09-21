import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { GITHUB_CALLBACK_ERROR_MESSAGES } from "@/constants/github";
import {
  hasAttemptedGitHubReauthorization,
  markGitHubReauthorizationAttempted,
  reauthorizeGitHub,
  startGitHubInstall,
} from "@/lib/integrations/github/install";
import type { GitHubInstallResumeParams } from "@/types/integrations/github-settings";

export function useGitHubCallbackErrorToast() {
  const [{ githubError: errorCode }, setParams] = useQueryStates(
    { githubError: parseAsString },
    { history: "replace" }
  );
  const handledErrorRef = useRef(false);
  useEffect(() => {
    if (!errorCode || handledErrorRef.current) {
      return;
    }
    handledErrorRef.current = true;
    void setParams({ githubError: null });
    toast.error(
      GITHUB_CALLBACK_ERROR_MESSAGES[errorCode] ??
        GITHUB_CALLBACK_ERROR_MESSAGES.github_callback_failed
    );
  }, [errorCode, setParams]);
}

export function useResumeGitHubInstall(params: GitHubInstallResumeParams) {
  const [
    {
      githubAccountConnected: shouldResume,
      githubReauthorizeInstallationId: reauthorizationInstallationId,
      githubReauthorizeState: reauthorizationState,
    },
    setParams,
  ] = useQueryStates(
    {
      githubAccountConnected: parseAsBoolean,
      githubReauthorizeInstallationId: parseAsString,
      githubReauthorizeState: parseAsString,
    },
    { history: "replace" }
  );
  const resumedInstallRef = useRef(false);
  useEffect(() => {
    if (
      (!shouldResume &&
        !(reauthorizationInstallationId && reauthorizationState)) ||
      !params.organizationId ||
      resumedInstallRef.current
    ) {
      return;
    }
    resumedInstallRef.current = true;
    void setParams({
      githubAccountConnected: null,
      githubReauthorizeInstallationId: null,
      githubReauthorizeState: null,
    });
    if (reauthorizationInstallationId && reauthorizationState) {
      if (hasAttemptedGitHubReauthorization(reauthorizationState)) {
        toast.error("Failed to reconnect GitHub. Please try again.");
        return;
      }
      markGitHubReauthorizationAttempted(reauthorizationState);
      const callbackUrl = new URL(
        "/api/integrations/github/callback",
        window.location.origin
      );
      callbackUrl.searchParams.set(
        "installation_id",
        reauthorizationInstallationId
      );
      callbackUrl.searchParams.set("state", reauthorizationState);
      reauthorizeGitHub(`${callbackUrl.pathname}${callbackUrl.search}`).then(
        (started) => {
          if (!started) {
            toast.error("Failed to reconnect GitHub");
          }
        }
      );
      return;
    }
    startGitHubInstall({
      organizationId: params.organizationId,
      callbackPath: params.callbackPath,
      allowAccountConnection: false,
    }).then((result) => {
      if (result.started) {
        return;
      }
      toast.error(
        result.reason === "account-connection-incomplete"
          ? "GitHub account connection didn't complete. Please try connecting again."
          : "Failed to resume GitHub installation"
      );
    });
  }, [
    params.callbackPath,
    params.organizationId,
    reauthorizationInstallationId,
    reauthorizationState,
    shouldResume,
    setParams,
  ]);
}
