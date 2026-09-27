import type {
  BackupCodesPanelLabels,
  SecondFactorConfirmLabels,
  TwoFactorSettingsLabels,
} from "@notra/ui/types/security";

export const DEFAULT_SECOND_FACTOR_CONFIRM_LABELS: SecondFactorConfirmLabels = {
  codeLabel: "Authenticator or backup code",
  codePlaceholder: "123456 or xxxx-xxxx",
  cancel: "Cancel",
  errorFallback: "That code didn't work. Please try again.",
};

export const DEFAULT_BACKUP_CODES_PANEL_LABELS: BackupCodesPanelLabels = {
  title: "Save your backup codes",
  description:
    "Each works once if you lose your device. They won't be shown again.",
  download: "Download",
  print: "Print",
  done: "Done",
  copyError: "Couldn't copy. Select the codes and copy them manually.",
  printBlocked: "Your browser blocked the print window.",
  printNote: "Each code works once.",
  exportTitle: (issuer) => `${issuer} backup codes`,
  exportAccount: (accountLabel) => `Account: ${accountLabel}`,
  exportGenerated: (date) => `Generated: ${date}`,
  exportInstructions:
    "Each code can be used once if you lose access to your authenticator app.",
  fileName: (issuer) => `${issuer.toLowerCase()}-backup-codes.txt`,
};

export const DEFAULT_SECURITY_LOAD_ERROR_RETRY_LABEL = "Try again";

export const DEFAULT_SECURITY_DATE_LOCALE = "en-US";

export const DEFAULT_TWO_FACTOR_SETTINGS_LABELS: TwoFactorSettingsLabels = {
  loadError: "Couldn't load your two-factor settings.",
  retry: DEFAULT_SECURITY_LOAD_ERROR_RETRY_LABEL,
  title: "Authenticator app",
  enabled: "On",
  enabledDescription: "Required when you sign in with your password.",
  disabledDescription: "Codes from 1Password, Google Authenticator, or Authy.",
  setUp: "Set up",
  dialogTitle: "Set up two-factor authentication",
  dialogDescription: "Adds a code check whenever you sign in with your password.",
  defaultFactorName: "Authenticator app",
  addedOn: (date) => `Added ${date}`,
  remove: "Remove",
  removeTitle: "Turn off two-factor authentication?",
  removeDescription: (factorName) =>
    `Signing in will no longer ask for a code from ${factorName}. Confirm with a code from your authenticator app or an unused backup code.`,
  removeConfirm: "Remove authenticator",
  backupCodesTitle: "Backup codes",
  backupCodesDescription: "One-time codes for when your device isn't around.",
  backupCodesRemaining: (count) =>
    `${count} unused ${count === 1 ? "code" : "codes"} left.`,
  backupCodesExhausted: "All codes used. Generate a new set.",
  regenerate: "Regenerate",
  regenerateTitle: "Regenerate backup codes?",
  regenerateDescription:
    "Your current codes stop working once new ones are generated. Confirm with your authenticator app or an unused backup code.",
  regenerateConfirm: "Generate new codes",
  enrollmentPanel: {},
  backupCodesPanel: {},
  secondFactorConfirm: {},
};
