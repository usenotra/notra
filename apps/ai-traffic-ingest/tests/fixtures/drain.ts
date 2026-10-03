import { mock } from "bun:test";

import type { GeoIngestDefer } from "@notra/geo-core/types/ingest";

mock.module("../../src/utils/config", () => ({
  missingIngestEnvironment: () => [],
  ingestFlushIntervalMs: () => 0,
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
await import("../../src/index");
