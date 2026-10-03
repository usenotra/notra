import { isDemoMode } from "@notra/utils/demo-mode";

import { DEMO_EMBED_COOKIE_ATTRIBUTES } from "@/constants/demo";

const isProduction = process.env.NODE_ENV === "production";

/**
 * The deployed demo runs inside cross-site iframes (e.g. a localhost landing
 * page), where `lax` cookies are never stored, so it uses partitioned ones.
 */
export function cookieAttributes() {
  return isDemoMode() && isProduction
    ? DEMO_EMBED_COOKIE_ATTRIBUTES
    : ({ sameSite: "lax", secure: isProduction } as const);
}
