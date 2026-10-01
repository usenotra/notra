import { createHmac } from "node:crypto";

/**
 * The visitor's IP for demo rate limits. The demo is self-hosted behind
 * Cloudflare and Railway, where the shared ratelimit helper (Vercel only)
 * would hand every request a fresh random key. A client that bypasses
 * Cloudflare can spoof these headers, but that only buys it more sandboxes,
 * which the sandbox cap still bounds.
 */
export function getDemoClientIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for")?.split(",")[0];
  return (
    headersList.get("x-vercel-forwarded-for")?.trim() ||
    headersList.get("cf-connecting-ip")?.trim() ||
    headersList.get("x-real-ip")?.trim() ||
    forwarded?.trim() ||
    "unknown"
  );
}

/** Rate-limit key for sandbox creation; the raw IP is never stored. */
export function hashDemoClientIp(ip: string): string {
  const secret = process.env.WORKOS_COOKIE_PASSWORD;
  if (!secret) {
    throw new Error("WORKOS_COOKIE_PASSWORD must be defined");
  }
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}
