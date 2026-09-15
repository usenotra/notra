import "zod/compile";
import {
  BACKUP_CODE_LENGTH,
  FACTOR_NAME_MAX_LENGTH,
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

/** Optional user-given label for an authenticator; blank means "no name". */
export const factorNameSchema = z
  .string()
  .trim()
  .max(
    FACTOR_NAME_MAX_LENGTH,
    `Name must be at most ${FACTOR_NAME_MAX_LENGTH} characters`
  )
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const verifyMfaCodeInputSchema = z.object({
  pendingAuthenticationToken: z
    .string()
    .min(1, "Sign-in session is missing")
    .max(AUTH_TOKEN_MAX_LENGTH),
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: totpCodeSchema,
  returnTo: returnToSchema,
  factorLabel: z
    .object({ factorId: workosIdSchema("Factor"), name: factorNameSchema })
    .optional(),
});

const BACKUP_CODE_REGEX = new RegExp(`^[a-z0-9]{${BACKUP_CODE_LENGTH}}$`);

export const backupCodeSchema = z
  .string()
  .transform(normalizeBackupCode)
  .pipe(z.string().regex(BACKUP_CODE_REGEX, "Enter a valid backup code"));

export const redeemBackupCodeInputSchema = z.object({
  /** The challenge on screen; the server rejects codes for any other attempt. */
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: backupCodeSchema,
  returnTo: returnToSchema,
});

export const verifyTotpEnrollmentInputSchema = z.object({
  authenticationChallengeId: workosIdSchema("Challenge"),
  code: totpCodeSchema,
  name: factorNameSchema,
});

export const removeAuthFactorInputSchema = z.object({
  factorId: workosIdSchema("Factor"),
});
