import { geoMentionChecks, geoScans } from "@notra/db/schema";

import type { GeoScopeInput } from "../../src/types/geo";
import { SCAN_CHECK } from "../constants/scan-suggestions";
import { testDb } from "./database";

export async function seedScanQuery(
  scope: GeoScopeInput & { projectId: string },
  overrides: Partial<typeof geoMentionChecks.$inferInsert> = {},
  status: "running" | "completed" | "failed" = "completed"
) {
  const scanId = overrides.scanId ?? SCAN_CHECK.scanId;
  await testDb
    .insert(geoScans)
    .values({ id: scanId, ...scope, status })
    .onConflictDoNothing();
  const [check] = await testDb
    .insert(geoMentionChecks)
    .values({
      ...SCAN_CHECK,
      ...scope,
      mentioned: false,
      capturedAt: new Date(),
      ...overrides,
      scanId,
    })
    .returning();
  if (!check) {
    throw new Error("Failed to seed check");
  }
  return check;
}
