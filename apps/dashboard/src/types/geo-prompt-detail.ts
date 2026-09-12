import type {
  GeoCompetitor,
  GeoPromptHistoryCheck,
  GeoPromptResultSummary,
  GeoPromptReceiptView,
  GeoPromptResult,
} from "@notra/geo-core/types/geo";

import type { GeoPromptDetailSurface } from "@/types/analytics/geo-events";
import type { GeoPromptTableRow, PromptAnswerPageProps } from "@/types/geo";

export type PromptAnswerSelectionInput = Pick<
  PromptAnswerPageProps,
  | "row"
  | "organizationId"
  | "open"
  | "scanId"
  | "initialLanguage"
  | "initialEngine"
>;

export interface PromptCopyButtonProps {
  prompt: string;
}

export type GeoPromptDetailState =
  | { status: "ready"; result: GeoPromptResult }
  | { status: "loading" | "error" | "missing" };

export interface GeoPromptDetailStatusProps {
  status: "loading" | "error" | "missing";
  onRetry: () => void;
}

export interface GeoPromptAnswerSkeletonProps {
  view: GeoPromptReceiptView;
}

export interface PromptAnswerBodyProps {
  organizationId: string;
  detailState: GeoPromptDetailState;
  view: GeoPromptReceiptView;
  prompt: string;
  scanPromptId: string;
  /** Scan whose captured answer replaces the latest one, when picked. */
  selectedCheck: GeoPromptHistoryCheck | null;
  history: GeoPromptHistoryCheck[];
  isHistoryLoading: boolean;
  competitors?: readonly GeoCompetitor[];
  onRetry: () => void;
  onSelectCheck: (check: GeoPromptHistoryCheck) => void;
  onBackToLatest: () => void;
}

export interface PromptAnswerLanguageBarProps {
  languages: readonly string[];
  selectedLanguage?: string;
  onSelect: (language: string) => void;
}

export interface PromptAnswerTagsFooterProps {
  tagsInputId: string;
  row: GeoPromptTableRow;
  tags: string[];
  pending: boolean;
  onChange: (nextTags: string[]) => void;
}

export interface PromptAnswerEmptyProps {
  isScanning: boolean;
  detailState: GeoPromptDetailState;
  view: GeoPromptReceiptView;
  onRetry: () => void;
}

export interface PromptAnswerHeaderProps {
  promptText?: string;
  onPrepareScan?: () => void;
  organizationId: string;
  row: GeoPromptTableRow;
  results: readonly GeoPromptResultSummary[];
  active: GeoPromptResultSummary | null;
  view: GeoPromptReceiptView;
  onSelectEngine: (engine: string, direction: number) => void;
  onSelectView: (view: GeoPromptReceiptView) => void;
}

export interface PromptDetailOpenedEventProps {
  open: boolean;
  surface?: GeoPromptDetailSurface;
  engine: string | null;
  engineCount: number;
  promptId: string;
}
