import type {
  AgentReadinessIssue,
  AgentReadinessTierBreakdown,
} from "@notra/db/types/agent-readiness";
import type {
  AgentReadinessChangedCheck,
  AgentReadinessComparison,
  AgentReadinessIssueChange,
  AgentReadinessReportView,
  AgentReadinessResponse,
} from "@notra/geo-core/types/agent-readiness";

import type { AGENT_READINESS_CHANGE_ROW_ORDER } from "@/constants/agent-readiness";
import type { AgentReadinessFixCopyKind } from "@/types/analytics/geo-events";

export interface AgentReadinessScoreCardProps {
  report: AgentReadinessReportView;
  targetUrl: string;
  previousScore: number | null;
  isScanning: boolean;
  onRescan: () => void;
}

export interface AgentReadinessScanningNoticeProps {
  targetUrl: string;
}

export interface AgentReadinessChecklistProps {
  targetUrl: string;
  issues: AgentReadinessIssue[];
  comparison: AgentReadinessComparison | null;
}

export interface AgentReadinessChangesCardProps {
  comparison: AgentReadinessComparison | null;
}

export type AgentReadinessChangeKind =
  (typeof AGENT_READINESS_CHANGE_ROW_ORDER)[number];

export interface AgentReadinessChangeRow {
  check: AgentReadinessChangedCheck;
  kind: AgentReadinessChangeKind;
}

export interface AgentReadinessChangeCellProps {
  row: AgentReadinessChangeRow;
}

export interface AgentReadinessResultLabelProps {
  result: AgentReadinessIssue["result"] | null;
}

export interface AgentReadinessChangeBadgeProps {
  change: AgentReadinessIssueChange | undefined;
}

export interface AgentReadinessScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export interface AgentReadinessBodyProps {
  data: AgentReadinessResponse;
  isScanPending: boolean;
  onRequestScan: () => void;
}

export interface AgentReadinessCopyPromptButtonProps {
  prompt: string;
  label: string;
  copyKind: AgentReadinessFixCopyKind;
  checkId?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "xs";
}

export interface AgentReadinessResultBadgeProps {
  result: AgentReadinessIssue["result"];
}

export interface AgentReadinessIssueRowProps {
  issue: AgentReadinessIssue;
  change: AgentReadinessIssueChange | undefined;
  targetUrl: string;
}

export interface AgentReadinessSectionHeaderProps {
  label: string;
  hint: string;
  count: number;
}

export interface AgentReadinessScoreDeltaProps {
  score: number;
  previousScore: number | null;
}

export interface AgentReadinessTierRowProps {
  label: string;
  tier: AgentReadinessTierBreakdown;
}

export interface AgentReadinessNextStepProps {
  issues: AgentReadinessIssue[];
  targetUrl: string;
  /** Null when the report has no score breakdown. */
  mustDoOpenPoints: number | null;
}

export interface AgentReadinessScoreGaugeProps {
  score: number;
  className?: string;
}
