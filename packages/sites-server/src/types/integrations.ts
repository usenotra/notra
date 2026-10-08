import type { SITE_INTEGRATION_NAMES } from "@notra/sites-core/constants/integrations";

export type SiteIntegrationName = (typeof SITE_INTEGRATION_NAMES)[number];

export interface SiteIntegrationsState {
  integrations: Record<string, unknown>;
  hasDraft: boolean;
  invalid: boolean;
}

export interface SaveSiteIntegrationsInput {
  provider: SiteIntegrationName;
  settings: Record<string, unknown> | null;
  userId: string;
}
