import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "./constants";

export const setLastVisitedOrganization = (
  organizationSlug: string,
  maxAge: number = 30 * 86_400
) => {
  // biome-ignore lint/suspicious/noDocumentCookie: Client-side cookie needed for cross-tab persistence
  document.cookie = `${LAST_VISITED_ORGANIZATION_COOKIE}=${organizationSlug}; max-age=${maxAge}; path=/`;
};

export const getLastVisitedOrganization = (
  cookies: RequestCookies | ReadonlyRequestCookies
): string | undefined => cookies.get(LAST_VISITED_ORGANIZATION_COOKIE)?.value;
