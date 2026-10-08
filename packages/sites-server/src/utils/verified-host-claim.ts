import { siteDomains } from "@notra/db/schema";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import { siteHostRecordSchema } from "@notra/sites-core/schemas/deployment";
import { and, eq } from "drizzle-orm";

import { JSON_CONTENT_TYPE } from "../constants/content-types";
import { R2_CONTROL_CACHE_CONTROL } from "../constants/r2";
import { SiteHostConflictError } from "../errors";
import { r2GetText, r2Put } from "../r2";
import type { SiteStorageTransaction } from "../types/deployments";
import type { SiteDomain, VerifiedHostClaim } from "../types/domains";

export async function readVerifiedHostClaim(
  domain: SiteDomain,
  tx: SiteStorageTransaction
): Promise<VerifiedHostClaim> {
  const key = SITE_R2_KEYS.host(domain.hostname);
  const current = await r2GetText(key);
  if (current) {
    const parsed = siteHostRecordSchema.safeParse(JSON.parse(current.text));
    if (!parsed.success || parsed.data.kind !== "custom" || !current.etag) {
      throw new SiteHostConflictError("This hostname has an unrelated mapping");
    }
    if (parsed.data.siteId === domain.siteId) {
      return { current, owner: null };
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
    return { current, owner };
  }
  return { current, owner: null };
}

export async function claimVerifiedHost(
  domain: SiteDomain,
  tx: SiteStorageTransaction
): Promise<void> {
  const { current, owner } = await readVerifiedHostClaim(domain, tx);
  if (current && !owner) {
    return;
  }
  if (owner) {
    await tx
      .update(siteDomains)
      .set({
        cloudflareHostnameId: null,
        lastError: "Another site verified this domain. Add it again to retry.",
      })
      .where(eq(siteDomains.id, owner.id));
  }
  await r2Put(
    SITE_R2_KEYS.host(domain.hostname),
    JSON.stringify({ version: 1, siteId: domain.siteId, kind: "custom" }),
    {
      contentType: JSON_CONTENT_TYPE,
      cacheControl: R2_CONTROL_CACHE_CONTROL,
      ...(current ? { ifMatch: current.etag } : { ifNoneMatch: "*" as const }),
    }
  );
}
