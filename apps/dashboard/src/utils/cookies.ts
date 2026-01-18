import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "./constants";

export const setLastVisitedOrganization = async (
  organizationSlug: string,
  maxAge: number = 30 * 86_400
) => {
  const isSecure =
    typeof window !== "undefined" &&
    (window.location.protocol === "https:" ||
      process.env.NODE_ENV === "production");

  if (typeof window !== "undefined" && "cookieStore" in window) {
    const cookieOptions: CookieInit = {
      name: LAST_VISITED_ORGANIZATION_COOKIE,
      value: organizationSlug,
      expires: Date.now() + maxAge * 1000,
      path: "/",
      sameSite: "lax",
    };

    await cookieStore.set(cookieOptions).catch(() => {
      // Failed to set cookie - silently continue
    });
  } else if (typeof document !== "undefined") {
    const secureFlag = isSecure ? "; Secure" : "";
    // biome-ignore lint/suspicious/noDocumentCookie: Fallback for browsers without Cookie Store API support
    document.cookie = `${LAST_VISITED_ORGANIZATION_COOKIE}=${organizationSlug}; max-age=${maxAge}; path=/; SameSite=Lax${secureFlag}`;
  }
};

export const getLastVisitedOrganization = (
  cookies: RequestCookies | ReadonlyRequestCookies
): string | undefined => cookies.get(LAST_VISITED_ORGANIZATION_COOKIE)?.value;
