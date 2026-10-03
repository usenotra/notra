import {
  SITE_PREVIEW_COOKIE,
  SITE_PREVIEW_SESSION_SECONDS,
} from "@notra/sites-core/constants/sites";
import {
  previewTokenAllows,
  verifySitePreviewToken,
} from "@notra/sites-core/utils/preview-token";

import { previewLockedPage } from "./pages";
import { html } from "./responses";
import type { SitesDeps } from "./types";

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return rest.join("=");
    }
  }
  return null;
}

export function previewSignInUrl(
  deps: SitesDeps,
  siteId: string,
  previewKey: string,
  url: URL
): string {
  const signIn = new URL("/sites/preview-access", deps.dashboardUrl);
  signIn.searchParams.set("site", siteId);
  signIn.searchParams.set("preview", previewKey);
  signIn.searchParams.set("next", `${url.pathname}${url.search}`);
  return signIn.toString();
}

export async function handlePreviewAuth(
  deps: SitesDeps,
  url: URL,
  siteId: string,
  previewKey: string
): Promise<Response> {
  const token = url.searchParams.get("token") ?? "";
  const next = url.searchParams.get("next") ?? "/";
  const claims = await verifySitePreviewToken(
    token,
    deps.previewSecret,
    Math.floor(deps.now().getTime() / 1000)
  );
  if (!(claims && previewTokenAllows(claims, siteId, previewKey))) {
    return html(
      previewLockedPage(
        previewSignInUrl(deps, siteId, previewKey, new URL(next, url))
      ),
      401
    );
  }
  const maxAge = Math.min(
    SITE_PREVIEW_SESSION_SECONDS,
    Math.max(0, claims.exp - Math.floor(deps.now().getTime() / 1000))
  );
  const location = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Set-Cookie": `${SITE_PREVIEW_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

/** Protected previews need a valid token cookie for exactly this site and preview. */
export async function previewAccessDenied(
  deps: SitesDeps,
  request: Request,
  url: URL,
  siteId: string,
  previewKey: string
): Promise<Response | null> {
  const cookie = readCookie(request, SITE_PREVIEW_COOKIE);
  const claims = cookie
    ? await verifySitePreviewToken(
        cookie,
        deps.previewSecret,
        Math.floor(deps.now().getTime() / 1000)
      )
    : null;
  if (claims && previewTokenAllows(claims, siteId, previewKey)) {
    return null;
  }
  return html(
    previewLockedPage(previewSignInUrl(deps, siteId, previewKey, url)),
    401
  );
}
