import { deleteSitemapSchema } from "@notra/schemas/dashboard/sitemap";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withOrganizationAuth } from "@/lib/auth/organization";
import { deleteStoredSitemap } from "@/lib/sitemap/storage";

interface RouteContext {
  params: Promise<{
    organizationId: string;
    voiceId: string;
    sitemapId: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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
    return NextResponse.json(
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
      return NextResponse.json({ error: "Sitemap not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Sitemap storage is unavailable" },
      { status: 503 }
    );
  }
}
