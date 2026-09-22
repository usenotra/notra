import type {
  AuthFlowMfaEnrollmentRequired,
  AuthFlowMfaRequired,
  AuthFlowResult,
  AuthFlowVerificationRequired,
  PendingAuthStep,
  RedeemBackupCodeInput,
  RedeemBackupCodeResult,
  SignInWithPasswordInput,
  StartSocialSignInInput,
  VerifyEmailCodeInput,
  VerifyMfaCodeInput,
} from "@notra/schemas/types/dashboard/auth";

import type { ReactNode } from "react";

export type SocialProvider = "google" | "github";
export type AuthMethod = "email" | SocialProvider;
export type ChallengeMode = "totp" | "backup";
export type EnrollmentStep = "scan" | "manual" | "code" | "backup";

export interface MfaSubmitButtonProps {
  isPending: boolean;
  disabled: boolean;
  pendingLabel: string;
  label: string;
}

export interface CopyValueFieldProps {
  label: string;
  value: string;
  display?: string;
}

export interface StepActionsProps {
  secondary?: ReactNode;
  children: ReactNode;
}

export type SignInWithPassword = (
  input: SignInWithPasswordInput
) => Promise<AuthFlowResult>;
export type VerifyEmailCode = (
  input: VerifyEmailCodeInput
) => Promise<AuthFlowResult>;
export type VerifyMfaCode = (input: VerifyMfaCodeInput) => Promise<AuthFlowResult>;
export type RedeemBackupCode = (
  input: RedeemBackupCodeInput
) => Promise<RedeemBackupCodeResult>;
export type StartSocialSignIn = (input: StartSocialSignInInput) => Promise<void>;
export type ApplyAuthResult = (result: AuthFlowResult) => boolean;

export interface TotpEnrollmentSubmission {
  code: string;
}

export type TotpVerifyResult =
  | { ok: true; backupCodes?: string[] }
  | { ok: false; message: string };

export interface UseAuthFlowOptions {
  initialPending?: PendingAuthStep;
  onSuccess?: () => void;
}

export interface AuthFormHeaderProps {
  title?: string;
  description?: string;
}

export interface AuthSocialButtonsProps {
  authMethod: AuthMethod | null;
  disabled: boolean;
  lastMethod?: string | null;
  onSelect: (provider: SocialProvider) => void;
}

export interface AuthFieldErrorProps {
  id: string;
  error?: string;
}

export interface AuthFormErrorProps {
  error: string | null;
  className?: string;
}

export interface AuthEmailFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  placeholder: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

export interface AuthPasswordFieldProps {
  id: string;
  value: string;
  error?: string;
  disabled: boolean;
  placeholder: string;
  autoComplete: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

export interface TotpCodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export interface EmailVerificationFormProps {
  step: AuthFlowVerificationRequired;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  verifyEmailCode: VerifyEmailCode;
}

export interface MfaChallengeFormProps {
  step: AuthFlowMfaRequired;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  /** Called once the user has seen backup codes issued during sign-in. */
  onFinish: (redirectTo: string) => void;
  onBack?: () => void;
  onRecovered: (email: string) => void;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode: RedeemBackupCode;
}

export interface MfaEnrollmentFormProps {
  step: AuthFlowMfaEnrollmentRequired;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  onFinish: (redirectTo: string) => void;
  onBack?: () => void;
  verifyMfaCode: VerifyMfaCode;
}

export interface TotpEnrollmentPanelProps {
  qrCode: string;
  secret: string;
  otpauthUri: string;
  accountLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
  doneLabel?: string;
  onSubmit: (submission: TotpEnrollmentSubmission) => Promise<TotpVerifyResult>;
  onCancel?: () => void;
  onDone?: () => void;
}

export interface AuthPendingStepProps {
  step: PendingAuthStep;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  onFinish: (redirectTo: string) => void;
  onBack: () => void;
  onRecovered: (email: string) => void;
  verifyEmailCode: VerifyEmailCode;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode: RedeemBackupCode;
}

export interface LoginFieldValidators {
  email: (value: string) => string | undefined;
  password: (value: string) => string | undefined;
}

export interface LoginFormProps {
  title?: string;
  description?: string;
  onSuccess?: () => void;
  returnTo?: string;
  showSignupLink?: boolean;
  showForgotPasswordLink?: boolean;
  initialError?: string;
  initialPending?: PendingAuthStep;
  callbackPath: string;
  validators: LoginFieldValidators;
  signInWithPassword: SignInWithPassword;
  verifyEmailCode: VerifyEmailCode;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode: RedeemBackupCode;
  startSocialSignIn: StartSocialSignIn;
}
