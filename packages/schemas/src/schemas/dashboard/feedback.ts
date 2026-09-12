import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { FEEDBACK_MAX_MESSAGE_LENGTH } from "../../constants/dashboard/feedback";

export const feedbackSentimentSchema = z.enum([
  "sad_crying",
  "sad",
  "happy",
  "excited",
]);

export const submitFeedbackInputSchema = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_MAX_MESSAGE_LENGTH),
  sentiment: feedbackSentimentSchema.optional(),
  organizationId: z.string().min(1).optional(),
  pageUrl: z.string().url().optional(),
});
