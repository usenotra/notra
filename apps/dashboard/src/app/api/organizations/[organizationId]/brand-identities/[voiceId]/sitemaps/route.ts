import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { createSitemapSchema } from "@notra/schemas/dashboard/sitemap";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { getSitemapBrandIdentity } from "@/lib/sitemap/brand-identity";
import { getContextDevSitemap } from "@/lib/sitemap/context-dev";
import { readJsonRequest } from "@/lib/sitemap/request";
import { listStoredSitemaps, saveStoredSitemap } from "@/lib/sitemap/storage";

interface RouteContext {
  params: Promise<{ organizationId: string; voiceId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { organizationId, voiceId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const brandIdentity = await getSitemapBrandIdentity(organizationId, voiceId);
  if (!brandIdentity) {
    return NextResponse.json(
      { error: "Brand identity not found" },
      { status: 404 }
    );
  }

  try {
    const sitemaps = await listStoredSitemaps(organizationId, voiceId);
    return NextResponse.json({ sitemaps });
  } catch {
    return NextResponse.json(
      { error: "Sitemap storage is unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, voiceId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const json = await readJsonRequest(request);
  if (!json.ok) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parseResult = createSitemapSchema.safeParse({
    ...json.body,
    organizationId,
    voiceId,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.issues },
      { status: 400 }
    );
  }

  const brandIdentity = await getSitemapBrandIdentity(organizationId, voiceId);
  if (!brandIdentity) {
    return NextResponse.json(
      { error: "Brand identity not found" },
      { status: 404 }
    );
  }

  try {
    const result = await getContextDevSitemap({
      brandSettingsId: brandIdentity.id,
      label: parseResult.data.label,
      url: parseResult.data.url,
    });

    await saveStoredSitemap({
      organizationId,
      pages: result.pages,
      sitemap: result.sitemap,
      voiceId,
    });

    trackServerEvent({
      event: POSTHOG_EVENTS.GEO_SITEMAP_ADDED,
      headers: request.headers,
      organizationId,
      properties: {
        brand_identity_id: voiceId,
        page_count: result.pages.length,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to crawl sitemap" },
      { status: 502 }
    );
  }
}
