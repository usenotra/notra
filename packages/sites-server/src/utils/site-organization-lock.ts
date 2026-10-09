import { organizations, sites } from "@notra/db/schema";
import { eq } from "drizzle-orm";

import type { SiteStorageTransaction } from "../types/deployments";

export async function lockSiteOrganization(
  tx: SiteStorageTransaction,
  siteId: string
): Promise<string | null> {
  const [site] = await tx
    .select({ organizationId: sites.organizationId })
    .from(sites)
    .where(eq(sites.id, siteId));
  if (!site) {
    return null;
  }
  const [organization] = await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, site.organizationId))
    .for("key share");
  return organization ? site.organizationId : null;
}
