import {
  createPostDraftFieldsSchema,
  createdPostToolOutputSchema,
} from "@notra/ai/schemas/post";
import { isCreatePostToolName } from "@notra/ai/utils/post-tool-name";

export function parseCreatePostDraft(input: unknown, toolName: string) {
  if (!isCreatePostToolName(toolName)) {
    return undefined;
  }

  const parsed = createPostDraftFieldsSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

export function parseCreatedPostId(output: unknown) {
  const parsed = createdPostToolOutputSchema.safeParse(output);
  return parsed.success ? parsed.data.postId : undefined;
}
