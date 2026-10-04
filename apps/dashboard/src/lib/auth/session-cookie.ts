import { deleteCookie } from "@tanstack/react-start/server";

import { WORKOS_SESSION_COOKIE_FALLBACK } from "@/constants/cookies";

export async function clearAuthSessionCookie() {
  deleteCookie(
    process.env.WORKOS_COOKIE_NAME || WORKOS_SESSION_COOKIE_FALLBACK,
    {
      domain: process.env.WORKOS_COOKIE_DOMAIN,
      path: "/",
    }
  );
}
