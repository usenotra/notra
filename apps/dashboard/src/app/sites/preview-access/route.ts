import { SITE_PREVIEW_AUTH_PATH } from "@notra/sites-core/constants/sites";
import { safePreviewNextPath } from "@notra/sites-core/utils/preview-path";
import { getSite } from "@notra/sites-server/deployments";
import { previewAccessUrl } from "@notra/sites-server/preview-access";
import { sitePreviewOrigin } from "@notra/sites-server/utils/urls";

import { SITE_PREVIEW_KEY_PATTERN } from "@/constants/sites";
import { assertOrganizationAccess } from "@/lib/auth/organization";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site") ?? "";
  const previewKey = searchParams.get("preview") ?? "";
  const next = safePreviewNextPath(searchParams.get("next"));
  if (
    !(siteId.startsWith("site_") && SITE_PREVIEW_KEY_PATTERN.test(previewKey))
  ) {
    return new Response("Invalid preview link", { status: 400 });
  }
  const site = await getSite(siteId);
  if (!site) {
    return new Response("Preview not found", { status: 404 });
  }
  let userId: string;
  try {
    const access = await assertOrganizationAccess({
      headers: request.headers,
      organizationId: site.organizationId,
    });
    userId = access.user.id;
  } catch {
    const denied = new URL(
      SITE_PREVIEW_AUTH_PATH,
      sitePreviewOrigin(site.slug, previewKey)
    );
    denied.searchParams.set("error", "forbidden");
    denied.searchParams.set("next", next);
    return Response.redirect(denied, 302);
  }
  const { url } = await previewAccessUrl({
    site,
    previewKey,
    next,
    kind: "member",
    userId,
  });
  return Response.redirect(url, 302);
}
