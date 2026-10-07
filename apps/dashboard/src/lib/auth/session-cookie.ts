import { deleteCookie, getRequest } from "@tanstack/react-start/server";

import { WORKOS_SESSION_COOKIE_FALLBACK } from "@/constants/cookies";

export function clearHostAuthSessionCookie() {
  const domain = process.env.WORKOS_COOKIE_DOMAIN?.replace(
    /^\./,
    ""
  ).toLowerCase();
  if (!domain || domain === new URL(getRequest().url).hostname) {
    return;
  }
  // The previous SDK configuration wrote host-only cookies. Remove those
  // after signing in so they cannot shadow the configured domain cookie.
  deleteCookie(
    process.env.WORKOS_COOKIE_NAME || WORKOS_SESSION_COOKIE_FALLBACK,
    { path: "/" }
  );
}

export async function clearAuthSessionCookie() {
  clearHostAuthSessionCookie();
  deleteCookie(
    process.env.WORKOS_COOKIE_NAME || WORKOS_SESSION_COOKIE_FALLBACK,
    {
      domain: process.env.WORKOS_COOKIE_DOMAIN,
      path: "/",
    }
  );
}
