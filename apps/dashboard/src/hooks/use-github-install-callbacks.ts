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

export function useGitHubCallbackErrorToast(errorCode: string | null) {
  const handledErrorRef = useRef(false);
  useEffect(() => {
    if (!errorCode || handledErrorRef.current) {
      return;
    }
    handledErrorRef.current = true;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("githubError");
    window.history.replaceState(null, "", nextUrl);
    toast.error(
      GITHUB_CALLBACK_ERROR_MESSAGES[errorCode] ??
        GITHUB_CALLBACK_ERROR_MESSAGES.github_callback_failed
    );
  }, [errorCode]);
}

export function useResumeGitHubInstall(params: GitHubInstallResumeParams) {
  const resumedInstallRef = useRef(false);
  useEffect(() => {
    if (
      (!params.shouldResume &&
        !(
          params.reauthorizationInstallationId && params.reauthorizationState
        )) ||
      !params.organizationId ||
      resumedInstallRef.current
    ) {
      return;
    }
    resumedInstallRef.current = true;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("githubAccountConnected");
    nextUrl.searchParams.delete("githubReauthorizeInstallationId");
    nextUrl.searchParams.delete("githubReauthorizeState");
    window.history.replaceState(null, "", nextUrl);
    if (params.reauthorizationInstallationId && params.reauthorizationState) {
      if (hasAttemptedGitHubReauthorization(params.reauthorizationState)) {
        toast.error("Failed to reconnect GitHub. Please try again.");
        return;
      }
      markGitHubReauthorizationAttempted(params.reauthorizationState);
      const callbackUrl = new URL(
        "/api/integrations/github/callback",
        window.location.origin
      );
      callbackUrl.searchParams.set(
        "installation_id",
        params.reauthorizationInstallationId
      );
      callbackUrl.searchParams.set("state", params.reauthorizationState);
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
    params.reauthorizationInstallationId,
    params.reauthorizationState,
    params.shouldResume,
  ]);
}
