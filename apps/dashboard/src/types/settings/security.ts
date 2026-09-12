import type {
  PasskeySummary,
  SecurityLoadStatus,
  TotpFactorSummary,
} from "@notra/ui/lib/security-types";

export interface TwoFactorSectionProps {
  accountLabel: string;
  factors: TotpFactorSummary[];
  backupCodesRemaining: number | null;
  status: SecurityLoadStatus;
  onRefresh: () => Promise<unknown> | void;
}

export interface PasskeysSectionProps {
  email: string;
  passkeys: PasskeySummary[];
  passkeysAvailable: boolean;
  status: SecurityLoadStatus;
  onRefresh: () => Promise<unknown> | void;
}

export interface SecurityStepUpDialogProps {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

/**
 * An enrollment that is on screen. `scanning` factors are still unverified
 * and get deleted when the user walks away; `verified` ones only linger to
 * show the backup codes.
 */
export interface ActiveTotpEnrollment {
  kind: "scanning" | "verified";
  factorId: string;
  authenticationChallengeId: string;
  qrCode: string;
  secret: string;
  otpauthUri: string;
}

export interface PendingStepUp {
  resume: () => void;
}
