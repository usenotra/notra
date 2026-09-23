import { getToolName, isToolUIPart } from "ai";

import { CONTENT_EDITOR_STANDALONE_TOOL_NAMES } from "@/constants/chat-activity";
import type { AssistantMessagePart } from "@/types/chat-activity";

const STANDALONE_TOOL_NAMES = new Set<string>(
  CONTENT_EDITOR_STANDALONE_TOOL_NAMES
);

export function isContentEditorStandaloneTool(
  part: AssistantMessagePart
): boolean {
  return isToolUIPart(part) && STANDALONE_TOOL_NAMES.has(getToolName(part));
}
