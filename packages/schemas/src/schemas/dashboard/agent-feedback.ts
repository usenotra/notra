import "zod/compile";
import {
  AGENT_FEEDBACK_KINDS,
  AGENT_FEEDBACK_STATUSES,
} from "@notra/db/constants/agent-feedback";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
import { z } from "zod";

import { AGENT_FEEDBACK_PAGE_SIZE } from "../../constants/dashboard/agent-feedback";

export const agentFeedbackOrganizationInputSchema = z.object({
  organizationId: organizationIdSchema,
});

/** Longest window the activity chart may request, in days. */
export const AGENT_FEEDBACK_ACTIVITY_MAX_DAYS = 366;
const DAY_MS = 86_400_000;

export const agentFeedbackActivityInputSchema = z
  .object({
    organizationId: organizationIdSchema,
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine(({ from, to }) => from <= to, {
    message: "from must not be after to",
  })
  .refine(
    ({ from, to }) =>
      (Date.parse(to) - Date.parse(from)) / DAY_MS <
      AGENT_FEEDBACK_ACTIVITY_MAX_DAYS,
    { message: "Range is too long" }
  );

export const agentFeedbackItemInputSchema = z.object({
  organizationId: organizationIdSchema,
  feedbackId: z.string().min(1),
});

export const agentFeedbackListInputSchema = z.object({
  organizationId: organizationIdSchema,
  statuses: z
    .array(z.enum(AGENT_FEEDBACK_STATUSES))
    .min(1)
    .max(AGENT_FEEDBACK_STATUSES.length)
    .optional(),
  kind: z.enum(AGENT_FEEDBACK_KINDS).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(AGENT_FEEDBACK_PAGE_SIZE),
});

export const agentFeedbackUpdateStatusInputSchema =
  agentFeedbackItemInputSchema.extend({
    status: z.enum(AGENT_FEEDBACK_STATUSES),
  });
