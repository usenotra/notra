import { siteDomains } from "@notra/db/schema";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import { siteHostRecordSchema } from "@notra/sites-core/schemas/deployment";
import { and, eq } from "drizzle-orm";

import { JSON_CONTENT_TYPE } from "../constants/content-types";
import { SiteHostConflictError } from "../errors";
import { r2GetText, r2Put } from "../r2";
import type { SiteStorageTransaction } from "../types/deployments";
import type { SiteDomain } from "../types/domains";

export async function claimVerifiedHost(
  domain: SiteDomain,
  tx: SiteStorageTransaction
): Promise<void> {
  const key = SITE_R2_KEYS.host(domain.hostname);
  const current = await r2GetText(key);
  if (current) {
    const parsed = siteHostRecordSchema.safeParse(JSON.parse(current.text));
    if (!parsed.success || parsed.data.kind !== "custom" || !current.etag) {
      throw new SiteHostConflictError("This hostname has an unrelated mapping");
    }
    if (parsed.data.siteId === domain.siteId) {
      return;
    }
    const [owner] = await tx
      .select()
      .from(siteDomains)
      .where(
        and(
          eq(siteDomains.hostname, domain.hostname),
          eq(siteDomains.siteId, parsed.data.siteId),
          eq(siteDomains.kind, "subdomain"),
          eq(siteDomains.status, "failed")
        )
      )
      .limit(1);
    if (!owner) {
      throw new SiteHostConflictError(
        "This hostname is not a failed custom-domain claim"
      );
    }
    await tx
      .update(siteDomains)
      .set({
        cloudflareHostnameId: null,
        lastError: "Another site verified this domain. Add it again to retry.",
      })
      .where(eq(siteDomains.id, owner.id));
  }
  await r2Put(
    key,
    JSON.stringify({ version: 1, siteId: domain.siteId, kind: "custom" }),
    {
      contentType: JSON_CONTENT_TYPE,
      cacheControl: "no-store",
      ...(current ? { ifMatch: current.etag } : { ifNoneMatch: "*" as const }),
    }
  );
}
