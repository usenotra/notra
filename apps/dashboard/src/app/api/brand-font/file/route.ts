import { BRAND_FONT_FILE_PATH_RE } from "@/constants/brand-font";
import { getServerSession } from "@/lib/auth/session";
import { loadBrandFontFile } from "@/utils/brand-font.server";

export async function GET(request: Request) {
  const { session, user } = await getServerSession({
    headers: request.headers,
  });
  if (!(session && user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path || !BRAND_FONT_FILE_PATH_RE.test(path)) {
    return new Response("Invalid font path", { status: 400 });
  }

  try {
    const body = await loadBrandFontFile(path);
    return new Response(body, {
      headers: {
        "Content-Type": `font/${path.split(".").at(-1)}`,
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Font unavailable", { status: 502 });
  }
}
