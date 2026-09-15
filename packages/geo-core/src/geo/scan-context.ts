import { Effect } from "effect";

import type { GeoCheckContext, GeoScanProjectContext } from "../types/geo";
import { loadGeoModelCatalog } from "./model-catalog";

export const buildGeoScanCheckContext = Effect.fn("geo.buildScanCheckContext")(
  function* (context: GeoScanProjectContext) {
    const catalog = yield* loadGeoModelCatalog(context.organizationId);
    const checkContext: GeoCheckContext = {
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      runId: context.runId,
      catalog,
      capturedAt: new Date(),
      companyName: context.companyName,
      aliases: context.aliases,
      websiteUrl: context.websiteUrl,
      domains: context.domains,
    };
    return checkContext;
  }
);
