import { CREATE_POST_TOOL_NAMES } from "../constants/post-tools";
import type { ContentType } from "../schemas/content";

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

export function getCreatePostToolName(
  contentType: ContentType
): (typeof CREATE_POST_TOOL_NAMES)[ContentType] {
  return CREATE_POST_TOOL_NAMES[contentType];
}

export function isCreatePostToolName(
  toolName: string
): toolName is MarkdownCreatePostToolName {
  return MARKDOWN_CREATE_POST_TOOL_NAMES.has(toolName);
}
