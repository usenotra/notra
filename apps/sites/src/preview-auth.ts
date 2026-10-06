import {
  SITE_PREVIEW_COOKIE,
  SITE_PREVIEW_MEMBER_RENEW_SECONDS,
  SITE_PREVIEW_PASSWORD_MAX_LENGTH,
  SITE_PREVIEW_SESSION_SECONDS,
} from "@notra/sites-core/constants/sites";
import type { SiteServingState } from "@notra/sites-core/types/deployment";
import type { SitePreviewTokenClaims } from "@notra/sites-core/types/preview-token";
import { verifyPreviewPassword } from "@notra/sites-core/utils/preview-password";
import { safePreviewNextPath } from "@notra/sites-core/utils/preview-path";
import { isPreviewTokenRevoked } from "@notra/sites-core/utils/preview-revocation";
import {
  previewTokenAllows,
  readSitePreviewToken,
  signSitePreviewToken,
  verifySitePreviewToken,
} from "@notra/sites-core/utils/preview-token";

import { PASSWORD_FORM_MAX_BYTES } from "./constants/preview-auth";
import { previewLockedPage } from "./pages";
import { html, noStoreRedirect } from "./responses";
import type { PreviewGateError } from "./types/pages";
import type { PreviewRequestContext } from "./types/preview-auth";
import type { SitesDeps } from "./types/worker";
import { readCookie } from "./utils/cookies";

function nowSeconds(deps: SitesDeps): number {
  return Math.floor(deps.now().getTime() / 1000);
}

function previewSignInUrl(
  deps: SitesDeps,
  siteId: string,
  previewKey: string,
  next: string
): string {
  const signIn = new URL("/sites/preview-access", deps.dashboardUrl);
  signIn.searchParams.set("site", siteId);
  signIn.searchParams.set("preview", previewKey);
  signIn.searchParams.set("next", next);
  return signIn.toString();
}

function previewGate(
  context: PreviewRequestContext,
  next: string,
  status: number,
  error: PreviewGateError | null = null
): Response {
  const { deps, state, siteId, previewKey } = context;
  return html(
    previewLockedPage({
      signInUrl: previewSignInUrl(deps, siteId, previewKey, next),
      passwordEnabled: state.previewPassword !== null,
      next,
      error,
    }),
    status
  );
}

function sessionCookie(url: URL, value: string, maxAge: number): string {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `${SITE_PREVIEW_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly${secure}; SameSite=Lax`;
}

function previewSessionAllows(
  claims: SitePreviewTokenClaims,
  state: SiteServingState,
  siteId: string,
  previewKey: string
): boolean {
  if (
    !previewTokenAllows(claims, siteId, previewKey) ||
    isPreviewTokenRevoked(claims, state.revokedSessions)
  ) {
    return false;
  }
  if (claims.kind !== "password") {
    return true;
  }
  return (
    state.previewPassword !== null &&
    claims.passwordVersion === state.previewPassword.version
  );
}

async function acceptToken(
  context: PreviewRequestContext,
  next: string
): Promise<Response> {
  const { deps, url, state, siteId, previewKey } = context;
  const token = url.searchParams.get("token");
  if (!token) {
    const error =
      url.searchParams.get("error") === "forbidden" ? "forbidden" : null;
    const gate = previewGate(context, next, error ? 403 : 401, error);
    if (error) {
      gate.headers.set("Set-Cookie", sessionCookie(url, "", 0));
    }
    return gate;
  }
  const claims = await verifySitePreviewToken(
    token,
    deps.previewSecret,
    nowSeconds(deps)
  );
  if (
    !claims ||
    claims.kind === "password" ||
    !previewSessionAllows(claims, state, siteId, previewKey)
  ) {
    return previewGate(context, next, 401, "invalid_link");
  }
  const maxAge =
    claims.kind === "member"
      ? SITE_PREVIEW_MEMBER_RENEW_SECONDS
      : Math.min(
          SITE_PREVIEW_SESSION_SECONDS,
          Math.max(0, claims.exp - nowSeconds(deps))
        );
  return noStoreRedirect(next, 302, {
    "Referrer-Policy": "no-referrer",
    "Set-Cookie": sessionCookie(url, token, maxAge),
  });
}

async function readPasswordForm(
  request: Request
): Promise<{ password: string; next: string } | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > PASSWORD_FORM_MAX_BYTES) {
    return null;
  }
  const body = await request.text();
  if (body.length > PASSWORD_FORM_MAX_BYTES) {
    return null;
  }
  const form = new URLSearchParams(body);
  return {
    password: form.get("password") ?? "",
    next: safePreviewNextPath(form.get("next")),
  };
}

function isPageNavigation(request: Request): boolean {
  return (
    request.method === "GET" &&
    (request.headers.get("Sec-Fetch-Mode") === "navigate" ||
      (request.headers.get("Accept") ?? "").includes("text/html"))
  );
}

function isCrossOrigin(request: Request, origin: string): boolean {
  const requestOrigin = request.headers.get("Origin");
  return requestOrigin !== null && requestOrigin !== origin;
}

async function acceptPassword(
  context: PreviewRequestContext
): Promise<Response> {
  const { deps, request, url, origin, state, siteId, previewKey } = context;
  const form = await readPasswordForm(request);
  if (!form) {
    return new Response("Request too large", { status: 413 });
  }
  const { password, next } = form;
  const stored = state.previewPassword;
  if (!stored || isCrossOrigin(request, origin)) {
    return previewGate(context, next, 403);
  }
  if (deps.passwordAttemptLimiter) {
    const client = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await deps.passwordAttemptLimiter.limit({
      key: `${siteId}:${previewKey}:${client}`,
    });
    if (!success) {
      return previewGate(context, next, 429, "too_many_attempts");
    }
  }
  const valid =
    password.length <= SITE_PREVIEW_PASSWORD_MAX_LENGTH &&
    (await verifyPreviewPassword(password, stored));
  if (!valid) {
    return previewGate(context, next, 401, "wrong_password");
  }
  const exp = nowSeconds(deps) + SITE_PREVIEW_SESSION_SECONDS;
  const token = await signSitePreviewToken(
    {
      siteId,
      previewKey,
      exp,
      kind: "password",
      passwordVersion: stored.version,
    },
    deps.previewSecret
  );
  return noStoreRedirect(next, 303, {
    "Set-Cookie": sessionCookie(url, token, SITE_PREVIEW_SESSION_SECONDS),
  });
}

export async function handlePreviewAuth(
  context: PreviewRequestContext
): Promise<Response> {
  if (context.request.method === "POST") {
    return await acceptPassword(context);
  }
  return await acceptToken(
    context,
    safePreviewNextPath(context.url.searchParams.get("next"))
  );
}

export function handlePreviewSignOut(context: PreviewRequestContext): Response {
  return noStoreRedirect("/", 303, {
    "Set-Cookie": sessionCookie(context.url, "", 0),
  });
}

export async function previewAccessDenied(
  context: PreviewRequestContext
): Promise<Response | null> {
  const { deps, request, url, state, siteId, previewKey } = context;
  const cookie = readCookie(request, SITE_PREVIEW_COOKIE);
  const session = cookie
    ? await readSitePreviewToken(cookie, deps.previewSecret, nowSeconds(deps))
    : null;
  const allowed =
    session !== null &&
    previewSessionAllows(session.claims, state, siteId, previewKey);
  const next = `${url.pathname}${url.search}`;
  if (allowed && !session.expired) {
    return null;
  }
  if (
    allowed &&
    session.claims.kind === "member" &&
    isPageNavigation(request)
  ) {
    return noStoreRedirect(
      previewSignInUrl(deps, siteId, previewKey, next),
      302
    );
  }
  return previewGate(context, next, 401);
}
