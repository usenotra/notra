import { z } from "zod/v4";

export const chatStreamResumeSchema = z.object({
  streamId: z
    .string()
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/)
    .nullable(),
  cursor: z
    .string()
    .max(64)
    .regex(/^\d+-\d+:\d+$/)
    .refine((cursor) => Number.isSafeInteger(Number(cursor.split("-")[0])))
    .nullable(),
});
