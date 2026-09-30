import type { TotpEnrollment } from "@notra/schemas/types/dashboard/auth";
import { getWorkOS } from "@workos-inc/authkit-nextjs";

import { TOTP_FACTOR_TYPE, TOTP_ISSUER } from "@/constants/security";

export async function createTotpFactor(
  userId: string,
  totpUser: string
): Promise<TotpEnrollment> {
  const enrollment = await getWorkOS().multiFactorAuth.createUserAuthFactor({
    userId,
    type: TOTP_FACTOR_TYPE,
    totpIssuer: TOTP_ISSUER,
    totpUser,
  });

  return {
    factorId: enrollment.authenticationFactor.id,
    authenticationChallengeId: enrollment.authenticationChallenge.id,
    qrCode: enrollment.authenticationFactor.totp.qrCode,
    secret: enrollment.authenticationFactor.totp.secret,
    otpauthUri: enrollment.authenticationFactor.totp.uri,
  };
}
