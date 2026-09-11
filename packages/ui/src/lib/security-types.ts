import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import type { TotpVerifyResult } from "./auth-types";

export type SecurityLoadStatus = "loading" | "ready" | "error";

export type SecurityActionOutcome = { ok: true } | { ok: false; message: string };

export type BackupCodesOutcome =
  | { ok: true; codes: string[] }
  | { ok: false; message: string };

export interface BackupCodesPanelProps {
  codes: string[];
  issuer?: string;
  accountLabel?: string;
  doneLabel?: string;
  onDone?: () => void;
  className?: string;
}

export interface TotpFactorSummary {
  id: string;
  issuer: string | null;
  createdAt: string;
}

export interface TotpEnrollmentSecrets {
  qrCode: string;
  secret: string;
  otpauthUri?: string;
}

export interface PasskeySummary {
  id: string;
  name?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
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
  onRetry?: () => void;
}

export interface TwoFactorSettingsProps {
  factors: TotpFactorSummary[];
  status: SecurityLoadStatus;
  enrollment: TotpEnrollmentSecrets | null;
  isStartingEnrollment?: boolean;
  removingFactorId?: string | null;
  accountLabel?: string;
  onStartEnrollment: () => void;
  onVerifyEnrollment: (code: string) => Promise<TotpVerifyResult>;
  onCancelEnrollment: () => void;
  onEnrollmentDone?: () => void;
  onRemoveFactor: (factorId: string) => void;
  onRetry?: () => void;
  backupCodesRemaining?: number | null;
  onRegenerateBackupCodes?: () => Promise<BackupCodesOutcome>;
}

export interface PasskeysSettingsProps {
  passkeys: PasskeySummary[];
  status: SecurityLoadStatus;
  isSupported: boolean;
  isAdding?: boolean;
  removingPasskeyId?: string | null;
  unavailableMessage?: string | null;
  onAddPasskey: () => void;
  onRemovePasskey: (passkeyId: string) => void;
  onRetry?: () => void;
}

export interface StepUpVerificationProps {
  email: string;
  onSendCode: () => Promise<SecurityActionOutcome>;
  onVerify: (code: string) => Promise<SecurityActionOutcome>;
  onCancel?: () => void;
}
