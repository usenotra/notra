import type { IconSvgElement } from "@hugeicons/react";

import type { ConnectedAccount } from "@/types/hooks/connected-accounts";

export interface ConnectedAccountsGroupProps {
  organizationId: string;
  label: string;
  icon: IconSvgElement;
  accounts: ConnectedAccount[];
  emptyLabel: string;
  connectLabel: string;
  onConnect: () => void;
  isConnecting: boolean;
}

export interface OrganizationDetails {
  id: string;
  logo?: string | null;
  name: string;
  slug: string;
}

export interface OrganizationDetailsCardProps {
  organization: OrganizationDetails;
  slug: string;
}

export interface DevSampleDataCardProps {
  organizationId: string;
}
