import { getSite } from "@notra/sites-server/deployments";
import { previewAccessUrl } from "@notra/sites-server/preview-access";
import type { NextRequest } from "next/server";

import { assertOrganizationAccess } from "@/lib/auth/organization";

const PREVIEW_KEY = /^(?:pr|br)-[a-z0-9-]{1,40}$/;

/**
 * Protected previews send signed-out visitors here. The proxy already forced a
 * login; membership in the site's organization decides access, then the
 * visitor is bounced back to the preview with a short-lived signed token.
 */
export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("site") ?? "";
  const previewKey = request.nextUrl.searchParams.get("preview") ?? "";
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  if (!(siteId.startsWith("site_") && PREVIEW_KEY.test(previewKey))) {
    return new Response("Invalid preview link", { status: 400 });
  }
  const site = await getSite(siteId);
  if (!site) {
    return new Response("Preview not found", { status: 404 });
  }
  try {
    await assertOrganizationAccess({
      headers: request.headers,
      organizationId: site.organizationId,
    });
  } catch {
    return new Response(
      "You don't have access to this preview. Ask for a share link.",
      { status: 403 }
    );
  }
  const { url } = await previewAccessUrl({
    site,
    previewKey,
    next,
    kind: "member",
  });
  return Response.redirect(url, 302);
}
