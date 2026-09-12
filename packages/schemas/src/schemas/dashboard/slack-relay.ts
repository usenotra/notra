import "zod/compile";
import { z } from "zod";

export const slackPostMessageResponseSchema = z.looseObject({
  ok: z.boolean(),
  ts: z.string().optional(),
  error: z.string().optional(),
});

export const slackExternalChannelKeySchema = z
  .string()
  .regex(/^[^:]+:[^:]+:[^:]+$/u);

export const slackPermalinkResponseSchema = z.looseObject({
  ok: z.boolean(),
  permalink: z.string().optional(),
});

export const relaySlackApprovalSchema = z.object({
  requestId: z.string().min(1).max(200),
  approved: z.boolean(),
});

export const slackRepliesResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  messages: z
    .array(
      z.looseObject({
        ts: z.string(),
        bot_id: z.string().optional(),
        blocks: z
          .array(
            z.looseObject({
              elements: z
                .array(
                  z.looseObject({
                    action_id: z.string().optional(),
                    value: z.string().optional(),
                  })
                )
                .optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});
