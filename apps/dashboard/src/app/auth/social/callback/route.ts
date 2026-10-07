import { redirect } from "@tanstack/react-router";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";
import { getWorkOS } from "@workos/authkit-session";
import { Effect } from "effect";

import { LOGIN_MFA_QUERY_KEY, MFA_ERROR_CODES } from "@/constants/security";
import { SOCIAL_AUTH_STATE_COOKIE } from "@/constants/social-auth";
import { UserSyncError, WorkOSAuthError } from "@/lib/auth/errors";
import { resolveMfaFlow } from "@/lib/auth/mfa";
import { storePendingMfaFlow } from "@/lib/auth/mfa-cookies";
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { syncAuthenticatedUser } from "@/lib/auth/sync";
import { saveAuthSession } from "@/lib/auth/workos";
import { readWorkOSError } from "@/lib/auth/workos-error";

const VERIFICATION_REQUIRED_CODE = "email_verification_required";

interface SocialCallbackOutcome {
  kind:
    | "success"
    | "failed"
    | "verification-required"
    | "mfa-required"
    | "mfa-enrollment-required";
  pendingAuthenticationToken?: string;
  authenticationChallengeId?: string;
  workosUserId?: string;
  email?: string;
}

const exchangeSocialCode = Effect.fn("auth.social.exchangeCode")(function* (
  code: string
) {
  const response = yield* authenticateResolvingOrgSelection(() =>
    getWorkOS().userManagement.authenticateWithCode({
      clientId: process.env.WORKOS_CLIENT_ID ?? "",
      code,
    })
  );

  yield* Effect.tryPromise({
    try: () => saveAuthSession(response),
    catch: (cause) =>
      new UserSyncError({ message: "Failed to persist session", cause }),
  });

  yield* syncAuthenticatedUser({
    workosUser: response.user,
    oauthTokens: response.oauthTokens,
    authenticationMethod: response.authenticationMethod,
  });
});

const logFailure = (message: string) =>
  Effect.logWarning("Social sign-in failed").pipe(
    Effect.annotateLogs({ error: message }),
    Effect.as<SocialCallbackOutcome>({ kind: "failed" })
  );

const mapFailure = (error: WorkOSAuthError | UserSyncError) => {
  if (!(error instanceof WorkOSAuthError)) {
    return logFailure(error.message);
  }

  const info = readWorkOSError(error.error);

  if (
    info.code === VERIFICATION_REQUIRED_CODE &&
    info.pendingAuthenticationToken
  ) {
    const outcome: SocialCallbackOutcome = {
      kind: "verification-required",
      pendingAuthenticationToken: info.pendingAuthenticationToken,
      email: info.email ?? undefined,
    };
    return Effect.succeed(outcome);
  }

  if (
    info.code === MFA_ERROR_CODES.ENROLLMENT &&
    info.pendingAuthenticationToken &&
    info.userId
  ) {
    return Effect.succeed<SocialCallbackOutcome>({
      kind: "mfa-enrollment-required",
      pendingAuthenticationToken: info.pendingAuthenticationToken,
      workosUserId: info.userId,
      email: info.email ?? undefined,
    });
  }

  if (info.code === MFA_ERROR_CODES.CHALLENGE) {
    return resolveMfaFlow(info, info.email ?? "").pipe(
      Effect.flatMap((mfaResult) => {
        if (mfaResult?.status !== "mfa-required") {
          return logFailure(info.message);
        }
        return Effect.succeed<SocialCallbackOutcome>({
          kind: "mfa-required",
          pendingAuthenticationToken: mfaResult.pendingAuthenticationToken,
          authenticationChallengeId: mfaResult.authenticationChallengeId,
          email: mfaResult.email || undefined,
        });
      }),
      Effect.catch((mfaError) =>
        logFailure(readWorkOSError(mfaError.error).message)
      )
    );
  }

  return logFailure(info.message);
};

function buildMfaLoginUrl(flowId: string, returnTo: string) {
  const params = new URLSearchParams({
    [LOGIN_MFA_QUERY_KEY]: flowId,
    returnTo,
  });
  return `/login?${params.toString()}`;
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const state = new URL(request.url).searchParams.get("state");

  if (!code) {
    throw redirect({ href: "/login" });
  }

  const expectedNonce = getCookie(SOCIAL_AUTH_STATE_COOKIE);
  deleteCookie(SOCIAL_AUTH_STATE_COOKIE);

  const separatorIndex = state?.indexOf(":") ?? -1;
  const stateNonce =
    separatorIndex === -1 ? state : (state?.slice(0, separatorIndex) ?? null);
  const stateReturnTo =
    separatorIndex === -1 ? null : (state?.slice(separatorIndex + 1) ?? null);

  if (!(expectedNonce && stateNonce) || expectedNonce !== stateNonce) {
    throw redirect({ href: "/login?error=social-sign-in-failed" });
  }

  const outcome = await Effect.runPromise(
    exchangeSocialCode(code).pipe(
      Effect.as<SocialCallbackOutcome>({ kind: "success" }),
      Effect.catch(mapFailure)
    )
  );

  const returnTo = sanitizeReturnTo(stateReturnTo) ?? "/callback";

  if (outcome.kind === "verification-required") {
    const params = new URLSearchParams({
      verify: outcome.pendingAuthenticationToken ?? "",
      returnTo,
    });
    if (outcome.email) {
      params.set("email", outcome.email);
    }
    throw redirect({ href: `/login?${params.toString()}` });
  }

  if (outcome.kind === "mfa-required") {
    const flowId = await storePendingMfaFlow({
      kind: "challenge",
      pendingAuthenticationToken: outcome.pendingAuthenticationToken ?? "",
      authenticationChallengeId: outcome.authenticationChallengeId ?? "",
      email: outcome.email ?? "",
    });
    throw redirect({ href: buildMfaLoginUrl(flowId, returnTo) });
  }

  if (outcome.kind === "mfa-enrollment-required") {
    const flowId = await storePendingMfaFlow({
      kind: "enrollment",
      pendingAuthenticationToken: outcome.pendingAuthenticationToken ?? "",
      workosUserId: outcome.workosUserId ?? "",
      email: outcome.email ?? "",
    });
    throw redirect({ href: buildMfaLoginUrl(flowId, returnTo) });
  }

  if (outcome.kind === "failed") {
    throw redirect({ href: "/login?error=social-sign-in-failed" });
  }

  throw redirect({ href: returnTo });
}
