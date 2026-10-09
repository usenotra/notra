import { BRAND_FONT_FAMILY_RE } from "@/constants/brand-font";
import { getServerSession } from "@/lib/auth/session";
import { loadBrandFontStylesheet } from "@/utils/brand-font.server";

export async function GET(request: Request) {
  const { session, user } = await getServerSession({
    headers: request.headers,
  });
  if (!(session && user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const family = new URL(request.url).searchParams.get("family")?.trim();
  if (!family || family.length > 100 || !BRAND_FONT_FAMILY_RE.test(family)) {
    return new Response("Invalid font family", { status: 400 });
  }

  try {
    const localCss = await loadBrandFontStylesheet(family);
    return new Response(localCss, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Font unavailable", { status: 502 });
  }
}
