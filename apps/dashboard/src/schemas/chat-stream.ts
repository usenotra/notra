import { z } from "zod/v4";

import { decodeChatStreamId } from "@/utils/chat-stream-id";

export const chatStreamResumeSchema = z.object({
  streamId: z
    .string()
    .transform((header, context) => {
      try {
        return decodeChatStreamId(header);
      } catch {
        context.addIssue({
          code: "custom",
          message: "Invalid stream ID encoding",
        });
        return z.NEVER;
      }
    })
    // Match the message ID accepted by uiMessageSchema on the chat POST route.
    .pipe(z.string().min(1).max(200))
    .nullable(),
  cursor: z
    .string()
    .max(64)
    .regex(/^\d+-\d+:\d+$/)
    .refine((cursor) =>
      cursor.split(/[-:]/).every((part) => Number.isSafeInteger(Number(part)))
    )
    .nullable(),
});
