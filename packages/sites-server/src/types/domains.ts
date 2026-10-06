import type { siteDomains } from "@notra/db/schema";
import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";

export type SiteDomain = typeof siteDomains.$inferSelect;

export interface AddSiteDomainInput {
  kind: SiteDomain["kind"];
  value: string;
}

export interface DomainCheck {
  verified: boolean;
  lastError: string | null;
  records: SiteDomainVerificationRecord[];
}

export interface RefreshSiteDomainResult {
  domain: SiteDomain;
  rebuildJobId: string | null;
}
