import { organizations, siteDomains, sites } from "@notra/db/schema";
import { siteAliasHost } from "@notra/sites-core/utils/hosts";
import { eq, inArray } from "drizzle-orm";

import { getSitesHostingDomain } from "./env";
import { deleteSite } from "./sites";
import type { SiteStorageTransaction } from "./types/deployments";
import { acquireSiteHostLock } from "./utils/site-host-lock";

export async function deleteOrganizationSites(
  organizationId: string,
  tx: SiteStorageTransaction
): Promise<void> {
  await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .for("update");
  const hostedSites = await tx
    .select()
    .from(sites)
    .where(eq(sites.organizationId, organizationId));
  if (hostedSites.length === 0) {
    return;
  }
  const domains = await tx
    .select({ hostname: siteDomains.hostname })
    .from(siteDomains)
    .where(
      inArray(
        siteDomains.siteId,
        hostedSites.map((site) => site.id)
      )
    );
  const hostingDomain = getSitesHostingDomain();
  const hostnames = new Set([
    ...hostedSites.map((site) => siteAliasHost(site.slug, hostingDomain)),
    ...domains.map((domain) => domain.hostname),
  ]);
  for (const hostname of [...hostnames].sort()) {
    await acquireSiteHostLock(tx, hostname);
  }
  for (const site of hostedSites) {
    await deleteSite(site, tx);
  }
}
