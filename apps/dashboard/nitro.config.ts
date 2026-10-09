import { defineConfig } from "nitro";
import type { ModuleOptions } from "workflow/nitro";

import { DASHBOARD_FUNCTION_RULES } from "./src/constants/framework";
import { getDashboardHeaderRouting } from "./src/utils/framework-header-routing";
import { traceWorkflowDependencies } from "./src/utils/framework-workflow-plugin";
import { getGeoIngestProxyRules } from "./src/utils/geo-ingest-proxy";

const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const posthogAssetsHost = posthogHost.replace(
  /^https:\/\/(us|eu)\.i\./,
  "https://$1-assets.i."
);
const headerRouting = getDashboardHeaderRouting(process.env.VERCEL === "1");

export default defineConfig({
  preset: process.env.VERCEL === "1" ? "vercel" : "node-server",
  compatibilityDate: "2026-10-02",
  // The node-server build (Railway demo) has no CDN in front, and Nitro does
  // not compress responses itself; Next's standalone server gzipped assets.
  // Vercel compresses at the edge, so its build skips the extra work.
  compressPublicAssets:
    process.env.VERCEL === "1" ? false : { gzip: true, brotli: true },
  workflow: {
    // Only these hold "use workflow"/"use step" modules. The default (".")
    // makes the builder glob and scan every source file on each dev start.
    dirs: ["src/workflows", "src/lib/workflows"],
    runtime: "nodejs24.x",
    externalPackages: ["@resvg/resvg-js", "@cursor/sdk"],
  } satisfies ModuleOptions,
  traceDeps: [
    "@resvg/resvg-js",
    "@cursor/sdk*",
    "autumn-js",
    "react",
    "react-dom",
  ],
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
    ...headerRouting.routeRules,
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
    config: headerRouting.vercelConfig,
    functions: {
      runtime: "nodejs24.x",
      architecture: "x86_64",
      regions: ["iad1"],
      supportsResponseStreaming: true,
    },
    functionRules: DASHBOARD_FUNCTION_RULES,
  },
});
