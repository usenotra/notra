import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { NitroOptions } from "nitro/types";

import { IMAGE_SECURITY_HEADERS } from "../src/constants/framework-image";
import { getDashboardHeaderRouting } from "../src/utils/framework-header-routing";
import { getDashboardSecurityHeaders } from "../src/utils/framework-request";
import { buildVercelRoutingFixture } from "./utils/vercel-routing";

test("node-server keeps runtime header rules; Vercel only emits CDN rules", () => {
  expect(getDashboardHeaderRouting(false, false)).toEqual({
    routeRules: {
      "/**": { headers: getDashboardSecurityHeaders(false) },
      "/api/image": { headers: IMAGE_SECURITY_HEADERS },
    },
    vercelConfig: undefined,
  });
  expect(getDashboardHeaderRouting(true, false).routeRules).toEqual({});
  expect(
    getDashboardHeaderRouting(true, true).vercelConfig?.routes[0]?.headers
  ).toEqual(getDashboardSecurityHeaders(true));
});

test("Vercel header rules preserve external rewrites and terminating redirects", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "notra-vercel-routing-"));
  try {
    const outputDir = await buildVercelRoutingFixture(rootDir);
    const config = JSON.parse(
      await readFile(join(outputDir, "config.json"), "utf8")
    ) as NonNullable<NonNullable<NitroOptions["vercel"]>["config"]>;
    const routes = config.routes ?? [];
    const headerRules = routes.filter(
      (route) => "src" in route && route.headers && !route.dest && !route.status
    );
    expect(headerRules).toHaveLength(2);
    expect(headerRules[0]).toMatchObject({
      src: "/(.*)",
      headers: getDashboardSecurityHeaders(false),
      continue: true,
    });
    expect(headerRules[1]).toMatchObject({
      src: "/api/image",
      headers: IMAGE_SECURITY_HEADERS,
      continue: true,
    });
    for (const [src, dest] of [
      ["/api/geo/ingest", "https://ingest.example.invalid/api/geo/ingest"],
      ["/ingest/static/(.*)", "https://ingest.example.invalid/static/$1"],
      ["/ingest/(.*)", "https://ingest.example.invalid/$1"],
    ]) {
      const index = routes.findIndex(
        (route) => "src" in route && route.src === src && route.dest === dest
      );
      expect(index).toBeGreaterThan(1);
      const rewrite = routes[index];
      expect(rewrite && "continue" in rewrite && rewrite.continue).not.toBe(
        true
      );
      for (const route of routes.slice(0, index)) {
        if ("src" in route && route.headers && !route.dest && !route.status) {
          expect(route.continue).toBe(true);
        }
      }
    }
    const redirect = routes.find(
      (route) => "src" in route && route.src === "/legacy"
    );
    expect(redirect).toMatchObject({
      headers: { Location: "/new", "x-routing-redirect": "preserved" },
    });
    expect(redirect && "continue" in redirect && redirect.continue).not.toBe(
      true
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}, 30000);
