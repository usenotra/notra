export type SocialProvider = "google" | "github";

export type AuthMethod = "email" | "google" | "github" | "passkey";

export interface PendingVerification {
  pendingAuthenticationToken: string;
  email: string;
}

export interface PendingMfaChallenge {
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  email: string;
  /** Signed token that lets the user fall back to a backup code. */
  recoveryToken?: string;
}

export interface PendingMfaEnrollment extends PendingMfaChallenge {
  qrCode: string;
  secret: string;
  otpauthUri?: string;
}

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
  /** True when the code completes a first-time enrollment; issues backup codes. */
  enrollment?: boolean;
}

export interface RedeemBackupCodeInput {
  recoveryToken: string;
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
  /** Present once, right after a first-time TOTP enrollment. */
  backupCodes?: string[];
}

/** A backup code was accepted: the authenticator was removed, sign in again. */
export interface AuthFlowRecovered {
  status: "recovered";
  email: string;
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
  recoveryToken?: string;
}

export interface AuthFlowMfaEnrollmentRequired {
  status: "mfa-enrollment-required";
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  email: string;
  qrCode: string;
  secret: string;
  otpauthUri?: string;
}

export interface AuthFlowError {
  status: "error";
  message: string;
}

export type AuthFlowResult =
  | AuthFlowSuccess
  | AuthFlowVerificationRequired
  | AuthFlowMfaRequired
  | AuthFlowMfaEnrollmentRequired
  | AuthFlowRecovered
  | AuthFlowError;

export type VerifyMfaCode = (input: VerifyMfaCodeInput) => Promise<AuthFlowResult>;

export type RedeemBackupCode = (input: RedeemBackupCodeInput) => Promise<AuthFlowResult>;

export type TotpVerifyResult =
  | { ok: true; backupCodes?: string[] }
  | { ok: false; message: string };

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
  pendingAuthenticationToken: string;
  email: string;
  returnTo?: string | null;
  onSuccess?: () => void;
  onMfaRequired?: (challenge: PendingMfaChallenge) => void;
  onMfaEnrollmentRequired?: (enrollment: PendingMfaEnrollment) => void;
  verifyEmailCode: (input: VerifyEmailCodeInput) => Promise<AuthFlowResult>;
}

export interface MfaChallengeFormProps {
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  email?: string;
  returnTo?: string | null;
  recoveryToken?: string;
  onSuccess?: () => void;
  onBack?: () => void;
  /** Called when a backup code was accepted and the authenticator removed. */
  onRecovered?: (email: string) => void;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode?: RedeemBackupCode;
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

export interface MfaEnrollmentFormProps {
  enrollment: PendingMfaEnrollment;
  returnTo?: string | null;
  onSuccess?: () => void;
  onBack?: () => void;
  verifyMfaCode: VerifyMfaCode;
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
  initialPendingVerification?: PendingVerification;
  initialPendingMfa?: PendingMfaChallenge;
  callbackPath: string;
  validators: LoginFieldValidators;
  signInWithPassword: (
    input: SignInWithPasswordInput
  ) => Promise<AuthFlowResult>;
  verifyEmailCode: (input: VerifyEmailCodeInput) => Promise<AuthFlowResult>;
  verifyMfaCode: VerifyMfaCode;
  redeemBackupCode?: RedeemBackupCode;
  startSocialSignIn: (input: StartSocialSignInInput) => Promise<void>;
  startPasskeySignIn?: (input: StartPasskeySignInInput) => Promise<void>;
}
