import type { IconSvgElement } from "@hugeicons/react";
import type {
  TotpEnrollmentSecrets,
  TotpFactorSummary,
} from "@notra/schemas/types/dashboard/auth";
import type { ReactNode } from "react";

import type { TotpEnrollmentSubmission, TotpVerifyResult } from "./auth";

export type SecurityLoadStatus = "loading" | "ready" | "error";

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

export interface StepTransitionProps {
  stepKey: string;
  children: ReactNode;
  className?: string;
}

export interface BackupCodesRowProps {
  remaining: number | null;
  accountLabel?: string;
  onRegenerate: () => Promise<BackupCodesOutcome>;
}

export interface FactorListProps {
  factors: TotpFactorSummary[];
  removingFactorId: string | null;
  onRemoveFactor: (factorId: string) => void;
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
  onRemoveFactor: (factorId: string) => void;
  onRegenerateBackupCodes: () => Promise<BackupCodesOutcome>;
  onRetry?: () => void;
}
