import { db } from "@notra/db/drizzle";
import { brandSettings, projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import type { GeoScopeInput } from "../types/geo";
import { geoDb } from "./effect";

export const loadGeoProjectBrand = Effect.fn("geo.projectBrand")(function* (
  scope: GeoScopeInput
) {
  const rows = yield* geoDb("project brand lookup failed", () =>
    db
      .select({
        companyDescription: brandSettings.companyDescription,
        audience: brandSettings.audience,
      })
      .from(projects)
      .innerJoin(
        brandSettings,
        and(
          eq(brandSettings.id, projects.brandSettingsId),
          eq(brandSettings.organizationId, projects.organizationId)
        )
      )
      .where(
        and(
          eq(projects.organizationId, scope.organizationId),
          eq(projects.id, scope.projectId ?? "")
        )
      )
      .limit(1)
  );
  return rows.at(0) ?? null;
});
