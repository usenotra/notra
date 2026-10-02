import { z } from "zod";

export const marketingChatOgQuerySchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
});
