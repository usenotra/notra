import type { SiteIntegrationUpdate } from "@notra/sites-core/types/site-integrations";

export interface SiteIntegrationsState {
  integrations: Record<string, unknown>;
  hasDraft: boolean;
  invalid: boolean;
}

export type SaveSiteIntegrationsInput = SiteIntegrationUpdate & {
  userId: string;
};
