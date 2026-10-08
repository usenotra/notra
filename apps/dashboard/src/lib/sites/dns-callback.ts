import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { getSite } from "@notra/sites-server/deployments";
import { refreshSiteDomain } from "@notra/sites-server/domains";
import { eq } from "drizzle-orm";

import { SITE_ADMIN_ROLES, SITE_DOMAIN_CONNECT_PARAM } from "@/constants/sites";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { afterResponse } from "@/lib/framework/after-response";
import { dispatchSiteJobs } from "@/lib/sites/dispatch";
import type { SiteAccess, FinishDnsCallbackParams } from "@/types/sites-server";

export async function loadDnsCallbackSite(
  request: Request,
  siteId: string
): Promise<SiteAccess | Response> {
  const site = await getSite(siteId);
  if (!site) {
    return new Response("Site not found", { status: 404 });
  }
  try {
    const access = await assertOrganizationAccess({
      headers: request.headers,
      organizationId: site.organizationId,
    });
    // Connecting DNS changes a domain, which the dashboard limits to admins.
    if (!SITE_ADMIN_ROLES.has(access.membership.role)) {
      return new Response("Only owners and admins can do this.", {
        status: 403,
      });
    }
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
}: FinishDnsCallbackParams): Promise<Response> {
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
