import type { NextRequest } from "next/server";

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return origin ? URL.parse(origin)?.host === host : false;
}
