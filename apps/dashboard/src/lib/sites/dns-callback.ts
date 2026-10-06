import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { getSite } from "@notra/sites-server/deployments";
import { refreshSiteDomain } from "@notra/sites-server/domains";
import type { Site } from "@notra/sites-server/types/sites";
import { eq } from "drizzle-orm";

import { SITE_DOMAIN_CONNECT_PARAM } from "@/constants/sites";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { afterResponse } from "@/lib/framework/after-response";
import { dispatchSiteJobs } from "@/lib/sites/dispatch";
import type { SiteDomainConnectOutcome } from "@/types/sites";

export async function loadDnsCallbackSite(
  request: Request,
  siteId: string
): Promise<{ site: Site; userId: string } | Response> {
  const site = await getSite(siteId);
  if (!site) {
    return new Response("Site not found", { status: 404 });
  }
  try {
    const access = await assertOrganizationAccess({
      headers: request.headers,
      organizationId: site.organizationId,
    });
    return { site, userId: access.user.id };
  } catch {
    return new Response("You don't have access to this site.", { status: 403 });
  }
}

export async function finishDnsCallback({
  request,
  site,
  domainId,
  userId,
  outcome,
}: {
  request: Request;
  site: Site;
  domainId: string;
  userId: string;
  outcome: SiteDomainConnectOutcome;
}): Promise<Response> {
  if (outcome === "success") {
    try {
      const { rebuildJobId } = await refreshSiteDomain(site, domainId, userId);
      if (rebuildJobId) {
        afterResponse(() => dispatchSiteJobs([rebuildJobId]));
      }
    } catch (error) {
      console.warn("sites.dns_setup_refresh_failed", {
        domainId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  const [organization] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, site.organizationId))
    .limit(1);
  if (!organization) {
    return new Response("Organization not found", { status: 404 });
  }
  const target = new URL(
    `/${organization.slug}/sites/${site.id}/domains`,
    new URL(request.url).origin
  );
  target.searchParams.set(SITE_DOMAIN_CONNECT_PARAM, outcome);
  return Response.redirect(target, 302);
}
