import { number, string } from "zod";

import { geoOrganizationInputSchema } from "./geo";

export const geoScanRunsInputSchema = geoOrganizationInputSchema.extend({
  offset: number().int().min(0).max(100_000).default(0),
});

export const geoScanRunInputSchema = geoOrganizationInputSchema.extend({
  pendingOffset: number().int().min(0).max(100_000).optional(),
  scanId: string().min(1),
  offset: number().int().min(0).max(100_000).default(0),
  engine: string().min(1).optional(),
});
