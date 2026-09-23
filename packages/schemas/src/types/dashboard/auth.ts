import type * as z from "zod";

import type {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInWithPasswordInputSchema,
  signUpWithPasswordInputSchema,
  verifyEmailCodeInputSchema,
} from "../../schemas/dashboard/auth/credentials.js";
import type {
  discardTotpEnrollmentInputSchema,
  redeemBackupCodeInputSchema,
  regenerateBackupCodesInputSchema,
  removeAuthFactorInputSchema,
  resumeSocialEnrollmentInputSchema,
  verifyMfaCodeInputSchema,
  verifyTotpEnrollmentInputSchema,
} from "../../schemas/dashboard/auth/mfa.js";
import type { startSocialSignInInputSchema } from "../../schemas/dashboard/auth/social.js";

export type SignInWithPasswordInput = z.input<
  typeof signInWithPasswordInputSchema
>;
export type SignUpWithPasswordInput = z.input<
  typeof signUpWithPasswordInputSchema
>;
export type VerifyEmailCodeInput = z.input<typeof verifyEmailCodeInputSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordInputSchema>;
export type VerifyMfaCodeInput = z.input<typeof verifyMfaCodeInputSchema>;
export type RedeemBackupCodeInput = z.input<typeof redeemBackupCodeInputSchema>;
export type StartSocialSignInInput = z.input<
  typeof startSocialSignInInputSchema
>;
export type VerifyTotpEnrollmentInput = z.input<
  typeof verifyTotpEnrollmentInputSchema
>;
export type DiscardTotpEnrollmentInput = z.input<
  typeof discardTotpEnrollmentInputSchema
>;
export type RemoveAuthFactorInput = z.input<typeof removeAuthFactorInputSchema>;
export type RegenerateBackupCodesInput = z.input<
  typeof regenerateBackupCodesInputSchema
>;
export type ResumeSocialEnrollmentInput = z.input<
  typeof resumeSocialEnrollmentInputSchema
>;

export interface TotpEnrollmentSecrets {
  qrCode: string;
  secret: string;
  otpauthUri: string;
}

export interface TotpEnrollment extends TotpEnrollmentSecrets {
  factorId: string;
  authenticationChallengeId: string;
}

export interface TotpFactorSummary {
  id: string;
  issuer: string | null;
  createdAt: string;
}

export interface AuthFlowSuccess {
  status: "success";
  redirectTo: string;
}

export interface AuthFlowEnrolled {
  status: "enrolled";
  redirectTo: string;
  backupCodes: string[];
}

export interface AuthFlowVerificationRequired {
  status: "verification-required";
  pendingAuthenticationToken: string;
  email: string;
}

export interface AuthFlowMfaRequired {
  status: "mfa-required";
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  email: string;
}

export interface AuthFlowMfaEnrollmentRequired extends TotpEnrollment {
  status: "mfa-enrollment-required";
  pendingAuthenticationToken: string;
  email: string;
}

export interface AuthFlowError {
  status: "error";
  message: string;
}

export type AuthFlowResult =
  | AuthFlowSuccess
  | AuthFlowEnrolled
  | AuthFlowVerificationRequired
  | AuthFlowMfaRequired
  | AuthFlowMfaEnrollmentRequired
  | AuthFlowError;

export type PendingAuthStep =
  | AuthFlowVerificationRequired
  | AuthFlowMfaRequired
  | AuthFlowMfaEnrollmentRequired;

export interface AuthFlowRecovered {
  status: "recovered";
  email: string;
}

export type RedeemBackupCodeResult = AuthFlowRecovered | AuthFlowError;

export interface SecurityOverview {
  email: string;
  totpFactors: TotpFactorSummary[];
  backupCodesRemaining: number;
}

export type StartTotpEnrollmentResult = TotpEnrollment;

export interface VerifyTotpEnrollmentResult {
  verified: true;
  backupCodes: string[] | null;
  warning: string | null;
}

export interface RegenerateBackupCodesResult {
  codes: string[];
}
