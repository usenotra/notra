import type { AuthFlowResult } from "@notra/ui/lib/auth-types";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { Effect } from "effect";

import {
  MFA_ERROR_CODES,
  MFA_RECOVERY_COOKIE,
  MFA_RECOVERY_COOKIE_MAX_AGE_SECONDS,
  TOTP_FACTOR_TYPE,
  TOTP_ISSUER,
} from "@/constants/security";
import { WorkOSAuthError } from "@/lib/auth/errors";
import { storeShortLivedCookie } from "@/lib/auth/short-lived-cookie";
import type { WorkOSErrorInfo } from "@/lib/auth/workos-error";

const tryWorkOS = <T>(run: () => Promise<T>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) => new WorkOSAuthError({ error }),
  });

const createMfaChallenge = Effect.fn("auth.mfa.createChallenge")(function* (
  authenticationFactorId: string
) {
  const challenge = yield* tryWorkOS(() =>
    getWorkOS().multiFactorAuth.challengeFactor({ authenticationFactorId })
  );
  return challenge.id;
});

const enrollTotpFactor = Effect.fn("auth.mfa.enrollTotp")(function* (
  userId: string,
  totpUser: string
) {
  const enrollment = yield* tryWorkOS(() =>
    getWorkOS().multiFactorAuth.createUserAuthFactor({
      userId,
      type: TOTP_FACTOR_TYPE,
      totpIssuer: TOTP_ISSUER,
      totpUser,
    })
  );

  return {
    factorId: enrollment.authenticationFactor.id,
    authenticationChallengeId: enrollment.authenticationChallenge.id,
    qrCode: enrollment.authenticationFactor.totp.qrCode,
    secret: enrollment.authenticationFactor.totp.secret,
    otpauthUri: enrollment.authenticationFactor.totp.uri,
  };
});

/**
 * Turns a WorkOS `mfa_challenge` / `mfa_enrollment` authentication error into
 * the next step of the sign-in flow. Returns `null` when the error is not an
 * MFA error so the caller can fall through to its generic handling.
 */
export const resolveMfaFlow = Effect.fn("auth.mfa.resolveFlow")(function* (
  info: WorkOSErrorInfo,
  email: string
) {
  const pendingAuthenticationToken = info.pendingAuthenticationToken;
  if (!pendingAuthenticationToken) {
    return null;
  }

  const resolvedEmail = email || info.email || "";

  if (info.code === MFA_ERROR_CODES.CHALLENGE) {
    const factor =
      info.authenticationFactors.find(
        (candidate) => candidate.type === TOTP_FACTOR_TYPE
      ) ?? info.authenticationFactors[0];

    if (!factor) {
      return null;
    }

    const authenticationChallengeId = yield* createMfaChallenge(factor.id);
    if (info.userId) {
      // Lets the challenge form fall back to a backup code without the
      // client ever handling the user's identity.
      yield* Effect.promise(() =>
        storeShortLivedCookie(
          MFA_RECOVERY_COOKIE,
          info.userId ?? "",
          MFA_RECOVERY_COOKIE_MAX_AGE_SECONDS
        )
      );
    }
    const result: AuthFlowResult = {
      status: "mfa-required",
      pendingAuthenticationToken,
      authenticationChallengeId,
      email: resolvedEmail,
    };
    return result;
  }

  if (info.code === MFA_ERROR_CODES.ENROLLMENT && info.userId) {
    const enrollment = yield* enrollTotpFactor(info.userId, resolvedEmail);
    const result: AuthFlowResult = {
      status: "mfa-enrollment-required",
      pendingAuthenticationToken,
      authenticationChallengeId: enrollment.authenticationChallengeId,
      email: resolvedEmail,
      qrCode: enrollment.qrCode,
      secret: enrollment.secret,
      otpauthUri: enrollment.otpauthUri,
    };
    return result;
  }

  return null;
});
