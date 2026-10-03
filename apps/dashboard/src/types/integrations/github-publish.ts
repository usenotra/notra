import type {
  contentInputSchema,
  publishContentToGitHubSchema,
} from "@notra/schemas/dashboard/content";
import type { z } from "zod";

export type PublishSavedContentInput = z.infer<typeof contentInputSchema> &
  z.infer<typeof publishContentToGitHubSchema>;
