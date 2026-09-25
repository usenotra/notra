import { POSTHOG_EVENTS, type PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";
import type { AuthFlowResult } from "@notra/schemas/types/dashboard/auth";
import { saveSession } from "@workos-inc/authkit-nextjs";
import type { AuthenticationResponse } from "@workos-inc/node";
import { Effect } from "effect";

import { ANALYTICS_AUTH_METHODS } from "@/constants/analytics-events";
import { toAnalyticsAuthMethod } from "@/lib/analytics/auth-method";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { UserSyncError, WorkOSAuthError } from "@/lib/auth/errors";
import { resolveMfaFlow } from "@/lib/auth/mfa";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { syncAuthenticatedUser } from "@/lib/auth/sync";
import { readWorkOSError } from "@/lib/auth/workos-error";

const VERIFICATION_REQUIRED_CODE = "email_verification_required";
const DEFAULT_POST_LOGIN_PATH = "/callback";

export async function trackAuthEvent(
  event: PostHogEventName,
  properties?: PostHogProperties,
  userId?: string | null
) {
  const requestHeaders = await readRequestHeaders();
  trackServerEvent({ event, headers: requestHeaders, userId, properties });
}

export function getWorkOSClientId() {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error("WORKOS_CLIENT_ID must be defined");
  }
  return clientId;
}

export const tryWorkOSAuth = <T>(run: () => Promise<T>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) => new WorkOSAuthError({ error }),
  });

export const completeAuthentication = Effect.fn("auth.completeSession")(
  function* (
    response: AuthenticationResponse,
    returnTo?: string | null,
    completionEvent?: PostHogEventName
  ) {
    yield* Effect.tryPromise({
      try: () =>
        saveSession(
          {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
            impersonator: response.impersonator,
            authenticationMethod: response.authenticationMethod,
          },
          process.env.APP_URL ?? "http://localhost:3000"
        ),
      catch: (cause) =>
        new UserSyncError({ message: "Failed to persist session", cause }),
    });

    const localUser = yield* syncAuthenticatedUser({
      workosUser: response.user,
      oauthTokens: response.oauthTokens,
      authenticationMethod: response.authenticationMethod,
    });

    if (completionEvent) {
      yield* Effect.promise(() =>
        trackAuthEvent(
          completionEvent,
          { method: toAnalyticsAuthMethod(response.authenticationMethod) },
          localUser.id
        )
      );
    }

    return {
      redirectTo: sanitizeReturnTo(returnTo ?? null) ?? DEFAULT_POST_LOGIN_PATH,
      localUserId: localUser.id,
    };
  }
);

export const signedIn = ({
  redirectTo,
}: {
  redirectTo: string;
}): AuthFlowResult => ({ status: "success", redirectTo });

const mapAuthFailure =
  (email: string) =>
  (error: WorkOSAuthError | UserSyncError | { message: string }) => {
    if (!(error instanceof WorkOSAuthError)) {
      return Effect.succeed<AuthFlowResult>({
        status: "error",
        message: error.message,
      });
    }

    const info = readWorkOSError(error.error);

    if (
      info.code === VERIFICATION_REQUIRED_CODE &&
      info.pendingAuthenticationToken
    ) {
      const pendingToken = info.pendingAuthenticationToken;
      return Effect.promise(() =>
        trackAuthEvent(POSTHOG_EVENTS.EMAIL_VERIFICATION_REQUIRED, {
          method: ANALYTICS_AUTH_METHODS.PASSWORD,
        })
      ).pipe(
        Effect.as<AuthFlowResult>({
          status: "verification-required",
          pendingAuthenticationToken: pendingToken,
          email,
        })
      );
    }

    return resolveMfaFlow(info, email).pipe(
      Effect.flatMap((mfaResult) => {
        if (!mfaResult) {
          return Effect.succeed<AuthFlowResult>({
            status: "error",
            message: info.message,
          });
        }

        const event =
          mfaResult.status === "mfa-required"
            ? POSTHOG_EVENTS.MFA_CHALLENGE_REQUIRED
            : POSTHOG_EVENTS.MFA_ENROLLMENT_REQUIRED;

        return Effect.promise(() =>
          trackAuthEvent(event, { method: ANALYTICS_AUTH_METHODS.PASSWORD })
        ).pipe(Effect.as(mfaResult));
      }),
      Effect.catch((mfaError) =>
        Effect.succeed<AuthFlowResult>({
          status: "error",
          message: readWorkOSError(mfaError.error).message,
        })
      )
    );
  };

export function runAuthFlow(
  email: string,
  flow: Effect.Effect<AuthFlowResult, WorkOSAuthError | UserSyncError>
): Promise<AuthFlowResult> {
  return Effect.runPromise(flow.pipe(Effect.catch(mapAuthFailure(email))));
}
