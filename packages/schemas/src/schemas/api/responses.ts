import "zod/compile";
import { z } from "@hono/zod-openapi";

export const rateLimitResponseSchema = z
  .object({
    error: z.string(),
    limit: z.number().int().min(1),
    remaining: z.number().int().min(0),
    reset: z.number().int(),
  })
  .openapi("RateLimitErrorResponse");
