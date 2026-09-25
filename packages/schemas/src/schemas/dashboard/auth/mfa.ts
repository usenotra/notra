import "zod/compile";
import {
  BACKUP_CODE_LENGTH,
  TOTP_CODE_LENGTH,
} from "@notra/schemas/constants/dashboard/auth";
import { returnToSchema } from "@notra/schemas/dashboard/auth/return-to";
import { normalizeBackupCode } from "@notra/schemas/utils/auth";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const AUTH_TOKEN_MAX_LENGTH = 4096;
const WORKOS_ID_MAX_LENGTH = 128;
const ONE_TIME_CODE_REGEX = new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`);

export const totpCodeSchema = z
  .string()
  .regex(
    ONE_TIME_CODE_REGEX,
    `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app`
  );

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
});

const BACKUP_CODE_REGEX = new RegExp(`^[a-z0-9]{${BACKUP_CODE_LENGTH}}$`);

export const backupCodeSchema = z
  .string()
  .transform(normalizeBackupCode)
  .pipe(z.string().regex(BACKUP_CODE_REGEX, "Enter a valid backup code"));

export const redeemBackupCodeInputSchema = z.object({
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: backupCodeSchema,
  returnTo: returnToSchema,
});

export const secondFactorCodeSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      ONE_TIME_CODE_REGEX.test(value) ||
      BACKUP_CODE_REGEX.test(normalizeBackupCode(value)),
    "Enter the code from your authenticator app or a backup code"
  );

export const verifyTotpEnrollmentInputSchema = z.object({
  factorId: workosIdSchema("Factor"),
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: totpCodeSchema,
});

export const discardTotpEnrollmentInputSchema = z.object({
  factorId: workosIdSchema("Factor"),
});

export const removeAuthFactorInputSchema = z.object({
  factorId: workosIdSchema("Factor"),
  confirmationCode: secondFactorCodeSchema,
});

export const regenerateBackupCodesInputSchema = z.object({
  confirmationCode: secondFactorCodeSchema,
});

export const resumeSocialEnrollmentInputSchema = z.object({
  flowId: z.uuid("Sign-in session is missing"),
  returnTo: returnToSchema,
});
