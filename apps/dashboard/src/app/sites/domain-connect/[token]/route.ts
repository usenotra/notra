import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { getSite } from "@notra/sites-server/deployments";
import { verifyDomainConnectCallback } from "@notra/sites-server/domain-connect";
import { refreshSiteDomain } from "@notra/sites-server/domains";
import { eq } from "drizzle-orm";
import { after, type NextRequest } from "next/server";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { dispatchSiteJobs } from "@/lib/sites/dispatch";

/**
 * Domain Connect sends the browser back here after the customer approved (or
 * cancelled) the DNS change. The token lives in the path because Cloudflare
 * drops `state`. Errors arrive as OAuth-style `error` / `error_description`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const claims = verifyDomainConnectCallback((await params).token);
  if (!claims) {
    return new Response(
      "This DNS setup link expired. Start again from the Domains tab.",
      {
        status: 400,
      }
    );
  }
  const site = await getSite(claims.siteId);
  if (!site) {
    return new Response("Site not found", { status: 404 });
  }
  let userId: string;
  try {
    const access = await assertOrganizationAccess({
      headers: request.headers,
      organizationId: site.organizationId,
    });
    userId = access.user.id;
  } catch {
    return new Response("You don't have access to this site.", { status: 403 });
  }

  const error = request.nextUrl.searchParams.get("error");
  const description =
    request.nextUrl.searchParams.get("error_description") ?? "";
  let outcome: "success" | "cancelled" | "error" = "success";
  if (error) {
    outcome =
      error === "access_denied" && description.startsWith("user_cancel")
        ? "cancelled"
        : "error";
  } else {
    // DNS may still be propagating; the Domains tab shows the status either way.
    try {
      const { rebuildJobId } = await refreshSiteDomain(
        site,
        claims.domainId,
        userId
      );
      if (rebuildJobId) {
        after(() => dispatchSiteJobs([rebuildJobId]));
      }
    } catch (refreshError) {
      console.warn("sites.domain_connect_refresh_failed", {
        domainId: claims.domainId,
        error:
          refreshError instanceof Error ? refreshError.message : refreshError,
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
    request.nextUrl.origin
  );
  target.searchParams.set("domainConnect", outcome);
  return Response.redirect(target, 302);
}
