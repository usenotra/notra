import type { GeoSuggestionKeyword } from "@notra/geo-core/types/geo";
import type {
  GeoCsvParseResult,
  GeoImportKind,
} from "@notra/geo-core/types/geo-import";
import type { GeoSearchConsoleStatus } from "@notra/geo-core/types/google-search-console";
import type { ReactNode } from "react";

import type { GeoPromptSuggestion } from "@/types/geo";

export interface PromptSuggestionsProps {
  organizationId: string;
  callbackPath: string;
  /** Opens the prompts tab, focused on one prompt when an id is given. */
  onViewTrackedPrompt: (promptId?: string) => void;
}

export interface SuggestionRowActionsProps {
  accepting: boolean;
  disabled: boolean;
  dismissing: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  suggestion: GeoPromptSuggestion;
}

export interface SuggestionColumnsOptions {
  acceptingSuggestionIds: ReadonlySet<string>;
  dismissingSuggestionIds: ReadonlySet<string>;
  /** Blocks every row while a scan or "Track all" is running. */
  disabled: boolean;
  onAccept: (suggestionId: string) => void;
  onDismiss: (suggestion: GeoPromptSuggestion) => void;
  onOpen: (suggestion: GeoPromptSuggestion) => void;
  locale: string;
  labels: {
    prompt: string;
    impressions: string;
    clicks: string;
    position: string;
    openDetails: (prompt: string) => string;
  };
}

export interface SearchConsoleToolbarProps {
  action?: ReactNode;
  organizationId: string;
  callbackPath: string;
  isPending: boolean;
  onPropertyPickerOpenChange: (open: boolean) => void;
  propertyPickerOpen: boolean;
  status: GeoSearchConsoleStatus | undefined;
}

export interface SearchConsoleSetupStateProps {
  organizationId: string;
  callbackPath: string;
  status: GeoSearchConsoleStatus;
  websiteUrl: string | null;
}

export interface SearchConsoleReconnectButtonProps {
  organizationId: string;
  callbackPath: string;
  label: string;
  variant?: "default" | "outline";
}

export interface SearchConsolePropertyPickerProps {
  organizationId: string;
  sites: GeoSearchConsoleStatus["sites"];
  websiteUrl: string | null;
  onSelected?: () => void;
}

export interface SearchConsoleConnectedStateProps {
  action?: ReactNode;
  organizationId: string;
  callbackPath: string;
  onPropertyPickerOpenChange: (open: boolean) => void;
  propertyPickerOpen: boolean;
  status: GeoSearchConsoleStatus;
  websiteUrl: string | null;
}

export interface TrackAllButtonProps {
  pending: boolean;
  onClick: () => void;
}

export interface SuggestionDetailActionsProps {
  accepting: boolean;
  disabled: boolean;
  dismissing: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export interface DismissSuggestionDialogProps {
  suggestion: GeoPromptSuggestion | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (suggestionId: string) => void;
}

export interface PromptSuggestionSheetProps {
  suggestion: GeoPromptSuggestion | null;
  actions?: ReactNode;
  onOpenChange: (open: boolean) => void;
}

export interface SuggestionQueryTableProps {
  queries: readonly GeoSuggestionKeyword[];
}

export interface SuggestionKeywordTotals {
  impressions: number;
  clicks: number;
  position: number | null;
  ctr: number | null;
}

export interface GeoUpgradeGateProps {
  slug: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export interface GeoPageGateProps {
  children: ReactNode;
  fallback: ReactNode;
}

export interface GeoUpgradeDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  entry?: "geo" | "sidebar" | "studio";
}

export interface GeoCsvImportDialogProps<TRow> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: GeoImportKind;
  parse: (text: string) => GeoCsvParseResult<TRow>;
  onImport: (rows: TRow[]) => Promise<unknown>;
  isPending: boolean;
  /** Splits rows into new, updated and over-limit before importing. */
  capacity?: GeoCsvImportCapacity<TRow>;
}

export interface GeoCsvImportCapacity<TRow> {
  /** False until the tracked list has loaded; the split is unknown before. */
  isReady: boolean;
  limit: number;
  existingKeys: ReadonlySet<string>;
  keyOf: (row: TRow) => string;
}

export interface GeoCsvImportPlan<TRow> {
  rows: TRow[];
  added: number;
  updated: number;
  overLimit: number;
}

export interface CompetitorChoicesSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export interface CompetitorChoicesFooterProps {
  query: string;
  hidden: number;
  visibleCount: number;
}

export interface GeoImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}
