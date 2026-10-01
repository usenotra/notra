import { NextResponse, type NextRequest } from "next/server";

import { NON_DASHBOARD_PATH } from "@/constants/auth-routes";
import {
  DEMO_AUTH_PATH,
  DEMO_BLOCKED_HTML,
  DEMO_BLOCKED_PATH,
  DEMO_BANNER_COOKIE,
  DEMO_BANNER_OFF,
  DEMO_BANNER_PARAM,
  DEMO_ENTER_PATH,
  DEMO_HIDDEN_PAGE_PATH,
  DEMO_ONBOARDING_PATH,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
  DEMO_SIGNUP_PATH,
  DEMO_SIGNUP_URL,
  DEMO_START_PATH,
} from "@/constants/demo";
import { cookieAttributes } from "@/utils/cookie-attributes";

function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Straight into a ready sandbox; the entry route falls back to the start
// page only when none is waiting.
function redirectToStart(request: NextRequest, returnTo: string | null) {
  const url = new URL(DEMO_ENTER_PATH, request.url);
  if (returnTo && returnTo !== "/") {
    url.searchParams.set("returnTo", returnTo);
  }
  return withNoIndex(NextResponse.redirect(url));
}

/** Remembers `?banner=off|on` so the choice survives navigation. */
function withBannerPreference(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const banner = request.nextUrl.searchParams.get(DEMO_BANNER_PARAM);
  if (banner === DEMO_BANNER_OFF) {
    response.cookies.set(DEMO_BANNER_COOKIE, DEMO_BANNER_OFF, {
      httpOnly: true,
      ...cookieAttributes(),
      path: "/",
      maxAge: DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
    });
  } else if (banner !== null) {
    response.cookies.delete({
      name: DEMO_BANNER_COOKIE,
      path: "/",
      ...cookieAttributes(),
    });
  }
  return response;
}

/**
 * Routing for the public demo. There is no login: sign-up links go to the
 * real app, every auth screen leads into a sandbox, and a dashboard request
 * without a sandbox cookie creates one first.
 */
export function demoProxy(request: NextRequest): NextResponse {
  return withBannerPreference(request, routeDemoRequest(request));
}

function routeDemoRequest(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (pathname === DEMO_START_PATH) {
    return withNoIndex(NextResponse.next());
  }
  if (DEMO_BLOCKED_PATH.test(pathname)) {
    return withNoIndex(
      new NextResponse(DEMO_BLOCKED_HTML, {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
  if (DEMO_SIGNUP_PATH.test(pathname)) {
    return NextResponse.redirect(DEMO_SIGNUP_URL);
  }
  if (DEMO_AUTH_PATH.test(pathname)) {
    return redirectToStart(
      request,
      request.nextUrl.searchParams.get("returnTo")
    );
  }
  const hiddenPage = DEMO_HIDDEN_PAGE_PATH.exec(pathname);
  if (hiddenPage) {
    return withNoIndex(
      NextResponse.redirect(new URL(`/${hiddenPage[1]}/geo`, request.url))
    );
  }
  if (DEMO_ONBOARDING_PATH.test(pathname)) {
    return withNoIndex(NextResponse.redirect(new URL("/", request.url)));
  }

  const hasSession = Boolean(request.cookies.get(DEMO_SESSION_COOKIE)?.value);
  const isDashboardPage =
    pathname === "/" || !NON_DASHBOARD_PATH.test(pathname);
  if (!hasSession && isDashboardPage) {
    return redirectToStart(request, `${pathname}${search}`);
  }

  return withNoIndex(NextResponse.next());
}
