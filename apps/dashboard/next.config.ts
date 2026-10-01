import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withWorkflow } from "workflow/next";

import { LAST_VISITED_ORGANIZATION_COOKIE } from "./src/constants/cookies";

// Mirrors resolveGeoIngestOrigin in @notra/geo-core; next.config cannot load
// workspace TypeScript. A value without a scheme or pointing at the app itself
// would fail the build or proxy ingest back into this route forever.
function resolveIngestOrigin(): string | null {
  const value = process.env.GEO_INGEST_URL?.trim();
  if (!value) {
    return null;
  }
  const url = URL.parse(value);
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
    console.warn(
      "[next.config] Ignoring GEO_INGEST_URL without http(s) scheme"
    );
    return null;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (appUrl && URL.parse(appUrl)?.origin === url.origin) {
    console.warn(
      "[next.config] Ignoring GEO_INGEST_URL that points at the app"
    );
    return null;
  }
  return url.origin;
}

const nextConfig: NextConfig = {
  // Only recognize page.dev.tsx/layout.dev.tsx in next dev; design-system
  // previews should not become routes or bundles in a production build.
  pageExtensions: [
    ...(process.env.NODE_ENV === "development" ? ["dev.tsx"] : []),
    "tsx",
    "ts",
    "jsx",
    "js",
  ],
  allowedDevOrigins: process.env.APP_URL
    ? [new URL(process.env.APP_URL).hostname]
    : [],
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    optimizePackageImports: [
      "@base-ui/react",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "cmdk",
      "date-fns",
      "echarts",
      "lucide-react",
      "motion/react",
      "nuqs",
      "recharts",
    ],
    hideLogsAfterAbort: true,
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: [
    "@notra/db",
    "@notra/geo-core",
    "@notra/ui",
    "@notra/email",
    "@notra/ai",
    "@notra/content-generation",
    "@notra/webhooks",
    "@notra/kiwi",
    "@notra/posthog",
    "@notra/utils",
  ],
  serverExternalPackages: [
    // Let Next.js remove the guarded import before devtools filesystem tracing.
    ...(process.env.NODE_ENV === "production" ? ["@ai-sdk/devtools"] : []),
    "@resvg/resvg-js",
    "@cursor/sdk",
    "@ai-sdk/code-mode",
    "run",
    "sharp",
  ],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const ingestOrigin = resolveIngestOrigin();
    const beforeFiles = ingestOrigin
      ? [
          {
            source: "/api/geo/ingest",
            destination: new URL("/api/geo/ingest", ingestOrigin).toString(),
          },
        ]
      : [];
    const posthogHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    const posthogAssetsHost = posthogHost.replace(
      /^https:\/\/(us|eu)\.i\./,
      "https://$1-assets.i."
    );
    const posthogRewrites = [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];

    if (process.env.NODE_ENV === "production") {
      return { beforeFiles, afterFiles: posthogRewrites, fallback: [] };
    }

    const agentUrl =
      process.env.EVE_ONBOARDING_AGENT_URL ?? "http://127.0.0.1:3100";
    return {
      beforeFiles,
      afterFiles: [
        ...posthogRewrites,
        {
          source: "/eve/v1/:path*",
          destination: `${agentUrl}/eve/v1/:path*`,
        },
      ],
      fallback: [],
    };
  },
  async redirects() {
    return [
      {
        source: "/home",
        destination: "https://www.usenotra.com/home",
        permanent: true,
      },
      {
        source: "/landing",
        destination: "https://www.usenotra.com/landing",
        permanent: true,
      },
      {
        source: "/api-keys",
        has: [
          {
            type: "cookie",
            key: LAST_VISITED_ORGANIZATION_COOKIE,
            value: "(?<slug>[a-z0-9-]+)",
          },
        ],
        destination: "/:slug/api-keys",
        permanent: false,
      },
      {
        source: "/:slug/settings",
        destination: "/:slug?settings=general",
        permanent: false,
      },
      {
        source: "/:slug/schedules",
        destination: "/:slug/automation/schedules",
        permanent: true,
      },
      {
        source: "/:slug/automation/schedule",
        destination: "/:slug/automation/schedules",
        permanent: true,
      },
      {
        source: "/:slug/logs",
        destination: "/:slug?settings=logs",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logos.context.dev",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "media.brand.dev",
      },
      {
        protocol: "https",
        hostname: "models.dev",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      ...(process.env.CLOUDFLARE_PUBLIC_URL
        ? [
            {
              protocol: new URL(
                process.env.CLOUDFLARE_PUBLIC_URL
              ).protocol.replace(":", "") as "https" | "http",
              hostname: new URL(process.env.CLOUDFLARE_PUBLIC_URL).hostname,
            },
          ]
        : []),
    ],
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    messages: {
      path: "./messages",
      format: "json",
      locales: ["en", "de"],
      precompile: true,
    },
  },
});

export default withWorkflow(withNextIntl(nextConfig));
