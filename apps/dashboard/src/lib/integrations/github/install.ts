"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Effect } from "effect";

import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { flushTrackEvent } from "@/lib/analytics/posthog-client";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { startSocialSignInAction } from "@/lib/auth/social-actions";
import { dashboardOrpc } from "@/lib/orpc/query";

import {
  GitHubAccountConnectionIncompleteError,
  GitHubInstallStartError,
  type StartGitHubInstallResult,
} from "../../../types/integrations/github";

function authorizeGitHub(callbackURL: string) {
  return Effect.tryPromise({
    try: async () => {
      await startSocialSignInAction({
        provider: "github",
        returnTo: callbackURL,
      }).catch((error) => {
        if (!isNextRedirectError(error)) {
          throw error;
        }
      });
      return true;
    },
    catch: (cause) => new GitHubInstallStartError({ cause }),
  });
}

export function reauthorizeGitHub(callbackURL: string) {
  return Effect.runPromise(
    authorizeGitHub(callbackURL).pipe(
      Effect.match({
        onFailure: () => false,
        onSuccess: () => true,
      })
    )
  );
}

function reauthorizationAttemptKey(state: string) {
  return `notra:github-reauthorize-attempted:${state}`;
}

export function hasAttemptedGitHubReauthorization(state: string) {
  return (
    window.sessionStorage.getItem(reauthorizationAttemptKey(state)) !== null
  );
}

export function markGitHubReauthorizationAttempted(state: string) {
  window.sessionStorage.setItem(reauthorizationAttemptKey(state), "true");
}

export async function startGitHubInstall(params: {
  organizationId: string;
  callbackPath: string;
  allowAccountConnection?: boolean;
}): Promise<StartGitHubInstallResult> {
  const allowAccountConnection = params.allowAccountConnection ?? true;

  await flushTrackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
    provider: INTEGRATION_PROVIDERS.GITHUB,
    allow_account_connection: allowAccountConnection,
  });

  return Effect.runPromise(
    Effect.tryPromise({
      try: () =>
        dashboardOrpc.github.app.prepareInstallUrl.call({
          organizationId: params.organizationId,
          callbackPath: params.callbackPath,
        }),
      catch: (cause) => new GitHubInstallStartError({ cause }),
    }).pipe(
      Effect.flatMap(
        (
          preparedInstall
        ): Effect.Effect<
          boolean,
          GitHubInstallStartError | GitHubAccountConnectionIncompleteError
        > => {
          if (preparedInstall.requiresAccountConnection) {
            if (!allowAccountConnection) {
              return Effect.fail(
                new GitHubAccountConnectionIncompleteError({
                  callbackPath: params.callbackPath,
                })
              );
            }

            const callbackUrl = new URL(
              params.callbackPath,
              window.location.origin
            );
            callbackUrl.searchParams.set("githubAccountConnected", "true");

            return authorizeGitHub(
              `${callbackUrl.pathname}${callbackUrl.search}`
            );
          }

          return Effect.sync(() => {
            window.location.assign(preparedInstall.url);
            return true;
          });
        }
      ),
      Effect.match({
        onFailure: (error): StartGitHubInstallResult => ({
          started: false,
          reason:
            error._tag === "GitHubAccountConnectionIncompleteError"
              ? "account-connection-incomplete"
              : "install-start-failed",
        }),
        onSuccess: (): StartGitHubInstallResult => ({ started: true }),
      })
    )
  );
}
