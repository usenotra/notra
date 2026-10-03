import { createMiddleware, createStart } from "@tanstack/react-start";
import {
  resolveTagLinksConfig,
  tagMarkdownResponse,
  Tracker,
} from "@usenotra/geo";

import {
  GEO_INGEST_ENDPOINT,
  PROXY_EXCLUDED_PATH_PREFIXES,
  STATIC_PAGE_CACHE_CONTROL,
} from "@/constants/proxy";
import { appendHeaderValue, negotiateMarkdown } from "@/lib/proxy/dualmark";
import { findRedirect } from "@/lib/proxy/redirects";
import { HOMEPAGE_LINK_HEADER, SITE_URL } from "@/utils/urls";

const geoOptions = {
  token: process.env.NOTRA_GEO_TOKEN ?? "",
  endpoint: GEO_INGEST_ENDPOINT,
  tagLinks: { host: new URL(SITE_URL).hostname, html: true },
};
const geoTracker = new Tracker(geoOptions);
const geoTagLinks = resolveTagLinksConfig(geoOptions.tagLinks);

function waitUntil(request: Request, promise: Promise<unknown>) {
  if ("waitUntil" in request && typeof request.waitUntil === "function") {
    request.waitUntil(promise);
  }
}

function isProxiedPath(pathname: string) {
  if (pathname === "/api" || pathname === "/favicon.ico") {
    return false;
  }
  return !PROXY_EXCLUDED_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

async function proxy(request: Request, next: () => Promise<Response>) {
  const url = new URL(request.url);

  if (!isProxiedPath(url.pathname)) {
    return next();
  }

  if (geoTagLinks) {
    const tagged = await tagMarkdownResponse(request, geoTagLinks, {});
    if (tagged) {
      waitUntil(request, geoTracker.track(request));
      return tagged;
    }
  }
  waitUntil(request, geoTracker.track(request));

  return negotiateMarkdown(request, async () => {
    const response = await next();
    if (response.status !== 200) {
      return response;
    }
    if (url.pathname === "/") {
      appendHeaderValue(response.headers, "Link", HOMEPAGE_LINK_HEADER);
    }
    const isHtml = response.headers
      .get("content-type")
      ?.startsWith("text/html");
    if (
      isHtml &&
      request.method === "GET" &&
      !response.headers.has("cache-control")
    ) {
      response.headers.set("Cache-Control", STATIC_PAGE_CACHE_CONTROL);
    }
    return response;
  });
}

const siteMiddleware = createMiddleware().server(async ({ request, next }) => {
  const redirect = findRedirect(new URL(request.url));
  if (redirect) {
    return redirect;
  }

  return proxy(request, async () => {
    const result = await next();
    return new Response(result.response.body, result.response);
  });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [siteMiddleware],
}));
