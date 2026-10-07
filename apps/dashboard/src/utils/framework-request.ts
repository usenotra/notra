import { isDemoMode } from "@notra/utils/demo-mode";

import { LAST_VISITED_ORGANIZATION_COOKIE } from "../constants/cookies";
import {
  DEMO_FRAME_ANCESTOR,
  DEMO_LOCAL_FRAME_ANCESTOR,
} from "../constants/demo";
import {
  DASHBOARD_SECURITY_HEADERS,
  ORGANIZATION_COOKIE_SLUG_PATTERN,
} from "../constants/framework";

export function getDashboardSecurityHeaders(demoMode = isDemoMode()) {
  return {
    ...DASHBOARD_SECURITY_HEADERS,
    ...(demoMode ? {} : { "X-Frame-Options": "DENY" }),
    "Content-Security-Policy": `frame-ancestors ${demoMode ? `${DEMO_FRAME_ANCESTOR} ${DEMO_LOCAL_FRAME_ANCESTOR}` : "'none'"}`,
  };
}

export function getDashboardRedirect(request: Request): Response | undefined {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  let destination: string | undefined;
  let status = 307;

  if (url.pathname === "/home" || url.pathname === "/landing") {
    destination = `https://www.usenotra.com${url.pathname}`;
    status = 308;
  } else if (url.pathname === "/api-keys") {
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) =>
        value.startsWith(`${LAST_VISITED_ORGANIZATION_COOKIE}=`)
      );
    const slug = cookie?.slice(LAST_VISITED_ORGANIZATION_COOKIE.length + 1);
    if (slug && ORGANIZATION_COOKIE_SLUG_PATTERN.test(slug)) {
      destination = `/${slug}/api-keys`;
    }
  } else if (segments.length === 2) {
    const [slug, page] = segments;
    if (page === "settings" || page === "logs") {
      destination = `/${slug}`;
      url.searchParams.set(
        "settings",
        page === "settings" ? "general" : "logs"
      );
    } else if (page === "schedules") {
      destination = `/${slug}/automation/schedules`;
      status = 308;
    }
  } else if (
    segments.length === 3 &&
    segments[1] === "automation" &&
    segments[2] === "schedule"
  ) {
    destination = `/${segments[0]}/automation/schedules`;
    status = 308;
  }

  if (!destination) {
    return;
  }
  return new Response(null, {
    status,
    headers: { Location: `${destination}${url.search}` },
  });
}
