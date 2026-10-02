import { z } from "zod";

export const turnstileTokenSchema = z.string().min(1).max(2048);

export const turnstileVerificationSchema = z.object({
  success: z.literal(true),
  action: z.string(),
  hostname: z.string(),
});
