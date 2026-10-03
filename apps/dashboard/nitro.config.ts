import { defineConfig } from "nitro";
import type { ModuleOptions } from "workflow/nitro";

import { DASHBOARD_FUNCTION_RULES } from "./src/constants/framework";
import { IMAGE_SECURITY_HEADERS } from "./src/constants/framework-image";
import { getDashboardSecurityHeaders } from "./src/utils/framework-request";
import { traceWorkflowDependencies } from "./src/utils/framework-workflow-plugin";
import { getGeoIngestProxyRules } from "./src/utils/geo-ingest-proxy";

const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const posthogAssetsHost = posthogHost.replace(
  /^https:\/\/(us|eu)\.i\./,
  "https://$1-assets.i."
);

export default defineConfig({
  preset: process.env.VERCEL === "1" ? "vercel" : "node-server",
  compatibilityDate: "2026-10-02",
  // The node-server build (Railway demo) has no CDN in front, and Nitro does
  // not compress responses itself; Next's standalone server gzipped assets.
  // Vercel compresses at the edge, so its build skips the extra work.
  compressPublicAssets:
    process.env.VERCEL === "1" ? false : { gzip: true, brotli: true },
  workflow: {
    runtime: "nodejs24.x",
    externalPackages: ["@resvg/resvg-js", "@cursor/sdk"],
  } satisfies ModuleOptions,
  traceDeps: ["@resvg/resvg-js", "@cursor/sdk*"],
  traceOpts: {
    hooks: {
      traceStart(files) {
        traceWorkflowDependencies(files, ["@cursor/sdk"]);
      },
    },
  },
  serverAssets: [{ baseName: "images", dir: "./public" }],
  handlers: [
    {
      route: "/**",
      middleware: true,
      handler: "./src/lib/framework/runtime.ts",
    },
  ],
  routeRules: {
    ...getGeoIngestProxyRules(),
    "/**": { headers: getDashboardSecurityHeaders() },
    "/api/image": { headers: IMAGE_SECURITY_HEADERS },
    "/ingest/static/**": { proxy: `${posthogAssetsHost}/static/**` },
    "/ingest/**": { proxy: `${posthogHost}/**` },
    ...(process.env.NODE_ENV === "development"
      ? {
          "/eve/v1/**": {
            proxy: `${process.env.EVE_ONBOARDING_AGENT_URL ?? "http://127.0.0.1:3100"}/eve/v1/**`,
          },
        }
      : {}),
  },
  vercel: {
    functions: {
      runtime: "nodejs24.x",
      architecture: "x86_64",
      regions: ["iad1"],
      supportsResponseStreaming: true,
    },
    functionRules: DASHBOARD_FUNCTION_RULES,
  },
});
