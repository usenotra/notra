import type {
  EmailVerificationFormLabels,
  LoginFormLabels,
  MfaChallengeFormLabels,
  MfaEnrollmentFormLabels,
  TotpEnrollmentPanelLabels,
} from "@notra/ui/types/auth";

const CODE_ERROR_FALLBACK = "That code didn't work. Please try again.";

export const DEFAULT_AUTH_PASSWORD_FIELD_LABEL = "Password";
export const DEFAULT_AUTH_OR_DIVIDER_LABEL = "Or";
export const DEFAULT_AUTH_LAST_USED_LABEL = "Last Used";
export const DEFAULT_TOTP_CODE_INPUT_LABEL = "Verification code";

export const DEFAULT_EMAIL_VERIFICATION_FORM_LABELS: EmailVerificationFormLabels =
  {
    title: "Check your email",
    description: (email) =>
      `We sent a 6-digit code to ${email || "your email address"}. Enter it below to continue.`,
    codeLabel: DEFAULT_TOTP_CODE_INPUT_LABEL,
    submit: "Verify email",
    errorFallback: "Verification failed. Please try again.",
  };

export const DEFAULT_MFA_CHALLENGE_FORM_LABELS: MfaChallengeFormLabels = {
  title: "Two-factor authentication",
  description: (email) =>
    email
      ? `Enter the 6-digit code from your authenticator app to finish signing in as ${email}.`
      : "Enter the 6-digit code from your authenticator app to finish signing in.",
  codeLabel: "Authentication code",
  submit: "Verify code",
  useBackupCode: "Lost your device? Use a backup code",
  backToSignIn: "Back to sign in",
  backupTitle: "Use a backup code",
  backupDescription:
    "Enter one of the backup codes you saved when you set up two-factor authentication. Each code works once.",
  backupCodeLabel: "Backup code",
  backupCodePlaceholder: "xxxx-xxxx",
  backupSubmit: "Use backup code",
  useAuthenticator: "Use my authenticator app instead",
  issuedCodesTitle: "Your backup codes",
  issuedCodesDescription:
    "You're signed in. Save these backup codes now: each one lets you in once if you lose your authenticator app.",
  issuedCodesDone: "Continue",
  errorFallback: CODE_ERROR_FALLBACK,
  backupCodesPanel: {},
};

export const DEFAULT_TOTP_ENROLLMENT_PANEL_LABELS: TotpEnrollmentPanelLabels = {
  submit: "Turn on two-factor",
  cancel: "Cancel",
  done: "Done",
  back: "Back",
  continue: "Continue",
  scanInstructions: "Scan this with 1Password, Google Authenticator, or Authy.",
  qrAlt: (accountLabel) =>
    accountLabel
      ? `QR code to add ${accountLabel} to an authenticator app`
      : "QR code to add this account to an authenticator app",
  cantScan: "Can't scan it?",
  manualInstructions:
    "In your authenticator app, add an account with this key and time-based codes.",
  setupKey: "Setup key",
  setupUri: "Setup URI",
  copyValue: (label) => `Copy ${label}`,
  valueCopied: (label) => `${label} copied`,
  scanInstead: "Scan QR code instead",
  codeLabel: "Enter the 6-digit code from your app",
  errorFallback: CODE_ERROR_FALLBACK,
  backupCodesPanel: {},
};

export const DEFAULT_MFA_ENROLLMENT_FORM_LABELS: MfaEnrollmentFormLabels = {
  title: "Set up two-factor authentication",
  description: (email) =>
    email
      ? `Your organization requires a second step when signing in as ${email}.`
      : "Your organization requires a second step when signing in.",
  submit: "Verify and sign in",
  cancel: "Back to sign in",
  done: "Continue to Notra",
  errorFallback: CODE_ERROR_FALLBACK,
  enrollmentPanel: {},
};

export const DEFAULT_LOGIN_FORM_LABELS: LoginFormLabels = {
  title: "Welcome back",
  description: "Log in to pick up where your team left off.",
  emailLabel: "Email",
  emailPlaceholder: "jane@company.com",
  passwordLabel: DEFAULT_AUTH_PASSWORD_FIELD_LABEL,
  passwordPlaceholder: "Your password",
  or: DEFAULT_AUTH_OR_DIVIDER_LABEL,
  lastUsed: DEFAULT_AUTH_LAST_USED_LABEL,
  submit: "Log in",
  forgotPassword: "Forgot your password?",
  resetPassword: "Reset Your Password",
  noAccount: "Don't have an account?",
  register: "Register",
  loginErrorFallback: "Failed to sign in. Please try again.",
  socialErrorFallback: "Social sign-in failed. Please try again.",
  backupCodeRecovered: (email) =>
    `Backup code accepted. Two-factor authentication was turned off for ${email}. Sign in again to continue.`,
  pendingStep: {},
};
