import "zod/compile";
import { z } from "@hono/zod-openapi";

export const publicStatusResponseSchema = z
  .object({
    status: z.literal("ok"),
    service: z.literal("Notra API"),
    version: z.string(),
    public: z.literal(true),
    authentication: z.object({
      type: z.literal("bearer"),
      resource_metadata: z.string().url(),
      guide: z.string().url(),
    }),
  })
  .openapi("PublicStatusResponse");
