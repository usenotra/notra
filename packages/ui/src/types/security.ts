import type { IconSvgElement } from "@hugeicons/react";
import type {
  TotpEnrollmentSecrets,
  TotpFactorSummary,
} from "@notra/schemas/types/dashboard/auth";
import type { ReactNode } from "react";

import type {
  TotpEnrollmentPanelLabels,
  TotpEnrollmentSubmission,
  TotpVerifyResult,
} from "./auth";

export type SecurityLoadStatus = "loading" | "ready" | "error";

export type BackupCodesOutcome =
  | { ok: true; codes: string[] }
  | { ok: false; message: string };

export type SecurityActionOutcome =
  | { ok: true }
  | { ok: false; message: string };

export interface SecondFactorConfirmProps {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (code: string) => Promise<SecurityActionOutcome>;
  onCancel: () => void;
  labels?: Partial<SecondFactorConfirmLabels>;
}

export interface SecondFactorConfirmLabels {
  codeLabel: string;
  codePlaceholder: string;
  cancel: string;
  errorFallback: string;
}

export interface BackupCodesPanelLabels {
  title: string;
  description: string;
  download: string;
  print: string;
  done: string;
  copyError: string;
  printBlocked: string;
  printNote: string;
  exportTitle: (issuer: string) => string;
  exportAccount: (accountLabel: string) => string;
  exportGenerated: (date: string) => string;
  exportInstructions: string;
  fileName: (issuer: string) => string;
}

export interface BackupCodesPanelProps {
  codes: string[];
  issuer?: string;
  accountLabel?: string;
  doneLabel?: string;
  onDone?: () => void;
  className?: string;
  labels?: Partial<BackupCodesPanelLabels>;
}

export interface SecurityMethodRowProps {
  icon: IconSvgElement;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export interface SecurityLoadErrorProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export interface StepTransitionProps {
  stepKey: string;
  children: ReactNode;
  className?: string;
}

export interface BackupCodesRowProps {
  remaining: number | null;
  accountLabel?: string;
  labels: TwoFactorSettingsLabels;
  onRegenerate: (confirmationCode: string) => Promise<BackupCodesOutcome>;
}

export interface FactorListProps {
  factors: TotpFactorSummary[];
  removingFactorId: string | null;
  labels: TwoFactorSettingsLabels;
  locale?: string;
  onRemoveFactor: (
    factorId: string,
    confirmationCode: string
  ) => Promise<SecurityActionOutcome>;
}

export interface TwoFactorSettingsProps {
  factors: TotpFactorSummary[];
  status: SecurityLoadStatus;
  enrollment: TotpEnrollmentSecrets | null;
  isStartingEnrollment: boolean;
  removingFactorId: string | null;
  backupCodesRemaining: number | null;
  accountLabel?: string;
  onStartEnrollment: () => void;
  onVerifyEnrollment: (
    submission: TotpEnrollmentSubmission
  ) => Promise<TotpVerifyResult>;
  onCancelEnrollment: () => void;
  onEnrollmentDone: () => void;
  onRemoveFactor: (
    factorId: string,
    confirmationCode: string
  ) => Promise<SecurityActionOutcome>;
  onRegenerateBackupCodes: (
    confirmationCode: string
  ) => Promise<BackupCodesOutcome>;
  onRetry?: () => void;
  labels?: Partial<TwoFactorSettingsLabels>;
  locale?: string;
}

export interface TwoFactorSettingsLabels {
  loadError: string;
  retry: string;
  title: string;
  enabled: string;
  enabledDescription: string;
  disabledDescription: string;
  setUp: string;
  dialogTitle: string;
  dialogDescription: string;
  defaultFactorName: string;
  addedOn: (date: string) => string;
  remove: string;
  removeTitle: string;
  removeDescription: (factorName: string) => string;
  removeConfirm: string;
  backupCodesTitle: string;
  backupCodesDescription: string;
  backupCodesRemaining: (count: number) => string;
  backupCodesExhausted: string;
  regenerate: string;
  regenerateTitle: string;
  regenerateDescription: string;
  regenerateConfirm: string;
  enrollmentPanel: Partial<TotpEnrollmentPanelLabels>;
  backupCodesPanel: Partial<BackupCodesPanelLabels>;
  secondFactorConfirm: Partial<SecondFactorConfirmLabels>;
}
