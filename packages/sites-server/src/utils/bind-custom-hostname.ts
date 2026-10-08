import { createDb } from "@notra/db/drizzle";
import { siteDomains } from "@notra/db/schema";
import type { Database } from "@notra/db/types/database";
import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";
import { and, eq, isNull, ne } from "drizzle-orm";

import { deleteCustomHostname } from "../cloudflare-saas";
import {
  SiteHostConflictError,
  SiteInputError,
  SitesNotConfiguredError,
} from "../errors";
import type {
  CloudflareCustomHostname,
  CloudflareSaasConfig,
} from "../types/cloudflare-saas";
import type { SiteDomain } from "../types/domains";

let database: Database | undefined;

export function customHostnameBindingDatabase(): Database {
  if (database) {
    return database;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new SitesNotConfiguredError("DATABASE_URL is not set");
  }
  const url = new URL(connectionString);
  url.searchParams.set("application_name", "notra-sites-domain-binding");
  database = createDb(url.toString(), 1);
  return database;
}

export async function bindCreatedCustomHostname(
  domain: SiteDomain,
  created: CloudflareCustomHostname,
  replacedHostnameId: string | null,
  config: CloudflareSaasConfig,
  records: () => SiteDomainVerificationRecord[]
): Promise<SiteDomain> {
  const executor = customHostnameBindingDatabase();
  let prepared = false;
  try {
    const verificationRecords = records();
    return await executor.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: siteDomains.id })
        .from(siteDomains)
        .where(
          and(
            eq(siteDomains.cloudflareHostnameId, created.id),
            ne(siteDomains.id, domain.id)
          )
        )
        .limit(1);
      if (existing) {
        throw new SiteHostConflictError(
          "Provider identity belongs to another claim"
        );
      }
      const [bound] = await tx
        .update(siteDomains)
        .set({ cloudflareHostnameId: created.id, verificationRecords })
        .where(
          and(
            eq(siteDomains.id, domain.id),
            eq(siteDomains.siteId, domain.siteId),
            eq(siteDomains.organizationId, domain.organizationId),
            eq(siteDomains.hostname, domain.hostname),
            domain.cloudflareHostnameId === null
              ? isNull(siteDomains.cloudflareHostnameId)
              : eq(
                  siteDomains.cloudflareHostnameId,
                  domain.cloudflareHostnameId
                )
          )
        )
        .returning();
      if (!bound) {
        throw new SiteInputError(
          "Domain changed during verification. Retry verification."
        );
      }
      if (replacedHostnameId) {
        await tx
          .update(siteDomains)
          .set({
            cloudflareHostnameId: null,
            lastError:
              "Another site proved ownership of this domain. Add it again to retry.",
          })
          .where(
            and(
              eq(siteDomains.hostname, domain.hostname),
              eq(siteDomains.cloudflareHostnameId, replacedHostnameId),
              ne(siteDomains.id, domain.id),
              ne(siteDomains.status, "active")
            )
          );
      }
      prepared = true;
      return bound;
    });
  } catch (error) {
    const references = await executor
      .select({ id: siteDomains.id })
      .from(siteDomains)
      .where(eq(siteDomains.cloudflareHostnameId, created.id))
      .limit(1)
      .catch(() => null);
    if (!prepared && references?.length === 0) {
      await deleteCustomHostname(config, created.id).catch(() => undefined);
    }
    throw error;
  }
}
