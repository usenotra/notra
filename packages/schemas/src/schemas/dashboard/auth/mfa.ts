import "zod/compile";
import { returnToSchema } from "@notra/schemas/dashboard/auth/return-to";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const AUTH_TOKEN_MAX_LENGTH = 4096;
const WORKOS_ID_MAX_LENGTH = 128;
const ONE_TIME_CODE_REGEX = /^\d{6}$/;

export const totpCodeSchema = z
  .string()
  .regex(
    ONE_TIME_CODE_REGEX,
    "Enter the 6-digit code from your authenticator app"
  );

const emailCodeSchema = z
  .string()
  .regex(ONE_TIME_CODE_REGEX, "Enter the 6-digit code from your email");

const workosIdSchema = (label: string) =>
  z.string().min(1, `${label} is missing`).max(WORKOS_ID_MAX_LENGTH);

export const verifyMfaCodeInputSchema = z.object({
  pendingAuthenticationToken: z
    .string()
    .min(1, "Sign-in session is missing")
    .max(AUTH_TOKEN_MAX_LENGTH),
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: totpCodeSchema,
  returnTo: returnToSchema,
  enrollment: z.boolean().optional(),
});

const BACKUP_CODE_SEPARATOR_REGEX = /[\s-]/g;
const BACKUP_CODE_REGEX = /^[a-z0-9]{8}$/;

export const backupCodeSchema = z
  .string()
  .transform((value) =>
    value.toLowerCase().replace(BACKUP_CODE_SEPARATOR_REGEX, "")
  )
  .pipe(z.string().regex(BACKUP_CODE_REGEX, "Enter a valid backup code"));

export const redeemBackupCodeInputSchema = z.object({
  recoveryToken: z
    .string()
    .min(1, "Recovery session is missing")
    .max(AUTH_TOKEN_MAX_LENGTH),
  code: backupCodeSchema,
  returnTo: returnToSchema,
});

export const startPasskeySignInInputSchema = z.object({
  returnTo: returnToSchema,
});

export const verifyTotpEnrollmentInputSchema = z.object({
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: totpCodeSchema,
});

export const removeAuthFactorInputSchema = z.object({
  factorId: workosIdSchema("Factor"),
});

export const verifySecurityChallengeInputSchema = z.object({
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: emailCodeSchema,
});

export const completePasskeyRegistrationInputSchema = z.object({
  challengeId: workosIdSchema("Challenge"),
  response: z.record(z.string(), z.unknown()),
});

export const removePasskeyInputSchema = z.object({
  passkeyId: workosIdSchema("Passkey"),
});
