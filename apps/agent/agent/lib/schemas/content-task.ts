import { z } from "zod";

export const contentTaskInputSchema = z.object({
  message: z.string().min(1),
  codeResearch: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Set only when the task is about one specific feature and a GitHub integration is connected: the feature description, the integrationId, and any pull request number, branch, commit, or time window. The code-researcher reads the repository first and its brief is handed to the writer. Omit for broad digests such as changelogs."
    ),
});
