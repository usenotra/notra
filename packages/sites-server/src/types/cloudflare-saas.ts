export interface CloudflareSaasConfig {
  zoneId: string;
  apiToken: string;
}

export interface CloudflareCustomHostname extends Schema.Schema.Type<
  typeof cloudflareCustomHostnameSchema
> {}
import type { Schema } from "effect";

import type { cloudflareCustomHostnameSchema } from "../schemas/cloudflare-saas";
