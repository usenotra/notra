import { z } from "zod";

export const contentTaskInputSchema = z.object({
  message: z.string().min(1),
});
