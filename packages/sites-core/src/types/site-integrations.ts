import type {
  siteIntegrationUpdateSchema,
  siteIntegrationsSchema,
  siteSecuritySchema,
} from "@notra/sites-core/schemas/site-integrations";
import type { z } from "zod";

export type SiteIntegrations = z.infer<typeof siteIntegrationsSchema>;
export type SiteIntegrationName = keyof SiteIntegrations;
export type SiteIntegrationUpdate = z.infer<typeof siteIntegrationUpdateSchema>;
type SiteSecurity = z.infer<typeof siteSecuritySchema>;

export type SiteHeadScript =
  | { kind: "external"; src: string; attributes: Record<string, string | true> }
  | { kind: "inline"; code: string };

export interface SiteCspSources {
  scriptSrc: string[];
  connectSrc: string[];
}

export interface SiteContentSecurityPolicyParams {
  integrations: SiteIntegrations;
  security: SiteSecurity;
  scriptHashes: Iterable<string>;
}
