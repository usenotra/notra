import { z } from "zod";

export const publicationSyncRepairSchema = z.object({
  organizationId: z.string().min(1),
  publicationId: z.string().min(1),
  postId: z.string().min(1),
  baselineHeadSha: z.string().nullable(),
  expectedHeadSha: z.string().min(1),
  commitSha: z.string().min(1),
  branch: z.string().min(1),
  markdown: z.string(),
  title: z.string().optional(),
  imageMapping: z
    .object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      path: z.string().min(1),
      headSha: z.string().min(1),
      markdown: z.string(),
    })
    .optional(),
});
