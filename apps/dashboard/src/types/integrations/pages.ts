import type { GscQueryRow } from "@notra/ai/types/google-search-console";
import type { GeoSearchConsoleStatus } from "@notra/geo-core/types/google-search-console";

import type { GeoPromptSuggestion } from "@/types/geo";

export interface SlackIntegrationsPageClientProps {
  organizationSlug: string;
}

export interface GoogleSearchConsolePageClientProps {
  organizationSlug: string;
}

export interface GoogleSearchConsoleIntegrationCardProps {
  callbackPath: string;
  onReconnect: () => void;
  organizationId: string;
  organizationSlug: string;
  status: GeoSearchConsoleStatus;
}

export interface GoogleSearchConsoleLastSyncPanelProps {
  busy: boolean;
  lastSyncedAt: string | null;
  onSync: () => void;
  organizationId: string;
  organizationSlug: string;
}

export interface GoogleSearchConsoleChangePropertyDialogProps {
  callbackPath: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: string;
}

export interface GoogleSearchConsoleConnectDialogProps {
  authorizeUrl: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  reauth?: boolean;
}

export interface GoogleSearchConsoleFactProps {
  label: string;
  value: string;
}

export interface GoogleSearchConsoleSyncButtonProps {
  busy: boolean;
  onSync: () => void;
}

export interface GoogleSearchConsoleQueryTableProps {
  queries: readonly GscQueryRow[];
}

export interface GoogleSearchConsoleAddedSuggestionsProps {
  isError: boolean;
  onRetry: () => void;
  organizationSlug: string;
  suggestions: readonly GeoPromptSuggestion[];
}

export interface GoogleSearchConsoleConnectionMenuProps {
  busy: boolean;
  hasProperty: boolean;
  label: string;
  needsReconnect: boolean;
  onChangeProperty: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}

export interface GoogleSearchConsolePageBodyProps {
  callbackPath: string;
  onConnect: () => void;
  onReconnect: () => void;
  onRetry: () => void;
  organizationId: string;
  organizationSlug: string;
  showError: boolean;
  showLoading: boolean;
  status: GeoSearchConsoleStatus | undefined;
}
