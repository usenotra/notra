import {
  LAST_VISITED_ORGANIZATION_COOKIE,
  LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
  LAST_VISITED_PROJECT_COOKIE,
  LAST_VISITED_PROJECT_COOKIE_MAX_AGE,
  ONBOARDING_BANNER_DISMISSED_COOKIE_MAX_AGE,
  ONBOARDING_BANNER_DISMISSED_COOKIE_PREFIX,
  SIDEBAR_MODE_COOKIE,
  SIDEBAR_MODE_COOKIE_MAX_AGE,
} from "@/constants/cookies";
import type { SidebarMode } from "@/types/components/nav";
import type { CookieJar } from "@/types/cookies";
import { isSidebarMode } from "@/utils/nav";

function parseLastVisitedProject(
  value: string | undefined,
  organizationSlug: string
): string | undefined {
  if (!value) {
    return;
  }

  const [storedSlug, projectId, extra] = value.split(":");
  if (!(storedSlug && projectId) || extra !== undefined) {
    return;
  }

  try {
    return decodeURIComponent(storedSlug) === organizationSlug
      ? decodeURIComponent(projectId)
      : undefined;
  } catch {
    return;
  }
}

function readClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return;
  }

  const prefix = `${name}=`;
  // biome-ignore lint/suspicious/noDocumentCookie: The active project must be restored before the next navigation
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  return entry?.slice(prefix.length);
}

async function setClientCookie(
  name: string,
  value: string,
  maxAge: number
): Promise<void> {
  const isSecure =
    typeof window !== "undefined" &&
    (window.location.protocol === "https:" ||
      process.env.NODE_ENV === "production");

  if (
    typeof document === "undefined" &&
    typeof window !== "undefined" &&
    "cookieStore" in window
  ) {
    const cookieOptions: CookieInit = {
      name,
      value,
      expires: Date.now() + maxAge * 1000,
      path: "/",
      sameSite: "lax",
    };

    await cookieStore.set(cookieOptions).catch(() => {
      // Failed to set cookie - silently continue
    });
    return;
  }

  if (typeof document !== "undefined") {
    const secureFlag = isSecure ? "; Secure" : "";
    // biome-ignore lint/suspicious/noDocumentCookie: Navigation must see the updated cookie synchronously
    document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax${secureFlag}`;
  }
}

export const setLastVisitedOrganization = async (
  organizationSlug: string,
  maxAge: number = LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE
) => {
  await setClientCookie(
    LAST_VISITED_ORGANIZATION_COOKIE,
    organizationSlug,
    maxAge
  );
};

export const getLastVisitedOrganization = (
  cookies: CookieJar
): string | undefined => cookies.get(LAST_VISITED_ORGANIZATION_COOKIE)?.value;

export const setLastVisitedProject = async (
  organizationSlug: string,
  projectId: string,
  maxAge: number = LAST_VISITED_PROJECT_COOKIE_MAX_AGE
): Promise<void> => {
  await setClientCookie(
    LAST_VISITED_PROJECT_COOKIE,
    `${encodeURIComponent(organizationSlug)}:${encodeURIComponent(projectId)}`,
    maxAge
  );
};

export const getLastVisitedProject = (
  cookies: CookieJar,
  organizationSlug: string
): string | undefined =>
  parseLastVisitedProject(
    cookies.get(LAST_VISITED_PROJECT_COOKIE)?.value,
    organizationSlug
  );

export const getLastVisitedProjectFromClient = (
  organizationSlug: string
): string | undefined =>
  parseLastVisitedProject(
    readClientCookie(LAST_VISITED_PROJECT_COOKIE),
    organizationSlug
  );

/**
 * Per workspace, so the shell loader can leave a dismissed onboarding banner
 * out of the server render instead of hiding it after hydration.
 */
export const onboardingBannerDismissedCookie = (organizationId: string) =>
  `${ONBOARDING_BANNER_DISMISSED_COOKIE_PREFIX}${organizationId}`;

export const isOnboardingBannerDismissedFromClient = (
  organizationId: string
): boolean =>
  readClientCookie(onboardingBannerDismissedCookie(organizationId)) === "1";

export const setOnboardingBannerDismissedCookie = async (
  organizationId: string
): Promise<void> => {
  await setClientCookie(
    onboardingBannerDismissedCookie(organizationId),
    "1",
    ONBOARDING_BANNER_DISMISSED_COOKIE_MAX_AGE
  );
};

export const setSidebarModeCookie = async (
  mode: SidebarMode,
  maxAge: number = SIDEBAR_MODE_COOKIE_MAX_AGE
): Promise<void> => {
  await setClientCookie(SIDEBAR_MODE_COOKIE, mode, maxAge);
};

export const getSidebarModeFromCookies = (
  cookies: CookieJar
): SidebarMode | null => {
  const value = cookies.get(SIDEBAR_MODE_COOKIE)?.value;
  return isSidebarMode(value) ? value : null;
};
