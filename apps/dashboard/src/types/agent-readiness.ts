import type { IconSvgElement } from "@hugeicons/react";
import type { AgentReadinessIssue } from "@notra/db/types/agent-readiness";
import type { CrawlabilityReport } from "@notra/db/types/crawlability";
import type {
  AgentReadinessIssueGroups,
  AgentReadinessReportView,
  AgentReadinessResponse,
} from "@notra/geo-core/types/agent-readiness";

import type { AgentReadinessFixCopyKind } from "@/types/analytics/geo-events";

export interface AgentReadinessScoreCardProps {
  report: AgentReadinessReportView;
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
}

export interface AgentReadinessScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export interface AgentReadinessPageProps {
  params: Promise<{ slug: string }>;
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

export interface AgentReadinessChecklistPromptActionsProps {
  targetUrl: string;
  groups: AgentReadinessIssueGroups;
}

export interface AgentReadinessIssueEntryProps {
  issue: AgentReadinessIssue;
  index: number;
  targetUrl: string;
}

export interface AgentReadinessSectionHeaderProps {
  icon: IconSvgElement;
  iconClassName: string;
  label: string;
  hint: string;
  count: number;
}

export interface AgentReadinessScoreDeltaProps {
  score: number;
  previousScore: number | null;
}

export interface AgentReadinessBreakdownTileProps {
  label: string;
  value: string;
  hint: string;
  passing?: number;
  total?: number;
}

export interface AgentReadinessScoreGaugeProps {
  score: number;
  className?: string;
}

export interface CrawlabilityReportCardProps {
  report: CrawlabilityReport | null;
}
