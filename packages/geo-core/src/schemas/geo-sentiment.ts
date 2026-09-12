import { object, string } from "zod";

import { geoTimeseriesInputSchema } from "./geo";

export const geoSentimentCursorSchema = object({
  capturedAt: string().datetime(),
  id: string().min(1).max(256),
  projectId: string().min(1).nullable(),
  scope: string().max(2048),
});

export const geoSentimentEvidenceInputSchema = geoTimeseriesInputSchema
  .extend({
    cursor: geoSentimentCursorSchema.optional(),
  })
  .refine(
    (input) =>
      !input.cursor ||
      input.cursor.scope ===
        JSON.stringify([
          input.organizationId,
          input.projectId ?? null,
          input.from ?? null,
          input.to ?? null,
          input.days ?? null,
        ]),
    {
      message: "Cursor does not match the selected scope or time window",
      path: ["cursor"],
    }
  );
