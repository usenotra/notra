import { z } from "zod";

export const postGitHubSyncRequestSchema = z.object({
  organizationId: z.string().min(1),
  postId: z.string().min(1),
});

export const postGitHubSyncResponseSchema = z.object({
  success: z.literal(true),
});
