import { db } from "@notra/db/drizzle";
import { organizations, sites } from "@notra/db/schema";
import { eq } from "drizzle-orm";

import { deleteSite } from "./sites";

export async function deleteOrganizationSites(
  organizationId: string,
  tx: Pick<typeof db, "select" | "delete">
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
  for (const site of hostedSites) {
    await deleteSite(site, tx);
  }
}
