import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

/** The QStash message that wakes one post's schedule at its due time. */
export const scheduledPublicationWakeSchema = z.object({
  postId: z.string().trim().min(1),
  dueAt: z.iso.datetime(),
});
export type ScheduledPublicationWake = z.infer<
  typeof scheduledPublicationWakeSchema
>;

/** The workflow step's call that publishes one claimed row. */
export const scheduledPublicationAttemptRequestSchema = z.object({
  scheduledPublicationId: z.string().trim().min(1),
  claimToken: z.string().trim().min(1),
});
