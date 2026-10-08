import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";
import type { Schema } from "effect";

import type { VercelTokenResponse as VercelTokenResponseSchema } from "../schemas/vercel-dns";

export interface VercelDnsConfig {
  slug: string;
  clientId: string;
  clientSecret: string;
}

export interface VercelDnsDeps {
  resolveNs: (name: string, signal?: AbortSignal) => Promise<string[]>;
  fetch: typeof fetch;
}

export interface VercelDnsGrant {
  accessToken: string;
  teamId: string | null;
  configurationId: string;
}

export interface ApplyVercelDnsRecordsParams {
  grant: VercelDnsGrant;
  zone: string;
  records: SiteDomainVerificationRecord[];
  deps?: Pick<VercelDnsDeps, "fetch">;
}

export type VercelTokenResponse = Schema.Schema.Type<
  typeof VercelTokenResponseSchema
>;
