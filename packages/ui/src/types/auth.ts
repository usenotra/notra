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

import type { BackupCodesPanelLabels } from "./security";

export type SocialProvider = "google" | "github";
export type AuthMethod = "email" | SocialProvider;
export type ChallengeMode = "totp" | "backup";
export type EnrollmentStep = "scan" | "manual" | "code" | "backup";

export interface CopyValueFieldProps {
  label: string;
  value: string;
  display?: string;
  copyLabel: string;
  copiedLabel: string;
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
  lastUsedLabel?: string;
  onSelect: (provider: SocialProvider) => void;
}

export interface AuthOrDividerProps {
  label?: string;
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
  label?: string;
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
  labels?: Partial<EmailVerificationFormLabels>;
}

export interface MfaChallengeFormProps {
  step: AuthFlowMfaRequired;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  onFinish: (redirectTo: string) => void;
  onBack?: () => void;
  onRecovered: (email: string) => void;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode: RedeemBackupCode;
  labels?: Partial<MfaChallengeFormLabels>;
}

export interface MfaEnrollmentFormProps {
  step: AuthFlowMfaEnrollmentRequired;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  onFinish: (redirectTo: string) => void;
  onBack?: () => void;
  verifyMfaCode: VerifyMfaCode;
  labels?: Partial<MfaEnrollmentFormLabels>;
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
  labels?: Partial<TotpEnrollmentPanelLabels>;
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
  labels?: Partial<AuthPendingStepLabels>;
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
  labels?: Partial<LoginFormLabels>;
}

export interface EmailVerificationFormLabels {
  title: string;
  description: (email?: string) => string;
  codeLabel: string;
  submit: string;
  errorFallback: string;
}

export interface MfaChallengeFormLabels {
  title: string;
  description: (email?: string) => string;
  codeLabel: string;
  submit: string;
  useBackupCode: string;
  backToSignIn: string;
  backupTitle: string;
  backupDescription: string;
  backupCodeLabel: string;
  backupCodePlaceholder: string;
  backupSubmit: string;
  useAuthenticator: string;
  issuedCodesTitle: string;
  issuedCodesDescription: string;
  issuedCodesDone: string;
  errorFallback: string;
  backupCodesPanel: Partial<BackupCodesPanelLabels>;
}

export interface TotpEnrollmentPanelLabels {
  submit: string;
  cancel: string;
  done: string;
  back: string;
  continue: string;
  scanInstructions: string;
  qrAlt: (accountLabel?: string) => string;
  cantScan: string;
  manualInstructions: string;
  setupKey: string;
  setupUri: string;
  copyValue: (label: string) => string;
  valueCopied: (label: string) => string;
  scanInstead: string;
  codeLabel: string;
  errorFallback: string;
  backupCodesPanel: Partial<BackupCodesPanelLabels>;
}

export interface MfaEnrollmentFormLabels {
  title: string;
  description: (email?: string) => string;
  submit: string;
  cancel: string;
  done: string;
  errorFallback: string;
  enrollmentPanel: Partial<TotpEnrollmentPanelLabels>;
}

export interface AuthPendingStepLabels {
  emailVerification: Partial<EmailVerificationFormLabels>;
  mfaChallenge: Partial<MfaChallengeFormLabels>;
  mfaEnrollment: Partial<MfaEnrollmentFormLabels>;
}

export interface LoginFormLabels {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  or: string;
  lastUsed: string;
  submit: string;
  forgotPassword: string;
  resetPassword: string;
  noAccount: string;
  register: string;
  loginErrorFallback: string;
  socialErrorFallback: string;
  backupCodeRecovered: (email: string) => string;
  pendingStep: Partial<AuthPendingStepLabels>;
}
