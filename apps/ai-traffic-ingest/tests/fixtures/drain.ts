import { mock } from "bun:test";

import type { GeoIngestDefer } from "@notra/geo-core/types/ingest";

mock.module("../../src/utils/config", () => ({
  missingIngestEnvironment: () => [],
}));
mock.module("@notra/ai/evlog", () => ({
  flushGeoLog: async () => {},
  geoLog: { info: () => {}, warn: () => {}, error: () => {} },
}));
mock.module("../../src/http", () => ({
  createIngestApp: (defer: GeoIngestDefer) => ({
    async fetch(request: Request) {
      if (new URL(request.url).pathname === "/started") {
        return new Response(started ? "yes" : "no");
      }
      started = true;
      await Bun.sleep(250);
      console.info("request completed");
      defer(async () => {
        await Bun.sleep(100);
        console.info("background completed");
      });
      return new Response("done");
    },
  }),
}));

let started = false;
// Per-event writes: the fixture has no Tinybird and no buffer to drain.
process.env.GEO_INGEST_FLUSH_INTERVAL_MS = "0";
await import("../../src/index");
