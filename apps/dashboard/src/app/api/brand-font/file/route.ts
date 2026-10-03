import { getServerSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { session, user } = await getServerSession({
    headers: request.headers,
  });
  if (!(session && user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path || !/^\/s\/[\w/-]+\.(?:woff2?|ttf)$/.test(path)) {
    return new Response("Invalid font path", { status: 400 });
  }

  try {
    const upstream = await fetch(`https://fonts.gstatic.com${path}`, {
      redirect: "error",
    });
    if (
      !upstream.ok ||
      Number(upstream.headers.get("content-length")) > 1_000_000
    ) {
      return new Response("Font unavailable", { status: 502 });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > 1_000_000) {
      return new Response("Font unavailable", { status: 502 });
    }

    return new Response(body, {
      headers: {
        "Content-Type": `font/${path.split(".").at(-1)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Font unavailable", { status: 502 });
  }
}
