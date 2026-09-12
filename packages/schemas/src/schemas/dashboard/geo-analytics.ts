import "zod/compile";
import {
  GEO_MAX_ENGINES,
  GEO_SHORT_FIELD_MAX_LENGTH,
} from "@notra/geo-core/constants/geo";
import { geoOrganizationInputSchema } from "@notra/geo-core/schemas/geo";
import { z } from "zod";

import { GEO_SCAN_TRIGGERS } from "../../constants/dashboard/geo-analytics";

export const geoScanTriggerSchema = z.enum(GEO_SCAN_TRIGGERS);

export const geoScanStartInputSchema = geoOrganizationInputSchema.extend({
  trigger: geoScanTriggerSchema.optional(),
  engines: z
    .array(z.string().min(1).max(GEO_SHORT_FIELD_MAX_LENGTH))
    .min(1)
    .max(GEO_MAX_ENGINES)
    .optional(),
});
