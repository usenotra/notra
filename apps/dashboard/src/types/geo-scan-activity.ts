import type { GeoModelCatalogEntry } from "@notra/geo-core/types/geo";
import type {
  GeoScanResultSummary,
  GeoScanRunSummary,
} from "@notra/geo-core/types/geo-scan-history";
import type { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type { useGeoScanRun } from "@/lib/hooks/use-geo-scan-history";
import type { GeoEngineAnswerMode } from "@/types/geo-shared";

export interface GeoScanActivityStatusProps {
  run: GeoScanRunSummary | undefined;
}

export interface GeoScanRequest {
  engines: string[];
  prompt?: { id: string; prompt: string };
}

export interface GeoScanControls {
  prepare: (request: GeoScanRequest) => void;
}

export interface GeoScanControlsProviderProps {
  organizationId: string;
  promptCount?: number;
  children: ReactNode;
}

export interface GeoScanModelOption {
  id: string;
  label: string;
  answerMode: GeoEngineAnswerMode | null;
  tracked: boolean;
  zdrBlocked: boolean;
}

export interface GeoScanModelMenuProps {
  disabledReason?: string;
  /** Tracked models, preselected every time the menu opens. */
  engines: readonly string[];
  /** Full catalog the organization can scan; falls back to `engines`. */
  catalog?: readonly GeoModelCatalogEntry[];
  enforceZdr?: boolean;
  nonZdrApprovedEngines?: readonly string[];
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  primary?: boolean;
  onContinue: (engines: string[]) => void;
}

export interface GeoScanRunDetailProps {
  organizationId: string;
}

export interface GeoScanRunDetailState {
  /** Scan the pages and filters below belong to. */
  runId: string | null;
  view: GeoScanRunView;
  offset: number;
  pendingOffset: number;
  engine: string;
}

export interface GeoScanViewCountProps {
  count: number;
  locale: string;
}

export type GeoScanRunView = "answers" | "pending";

export type GeoScanPendingAnswer = NonNullable<
  ReturnType<typeof useGeoScanRun>["data"]
>["pending"][number];

export interface GeoScanRunFiltersProps {
  view: GeoScanRunView;
  onViewChange: (view: GeoScanRunView) => void;
  answerCount: number;
  pendingCount: number;
  running: boolean;
  engine: string;
  engines: readonly string[];
  onEngineChange: (engine: string) => void;
}

export interface GeoScanAnswerProps {
  scanId: string;
  initialLanguage?: string;
  organizationId: string;
  checkId: string | null;
  onClose: () => void;
}

export interface GeoScanModelCellProps {
  engine: string;
}

export interface GeoScanPromptCellProps {
  prompt: string;
  turn: number | null;
}

export interface GeoScanTablePaginationProps {
  offset: number;
  total: number;
  itemLabel: string;
  onOffsetChange: (offset: number) => void;
}

export interface GeoScanRunEmptyStateInput {
  running: boolean;
  isError: boolean;
  hasData: boolean;
  loading: boolean;
  onRetry: () => void;
}

export interface GeoScanRunPendingTableProps {
  pending: GeoScanPendingAnswer[];
  showLanguage: boolean;
  emptyState: ReactNode;
  running: boolean;
  offset: number;
  onOffsetChange: (offset: number) => void;
  total: number;
  height: number;
  loading: boolean;
}

export interface GeoScanRunAnswersTableProps {
  results: GeoScanResultSummary[];
  showLanguage: boolean;
  emptyState: ReactNode;
  offset: number;
  onOffsetChange: (offset: number) => void;
  total: number;
  height: number;
  loading: boolean;
  onRowClick: (row: GeoScanResultSummary) => void;
}

export interface ScanRunDetailViewInput {
  run: GeoScanRunSummary;
  view: GeoScanRunView;
  data: ReturnType<typeof useGeoScanRun>["data"];
  isPending: boolean;
  isPlaceholderData: boolean;
  pendingOffset: number;
}

export interface ScanRunDetailView {
  running: boolean;
  pendingTotal: number;
  pending: GeoScanPendingAnswer[];
  results: GeoScanResultSummary[];
  activeView: GeoScanRunView;
  showLanguage: boolean;
  loading: boolean;
  hasFilters: boolean;
  engines: readonly string[];
  height: number;
  pendingOffset: number;
  total: number;
  answerCount: number;
}

export type ScanActivityStatusTranslator = ReturnType<
  typeof useTranslations<"geo.scanActivityStatus">
>;

export type ScanRunDetailTranslator = ReturnType<
  typeof useTranslations<"geo.scanRunDetail">
>;

export type ScanActivityRelativeFormatter = ReturnType<
  typeof useFormatRelative
>;
