import type { NextRequest } from "next/server";

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host =
    (process.env.VERCEL && request.headers.get("x-forwarded-host")) ||
    request.headers.get("host");
  const protocol =
    (process.env.VERCEL &&
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()) ||
    request.nextUrl.protocol.replace(":", "");
  if (!(origin && host)) {
    return false;
  }
  const requestOrigin = URL.parse(`${protocol}://${host}`)?.origin;
  return Boolean(requestOrigin && URL.parse(origin)?.origin === requestOrigin);
}
