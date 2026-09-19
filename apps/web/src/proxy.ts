import { createDualmarkMiddleware } from "@dualmark/nextjs";
import { createGeoProxy } from "@usenotra/geo/next";
import { after, type NextRequest, NextResponse } from "next/server";

import { HOMEPAGE_LINK_HEADER, SITE_URL } from "@/utils/urls";

const geoTracker = createGeoProxy({
  token: process.env.NOTRA_GEO_TOKEN ?? "",
  endpoint: process.env.NOTRA_GEO_ENDPOINT,
  tagLinks: { host: new URL(SITE_URL).hostname, html: true },
});

const dualmarkProxy = createDualmarkMiddleware({
  siteUrl: SITE_URL,
  middleware: {
    skipPaths: [
      "/.well-known",
      "/api",
      "/ask",
      "/apple-icon.png",
      "/contributors",
      "/demo-dark.webp",
      "/demo.webp",
      "/design.md",
      "/favicon.ico",
      "/feedback.md",
      "/icon.svg",
      "/ip-checker.md",
      "/llms-full.txt",
      "/llms.txt",
      "/logo-dark.svg",
      "/logo.svg",
      "/manifest.json",
      "/marketing",
      "/notra-mark.svg",
      "/og",
      "/og-image.png",
      "/robots.txt",
      "/rss.xml",
      "/sitemap.xml",
      "/testimonials",
      "/web-app-manifest-192x192.png",
      "/web-app-manifest-512x512.png",
    ],
  },
});

function trackAiTraffic(request: NextRequest) {
  return geoTracker(request, {
    waitUntil: (promise) => {
      after(promise);
    },
  });
}

function appendLinkHeader(headers: Headers, value: string) {
  const existing = headers.get("Link");
  headers.set("Link", existing ? `${existing}, ${value}` : value);
}

export async function proxy(request: NextRequest) {
  const tagged = await trackAiTraffic(request);

  if (tagged) {
    return tagged;
  }

  if (
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.get("mode") === "agent"
  ) {
    return NextResponse.rewrite(new URL("/agent", request.url));
  }

  const response = await dualmarkProxy(request);

  if (
    request.nextUrl.pathname === "/" &&
    response.status === 200 &&
    !response.headers.has("x-middleware-rewrite")
  ) {
    appendLinkHeader(response.headers, HOMEPAGE_LINK_HEADER);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/|favicon.ico|md/|api(?:/|$)).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
