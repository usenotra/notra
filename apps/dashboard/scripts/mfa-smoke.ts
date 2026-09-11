/**
 * Exercises the server-side TOTP flow against real WorkOS for the dev account
 * from create-dev-auth-account.ts: enroll → verify → sign in → mfa_challenge →
 * challenge → authenticateWithTotp. Cleans the factor up afterwards.
 *
 *   cd apps/dashboard
 *   bun --env-file=../../.env scripts/mfa-smoke.ts
 */

import { AuthenticationException, WorkOS } from "@workos-inc/node";

import { generateTotpCode } from "../src/lib/auth/dev-totp";

const EMAIL = process.env.DEV_AUTH_EMAIL ?? "mfa-demo@demo.notra.dev";
const PASSWORD = process.env.DEV_AUTH_PASSWORD ?? "MfaDemo-2026!";

const apiKey = process.env.WORKOS_API_KEY;
const clientId = process.env.WORKOS_CLIENT_ID;
if (!(apiKey && clientId)) {
  throw new Error("WORKOS_API_KEY and WORKOS_CLIENT_ID must be set");
}
if (!apiKey.startsWith("sk_test")) {
  throw new Error("Refusing to run against a non-test WorkOS API key");
}

const workos = new WorkOS(apiKey, { clientId });

const user = (await workos.userManagement.listUsers({ email: EMAIL })).data[0];
if (!user) {
  throw new Error(
    `No WorkOS user for ${EMAIL}; run create-dev-auth-account.ts`
  );
}

const enrollment = await workos.multiFactorAuth.createUserAuthFactor({
  userId: user.id,
  type: "totp",
  totpIssuer: "Notra",
  totpUser: EMAIL,
});
const factorId = enrollment.authenticationFactor.id;
const secret = enrollment.authenticationFactor.totp.secret;
console.log(`1. Enrolled factor ${factorId}`);

try {
  const verification = await workos.multiFactorAuth.verifyChallenge({
    authenticationChallengeId: enrollment.authenticationChallenge.id,
    code: await generateTotpCode(secret),
  });
  console.log(`2. Enrollment challenge valid: ${verification.valid}`);

  let pendingToken: string | undefined;
  try {
    await workos.userManagement.authenticateWithPassword({
      clientId,
      email: EMAIL,
      password: PASSWORD,
    });
    console.log(
      "3. Password sign-in succeeded WITHOUT an MFA challenge → MFA is not enabled for this WorkOS environment (Dashboard → Authentication → Multi-Factor Auth)."
    );
  } catch (error) {
    if (!(error instanceof AuthenticationException)) {
      throw error;
    }
    console.log(`3. Password sign-in → ${error.code}`);
    if (error.code !== "mfa_challenge") {
      throw error;
    }
    pendingToken = error.pendingAuthenticationToken;
    const factors = error.rawData.authentication_factors ?? [];
    console.log(`   factors in error: ${JSON.stringify(factors)}`);
  }

  if (pendingToken) {
    const challenge = await workos.multiFactorAuth.challengeFactor({
      authenticationFactorId: factorId,
    });
    const response = await workos.userManagement.authenticateWithTotp({
      clientId,
      pendingAuthenticationToken: pendingToken,
      authenticationChallengeId: challenge.id,
      code: await generateTotpCode(secret),
    });
    console.log(
      `4. authenticateWithTotp → session for ${response.user.email} via ${response.authenticationMethod}`
    );
  }
} finally {
  await workos.multiFactorAuth.deleteFactor(factorId);
  console.log(`5. Cleaned up factor ${factorId}`);
}
process.exit(0);
