import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  const vercelForwardedFor = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (vercelForwardedFor) {
    return vercelForwardedFor;
  }
  if (process.env.VERCEL) {
    return "unknown";
  }
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
