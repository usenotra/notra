import { deleteSitemapSchema } from "@notra/schemas/dashboard/sitemap";

import { withOrganizationAuth } from "@/lib/auth/organization";
import { deleteStoredSitemap } from "@/lib/sitemap/storage";

interface RouteContext {
  params: Promise<{
    organizationId: string;
    voiceId: string;
    sitemapId: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { organizationId, voiceId, sitemapId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const parseResult = deleteSitemapSchema.safeParse({
    organizationId,
    voiceId,
    sitemapId,
  });

  if (!parseResult.success) {
    return Response.json(
      { error: "Invalid sitemap", details: parseResult.error.issues },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteStoredSitemap({
      organizationId,
      sitemapId,
      voiceId,
    });

    if (!deleted) {
      return Response.json({ error: "Sitemap not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Sitemap storage is unavailable" },
      { status: 503 }
    );
  }
}
