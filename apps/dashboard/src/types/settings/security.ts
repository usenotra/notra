import type { TotpFactorSummary } from "@notra/schemas/types/dashboard/auth";
import type { SecurityLoadStatus } from "@notra/ui/types/security";

export interface TwoFactorSectionProps {
  accountLabel: string;
  factors: TotpFactorSummary[];
  backupCodesRemaining: number | null;
  status: SecurityLoadStatus;
  onRefresh: () => Promise<unknown> | void;
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
