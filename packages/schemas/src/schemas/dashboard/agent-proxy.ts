import "zod/compile";
import { z } from "zod";

const AGENT_MESSAGE_MAX_LENGTH = 200_000;

export const agentProxyCreateSessionSchema = z.object({
  message: z.string().min(1).max(AGENT_MESSAGE_MAX_LENGTH),
});

export const agentProxyFollowUpSchema = z
  .object({
    message: z.string().min(1).max(AGENT_MESSAGE_MAX_LENGTH).optional(),
    inputResponses: z
      .array(
        z.object({
          requestId: z.string().min(1),
          optionId: z.string().min(1),
        })
      )
      .optional(),
    continuationToken: z.string().optional(),
  })
  .refine(
    (body) => Boolean(body.message || body.inputResponses?.length),
    "Provide a message or inputResponses"
  );
