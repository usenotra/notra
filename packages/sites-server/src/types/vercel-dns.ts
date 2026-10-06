import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";

export interface VercelDnsConfig {
  slug: string;
  clientId: string;
  clientSecret: string;
}

export interface VercelDnsDeps {
  resolveNs: (name: string) => Promise<string[]>;
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

export interface VercelTokenResponse {
  access_token?: string;
  team_id?: string | null;
  installation_id?: string;
}
