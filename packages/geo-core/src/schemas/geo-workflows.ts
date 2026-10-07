import { array, iso, object, string } from "zod";

import { GEO_MAX_ENGINES, GEO_SHORT_FIELD_MAX_LENGTH } from "../constants/geo";
import { geoOrganizationInputSchema } from "./geo-scope";

/**
 * Payload of the GEO scan workflow.
 *
 * `claimedAt` is the ISO stamp of the scan-slot claim the trigger took before
 * handing off, and it travels as its own field rather than on
 * `geoOrganizationInputSchema` — a dozen unrelated inputs extend that one, and
 * none of them owns a scan claim. Optional so a workflow queued before the
 * token existed still parses; such a run falls back to the unconditional
 * stamps.
 *
 * `scanId` is the `geo_scans` row the trigger already inserted so its caller
 * could be handed a pollable id. The run adopts it instead of creating a row
 * of its own. Optional: the scheduled sweep starts a run with nobody waiting
 * on an id, and so does any workflow queued before this field existed.
 */
export const geoScanWorkflowPayloadSchema = geoOrganizationInputSchema
  .extend({
    claimedAt: iso.datetime().optional(),
    scanId: string().min(1).optional(),
    promptIds: array(string().min(1)).min(1).optional(),
    engines: array(string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
      .min(1)
      .max(GEO_MAX_ENGINES)
      .optional(),
  })
  .refine(
    (value) =>
      value.projectId !== undefined ||
      (value.claimedAt === undefined && value.scanId === undefined),
    { message: "A scan claim or scan id requires projectId" }
  )
  .refine(
    (value) => value.scanId === undefined || value.claimedAt !== undefined,
    { message: "A pre-created scan id requires claimedAt" }
  );

export const geoWriterWorkflowPayloadSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1),
  briefId: string().min(1),
  runId: string().min(1),
});
