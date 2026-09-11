import path from "node:path";

import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.APP_URL
    ? [new URL(process.env.APP_URL).hostname]
    : [],
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/*": ["./src/lib/ai/skills/**/*", "../../packages/ai/src/skills/**/*"],
  },
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons", "lucide-react"],
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
    "@notra/kiwi",
    "@notra/posthog",
    "@notra/utils",
    "@usenotra/geo",
  ],
  serverExternalPackages: ["@resvg/resvg-js", "@cursor/sdk"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
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
      return posthogRewrites;
    }

    const agentUrl =
      process.env.EVE_ONBOARDING_AGENT_URL ?? "http://127.0.0.1:3100";
    return [
      ...posthogRewrites,
      {
        source: "/eve/v1/:path*",
        destination: `${agentUrl}/eve/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
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

export default withWorkflow(nextConfig);
