import { db } from "@notra/db/drizzle";
import { siteDomains } from "@notra/db/schema";
import {
  applyVercelDnsRecords,
  exchangeVercelCode,
  findVercelZone,
  getVercelDnsConfig,
  removeVercelInstallation,
  verifyVercelDnsState,
} from "@notra/sites-server/vercel-dns";
import { and, eq } from "drizzle-orm";

import {
  finishDnsCallback,
  loadDnsCallbackSite,
} from "@/lib/sites/dns-callback";
import type { SiteDomainConnectOutcome } from "@/types/sites";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const claims = verifyVercelDnsState(searchParams.get("state") ?? "");
  if (!claims) {
    return new Response(
      "This DNS setup link expired. Start again from the Domains tab.",
      { status: 400 }
    );
  }
  const loaded = await loadDnsCallbackSite(request, claims.siteId);
  if (loaded instanceof Response) {
    return loaded;
  }
  const { site, userId } = loaded;

  const code = searchParams.get("code");
  const config = getVercelDnsConfig();
  let outcome: SiteDomainConnectOutcome = code ? "success" : "cancelled";
  if (code && config) {
    try {
      const [domain] = await db
        .select({
          hostname: siteDomains.hostname,
          records: siteDomains.verificationRecords,
        })
        .from(siteDomains)
        .where(
          and(
            eq(siteDomains.id, claims.domainId),
            eq(siteDomains.siteId, site.id)
          )
        )
        .limit(1);
      const zone = domain ? await findVercelZone(domain.hostname) : null;
      if (!(domain && zone)) {
        throw new Error("The domain is no longer on Vercel DNS");
      }
      const grant = await exchangeVercelCode(config, code);
      try {
        await applyVercelDnsRecords({ grant, zone, records: domain.records });
      } finally {
        await removeVercelInstallation(grant);
      }
    } catch (error) {
      outcome = "error";
      console.warn("sites.vercel_dns_failed", {
        domainId: claims.domainId,
        error: error instanceof Error ? error.message : error,
      });
    }
  } else if (code) {
    outcome = "error";
  }

  return finishDnsCallback({
    request,
    site,
    domainId: claims.domainId,
    userId,
    outcome,
  });
}
