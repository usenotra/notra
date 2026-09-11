import "zod/compile";
import { z } from "@hono/zod-openapi";

import { planBriefResponseSchema } from "./geo-content";
import { runSequenceResponseSchema } from "./geo-sequences";

/** Successful payload returned by the dashboard's sequence-run adapter. */
export const internalGeoSequenceRunResponseSchema =
  runSequenceResponseSchema.omit({ organization: true });

/** Successful payload returned by the dashboard's writer-plan adapter. */
export const internalGeoWriterPlanResponseSchema = planBriefResponseSchema.omit(
  {
    organization: true,
  }
);

const remoteGeoFailureSchema = z.object({
  _tag: z.string().min(1),
  message: z.string().optional(),
  limit: z.number().optional(),
  status: z.string().optional(),
});

/** Client-safe domain failure returned by an internal GEO adapter. */
export const remoteGeoFailureBodySchema = z.object({
  failure: remoteGeoFailureSchema,
});
