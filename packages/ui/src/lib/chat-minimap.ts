import type { ChatMinimapPayload } from "@notra/ui/types/chat-minimap";

export const isChatMinimapPayload = (
  value: unknown
): value is ChatMinimapPayload =>
  typeof value === "object" && value !== null && "title" in value;
