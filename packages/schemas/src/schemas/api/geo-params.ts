import "zod/compile";
import { z } from "@hono/zod-openapi";

import { createGeoShortTextSchema } from "./geo-fields";
import { resourceIdSchema } from "./ids";

export const projectParamsSchema = z.object({
  projectId: resourceIdSchema("projectId").openapi({
    param: { name: "projectId", in: "path" },
    example: "b1f2c3d4-0000-4000-8000-000000000000",
  }),
});

export const promptParamsSchema = projectParamsSchema.extend({
  promptId: resourceIdSchema("promptId").openapi({
    param: { name: "promptId", in: "path" },
  }),
});

export const sequenceParamsSchema = projectParamsSchema.extend({
  sequenceId: resourceIdSchema("sequenceId").openapi({
    param: { name: "sequenceId", in: "path" },
  }),
});

export const scanParamsSchema = projectParamsSchema.extend({
  scanId: resourceIdSchema("scanId").openapi({
    param: { name: "scanId", in: "path" },
  }),
});

export const competitorParamsSchema = projectParamsSchema.extend({
  name: createGeoShortTextSchema().openapi({
    param: { name: "name", in: "path" },
    description: "Competitor name. Matched case-insensitively.",
  }),
});
