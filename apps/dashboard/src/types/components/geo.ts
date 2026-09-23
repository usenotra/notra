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
}

export interface SearchConsoleToolbarProps {
  action?: ReactNode;
  organizationId: string;
  callbackPath: string;
  isPending: boolean;
  onDismiss?: () => void;
  onPropertyPickerOpenChange: (open: boolean) => void;
  propertyPickerOpen: boolean;
  status: GeoSearchConsoleStatus | undefined;
}

export interface SearchConsoleHeaderRowProps {
  action?: ReactNode;
  titleId: string;
  onDismiss?: () => void;
}

export interface SearchConsoleConnectActionProps {
  organizationId: string;
  callbackPath: string;
  configured: boolean;
  reauth: boolean;
}

export interface SearchConsoleSelectSiteStateProps {
  organizationId: string;
  callbackPath: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  status: GeoSearchConsoleStatus;
  websiteUrl: string | null;
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

export interface PromptSuggestionsToolbarProps {
  checking: boolean;
  showSearchConsole: boolean;
  trackAllPending: boolean;
  suggestionsCount: number;
  callbackPath: string;
  isSearchConsolePending: boolean;
  connectPromo: boolean;
  onDismissCard: () => void;
  onPropertyPickerOpenChange: (open: boolean) => void;
  organizationId: string;
  propertyPickerOpen: boolean;
  status: GeoSearchConsoleStatus | undefined;
  onTrackAll: () => void;
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
}

export interface GeoUpgradeDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface GeoCsvImportDialogProps<TRow> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: GeoImportKind;
  parse: (text: string) => GeoCsvParseResult<TRow>;
  onImport: (rows: TRow[]) => Promise<unknown>;
  isPending: boolean;
}

export interface GeoImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}
