import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

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

function withNoIndex(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, headers });
}

function redirectTo(location: string): Response {
  return withNoIndex(
    new Response(null, { status: 307, headers: { Location: location } })
  );
}

function redirectToStart(request: Request, returnTo: string | null) {
  const url = new URL(DEMO_ENTER_PATH, request.url);
  if (returnTo && returnTo !== "/") {
    url.searchParams.set("returnTo", returnTo);
  }
  return redirectTo(`${url.pathname}${url.search}`);
}

export function demoProxy(request: Request): Response | null {
  const url = new URL(request.url);
  const banner = url.searchParams.get(DEMO_BANNER_PARAM);
  if (banner === DEMO_BANNER_OFF) {
    setCookie(DEMO_BANNER_COOKIE, DEMO_BANNER_OFF, {
      httpOnly: true,
      ...cookieAttributes(),
      path: "/",
      maxAge: DEMO_SESSION_COOKIE_MAX_AGE_SECONDS,
    });
  } else if (banner !== null) {
    deleteCookie(DEMO_BANNER_COOKIE, { path: "/", ...cookieAttributes() });
  }
  const { pathname, search } = url;
  if (pathname === DEMO_START_PATH) {
    return null;
  }
  if (DEMO_BLOCKED_PATH.test(pathname)) {
    return withNoIndex(
      new Response(DEMO_BLOCKED_HTML, {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
  if (DEMO_SIGNUP_PATH.test(pathname)) {
    return Response.redirect(DEMO_SIGNUP_URL, 307);
  }
  if (DEMO_AUTH_PATH.test(pathname)) {
    return redirectToStart(request, url.searchParams.get("returnTo"));
  }
  const hiddenPage = DEMO_HIDDEN_PAGE_PATH.exec(pathname);
  if (hiddenPage) {
    return redirectTo(`/${hiddenPage[1]}/geo`);
  }
  if (DEMO_ONBOARDING_PATH.test(pathname)) {
    return redirectTo("/");
  }
  const hasSession = Boolean(getCookie(DEMO_SESSION_COOKIE));
  if (!hasSession && (pathname === "/" || !NON_DASHBOARD_PATH.test(pathname))) {
    return redirectToStart(request, `${pathname}${search}`);
  }
  return null;
}
