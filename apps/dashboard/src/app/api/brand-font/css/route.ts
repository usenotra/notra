import { getServerSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { session, user } = await getServerSession({
    headers: request.headers,
  });
  if (!(session && user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const family = new URL(request.url).searchParams.get("family")?.trim();
  if (!family || family.length > 100 || !/^[\p{L}\p{N} ._-]+$/u.test(family)) {
    return new Response("Invalid font family", { status: 400 });
  }

  const url = new URL("https://fonts.googleapis.com/css2");
  url.searchParams.set("family", family);
  url.searchParams.set("display", "swap");

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NotraFontPreview/1.0)",
      },
      redirect: "error",
    });
    if (
      !upstream.ok ||
      Number(upstream.headers.get("content-length")) > 100_000
    ) {
      return new Response("Font unavailable", { status: 502 });
    }

    const css = await upstream.text();
    if (css.length > 100_000) {
      return new Response("Font unavailable", { status: 502 });
    }

    const localCss = css.replace(
      /https:\/\/fonts\.gstatic\.com(\/s\/[\w/-]+\.(?:woff2?|ttf))/g,
      (_, path: string) =>
        `/api/brand-font/file?path=${encodeURIComponent(path)}`
    );
    if (/https?:\/\//.test(localCss)) {
      return new Response("Unsupported font stylesheet", { status: 502 });
    }

    return new Response(localCss, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Font unavailable", { status: 502 });
  }
}
