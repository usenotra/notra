import { CREATE_POST_TOOL_NAMES } from "../constants/post-tools";

export type CreatePostToolName =
  (typeof CREATE_POST_TOOL_NAMES)[keyof typeof CREATE_POST_TOOL_NAMES];

export type MarkdownCreatePostToolName = Exclude<
  CreatePostToolName,
  typeof CREATE_POST_TOOL_NAMES.image
>;

const MARKDOWN_CREATE_POST_TOOL_NAMES = new Set<string>(
  Object.values(CREATE_POST_TOOL_NAMES).filter(
    (name) => name !== CREATE_POST_TOOL_NAMES.image
  )
);

export function getCreatePostToolName(contentType: string): string {
  return (
    CREATE_POST_TOOL_NAMES[
      contentType as keyof typeof CREATE_POST_TOOL_NAMES
    ] ?? "createPost"
  );
}

export function isCreatePostToolName(
  toolName: string
): toolName is MarkdownCreatePostToolName {
  return MARKDOWN_CREATE_POST_TOOL_NAMES.has(toolName);
}
