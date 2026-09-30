import { createHmac } from "node:crypto";

/** Rate-limit key for sandbox creation; the raw IP is never stored. */
export function hashDemoClientIp(ip: string): string {
  const secret = process.env.WORKOS_COOKIE_PASSWORD ?? "notra-demo";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}
