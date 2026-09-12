export type SocialProvider = "google" | "github";

export type AuthMethod = "email" | "google" | "github" | "passkey";

export interface SignInWithPasswordInput {
  email: string;
  password: string;
  returnTo?: string | null;
}

export interface VerifyEmailCodeInput {
  pendingAuthenticationToken: string;
  code: string;
  returnTo?: string | null;
}

export interface VerifyMfaCodeInput {
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  code: string;
  returnTo?: string | null;
}

export interface RedeemBackupCodeInput {
  code: string;
  returnTo?: string | null;
}

export interface StartSocialSignInInput {
  provider: string;
  returnTo?: string | null;
}

export interface StartPasskeySignInInput {
  returnTo?: string | null;
}

export interface AuthFlowSuccess {
  status: "success";
  redirectTo: string;
}

/** First successful TOTP sign-in: the session exists and backup codes were issued once. */
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

export interface AuthFlowMfaEnrollmentRequired {
  status: "mfa-enrollment-required";
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  email: string;
  qrCode: string;
  secret: string;
  otpauthUri: string;
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

/** The results that keep the user on the auth screen for another step. */
export type PendingAuthStep =
  | AuthFlowVerificationRequired
  | AuthFlowMfaRequired
  | AuthFlowMfaEnrollmentRequired;

/** A backup code was accepted: the authenticator was removed, sign in again. */
export interface AuthFlowRecovered {
  status: "recovered";
  email: string;
}

export type RedeemBackupCodeResult = AuthFlowRecovered | AuthFlowError;

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
export type StartPasskeySignIn = (
  input: StartPasskeySignInInput
) => Promise<void>;

/**
 * Feeds a server result back into the auth flow. Returns true when the flow
 * moved on (signed in or a new pending step), false when the caller should
 * show `result.message`.
 */
export type ApplyAuthResult = (result: AuthFlowResult) => boolean;

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

export interface AuthPasskeyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  lastUsed?: boolean;
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
  onBack?: () => void;
  /** Called when a backup code was accepted and the authenticator removed. */
  onRecovered?: (email: string) => void;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode?: RedeemBackupCode;
}

export interface MfaEnrollmentFormProps {
  step: AuthFlowMfaEnrollmentRequired;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  /** Leaves the auth screen once the backup codes were acknowledged. */
  onFinish: (redirectTo: string) => void;
  onBack?: () => void;
  verifyMfaCode: VerifyMfaCode;
}

export interface TotpEnrollmentPanelProps {
  qrCode: string;
  secret: string;
  otpauthUri?: string;
  accountLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
  doneLabel?: string;
  onSubmit: (code: string) => Promise<TotpVerifyResult>;
  onCancel?: () => void;
  /** Called after the backup codes step (or right after verification when none were issued). */
  onDone?: () => void;
}

export interface AuthPendingStepProps {
  step: PendingAuthStep;
  returnTo?: string | null;
  onResult: ApplyAuthResult;
  onFinish: (redirectTo: string) => void;
  onBack: () => void;
  onRecovered?: (email: string) => void;
  verifyEmailCode: VerifyEmailCode;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode?: RedeemBackupCode;
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
  redeemBackupCode?: RedeemBackupCode;
  startSocialSignIn: StartSocialSignIn;
  startPasskeySignIn?: StartPasskeySignIn;
}
