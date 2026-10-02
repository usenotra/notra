import { withOrganizationAuth } from "@/lib/auth/organization";
import { getSitemapBrandIdentity } from "@/lib/sitemap/brand-identity";
import { getStoredSitemapPages } from "@/lib/sitemap/storage";
import type { SitemapPageCategory } from "@/types/hooks/brand-sitemaps";

interface RouteContext {
  params: Promise<{
    organizationId: string;
    voiceId: string;
    sitemapId: string;
  }>;
}

const SITEMAP_PAGE_CATEGORIES = new Set<SitemapPageCategory>([
  "crawled",
  "failed",
  "queued",
  "redirect",
]);

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const limit = Number.parseInt(value, 10);
  return Number.isFinite(limit) ? limit : undefined;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { organizationId, voiceId, sitemapId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const brandIdentity = await getSitemapBrandIdentity(organizationId, voiceId);
  if (!brandIdentity) {
    return Response.json(
      { error: "Brand identity not found" },
      { status: 404 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const result = await getStoredSitemapPages(
      organizationId,
      voiceId,
      sitemapId,
      {
        category:
          category &&
          SITEMAP_PAGE_CATEGORIES.has(category as SitemapPageCategory)
            ? (category as SitemapPageCategory)
            : undefined,
        cursor: searchParams.get("cursor") ?? undefined,
        limit: parseLimit(searchParams.get("limit")),
        query: searchParams.get("q")?.trim() || undefined,
      }
    );

    if (!result) {
      return Response.json({ error: "Sitemap not found" }, { status: 404 });
    }

    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Sitemap storage is unavailable" },
      { status: 503 }
    );
  }
}
