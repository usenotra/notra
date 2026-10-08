import { number, string } from "zod";

import { geoOrganizationInputSchema } from "./geo-scope";

export const geoScanRunsInputSchema = geoOrganizationInputSchema.extend({
  offset: number().int().min(0).max(100_000).default(0),
});

export const geoScanRunInputSchema = geoOrganizationInputSchema.extend({
  pendingOffset: number().int().min(0).max(100_000).optional(),
  /** Omit to load the newest scan in the project. */
  scanId: string().min(1).optional(),
  offset: number().int().min(0).max(100_000).default(0),
  engine: string().min(1).optional(),
});
