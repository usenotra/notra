import { resolve } from "node:path";

import { build, createNitro, prepare } from "nitro/builder";

import { getDashboardHeaderRouting } from "../../src/utils/framework-header-routing";
import { getGeoIngestProxyRules } from "../../src/utils/geo-ingest-proxy";

export async function buildVercelRoutingFixture(
  rootDir: string,
  ingestUrl = "https://ingest.example.invalid",
  vercel = true
) {
  const headerRouting = getDashboardHeaderRouting(vercel, false);
  const nitro = await createNitro(
    {
      rootDir,
      preset: vercel ? "vercel" : "node-server",
      compatibilityDate: "2026-10-02",
      logLevel: 0,
      handlers: [
        {
          route: "/**",
          handler: resolve(
            import.meta.dirname,
            "../fixtures/vercel-routing.fixture.ts"
          ),
        },
      ],
      routeRules: {
        ...headerRouting.routeRules,
        ...getGeoIngestProxyRules(ingestUrl, "https://app.example.invalid"),
        "/ingest/static/**": { proxy: `${ingestUrl}/static/**` },
        "/ingest/**": { proxy: `${ingestUrl}/**` },
        "/legacy": {
          redirect: "/new",
          headers: { "x-routing-redirect": "preserved" },
        },
      },
      vercel: {
        config: headerRouting.vercelConfig,
        functions: { runtime: "nodejs24.x", regions: ["iad1"] },
      },
    },
    { dotenv: false }
  );
  try {
    await prepare(nitro);
    await build(nitro);
    return nitro.options.output.dir;
  } finally {
    await nitro.close();
  }
}
