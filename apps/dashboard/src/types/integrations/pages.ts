import type { GeoSearchConsoleStatus } from "@notra/geo-core/types/google-search-console";

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
