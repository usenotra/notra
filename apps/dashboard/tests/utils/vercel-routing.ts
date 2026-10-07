import { resolve } from "node:path";

import { build, createNitro, prepare } from "nitro/builder";

import { IMAGE_SECURITY_HEADERS } from "../../src/constants/framework-image";
import { getDashboardSecurityHeaders } from "../../src/utils/framework-request";
import { getGeoIngestProxyRules } from "../../src/utils/geo-ingest-proxy";

export async function buildVercelRoutingFixture(
  rootDir: string,
  ingestUrl = "https://ingest.example.invalid"
) {
  const nitro = await createNitro(
    {
      rootDir,
      preset: "vercel",
      compatibilityDate: "2026-10-02",
      logLevel: 0,
      handlers: [
        {
          route: "/api/geo/ingest",
          handler: resolve(
            import.meta.dirname,
            "../fixtures/vercel-routing.fixture.ts"
          ),
        },
      ],
      routeRules: {
        ...getGeoIngestProxyRules(ingestUrl, "https://app.example.invalid"),
        "/**": { headers: getDashboardSecurityHeaders(false) },
        "/api/image": { headers: IMAGE_SECURITY_HEADERS },
        "/ingest/static/**": { proxy: `${ingestUrl}/static/**` },
        "/ingest/**": { proxy: `${ingestUrl}/**` },
        "/legacy": {
          redirect: "/new",
          headers: { "x-routing-redirect": "preserved" },
        },
      },
      vercel: {
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
