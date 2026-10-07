import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { NitroOptions } from "nitro/types";

import { IMAGE_SECURITY_HEADERS } from "../src/constants/framework-image";
import { getDashboardSecurityHeaders } from "../src/utils/framework-request";
import { buildVercelRoutingFixture } from "./utils/vercel-routing";

test("Vercel header rules preserve external rewrites and terminating redirects", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "notra-vercel-routing-"));
  try {
    const outputDir = await buildVercelRoutingFixture(rootDir);
    const config = JSON.parse(
      await readFile(join(outputDir, "config.json"), "utf8")
    ) as NonNullable<NonNullable<NitroOptions["vercel"]>["config"]>;
    const routes = config.routes ?? [];
    const globalHeaderIndex = routes.findIndex(
      (route) => "src" in route && route.src === "/(.*)" && route.headers
    );
    expect(routes[globalHeaderIndex]).toMatchObject({
      headers: getDashboardSecurityHeaders(false),
      continue: true,
    });
    expect(
      routes.find((route) => "src" in route && route.src === "/api/image")
    ).toMatchObject({ headers: IMAGE_SECURITY_HEADERS, continue: true });

    for (const [src, dest] of [
      ["/api/geo/ingest", "https://ingest.example.invalid/api/geo/ingest"],
      ["/ingest/static/(.*)", "https://ingest.example.invalid/static/$1"],
      ["/ingest/(.*)", "https://ingest.example.invalid/$1"],
    ]) {
      const index = routes.findIndex(
        (route) => "src" in route && route.src === src && route.dest === dest
      );
      expect(index).toBeGreaterThan(globalHeaderIndex);
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
