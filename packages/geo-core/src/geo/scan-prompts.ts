import { db } from "@notra/db/drizzle";
import { geoPrompts } from "@notra/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import type { GeoSettings } from "../types/geo";
import { geoDb } from "./effect";
import { loadGeoProjectBrand } from "./project-brand";
import { assembleGeoScanPrompts, buildGeoPrompts } from "./prompts";

/**
 * The prompts a scan asks, in scan order, plus the brand the auto prompts were
 * built from. Scans and translation picks share it so both see one list.
 */
export const loadGeoScanPrompts = Effect.fn("geo.scanPrompts")(function* (
  settings: GeoSettings
) {
  const [brand, customRows] = yield* Effect.all(
    [
      loadGeoProjectBrand({
        organizationId: settings.organizationId,
        projectId: settings.projectId,
      }),
      geoDb("prompts lookup failed", () =>
        db.query.geoPrompts.findMany({
          columns: { id: true, prompt: true },
          where: and(
            eq(geoPrompts.projectId, settings.projectId),
            eq(geoPrompts.enabled, true)
          ),
          orderBy: [asc(geoPrompts.createdAt)],
        })
      ),
    ],
    { concurrency: "unbounded" }
  );
  const prompts = assembleGeoScanPrompts({
    autoPrompts: buildGeoPrompts(
      settings,
      brand
        ? {
            companyDescription: brand.companyDescription,
            audience: brand.audience,
          }
        : null
    ),
    customRows,
    pausedAutoPromptIds: settings.pausedAutoPromptIds,
    removedAutoPromptIds: settings.removedAutoPromptIds,
  });
  return { brand, prompts };
});
