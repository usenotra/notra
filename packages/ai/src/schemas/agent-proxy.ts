import { z } from "zod";

export const createSessionResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().min(1),
});
