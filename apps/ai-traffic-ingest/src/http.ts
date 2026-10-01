import { GEO_INGEST_PATH } from "@notra/geo-core/constants/geo";
import { handleGeoIngestRequest } from "@notra/geo-core/ingest/handler";
import type { GeoIngestDefer } from "@notra/geo-core/types/ingest";
import { Hono } from "hono";

import { missingIngestEnvironment } from "./utils/config";

export function createIngestApp(defer: GeoIngestDefer) {
  const app = new Hono();

  app.use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  });

  app.get("/healthz", (context) => context.json({ ok: true }));
  app.get("/readyz", (context) => {
    const ready = missingIngestEnvironment().length === 0;
    return context.json({ ready }, ready ? 200 : 503);
  });

  app.post(GEO_INGEST_PATH, (context) => {
    if (missingIngestEnvironment().length > 0) {
      return context.json({ error: "Ingest is not configured" }, 503);
    }
    return handleGeoIngestRequest(context.req.raw, defer);
  });
  app.all(GEO_INGEST_PATH, (context) => {
    context.header("Allow", "POST");
    return context.body(null, 405);
  });

  app.notFound((context) => context.body(null, 404));
  app.onError((error, context) => {
    console.error("[geo-ingest] Request failed", error);
    return context.json({ error: "Ingest failed" }, 502);
  });

  return app;
}
