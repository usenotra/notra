import type { SiteStorageTransaction } from "./deployments";

export interface SiteHostLockOptions {
  organizationId?: string;
  tx?: SiteStorageTransaction;
}
