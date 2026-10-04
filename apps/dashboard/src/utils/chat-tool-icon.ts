import { CpuIcon } from "@hugeicons/core-free-icons";

import { CHAT_TOOL_ICONS } from "@/constants/chat-tool-icons";

export function getChatToolIcon(toolName: string) {
  return Object.hasOwn(CHAT_TOOL_ICONS, toolName)
    ? (CHAT_TOOL_ICONS[toolName] ?? CpuIcon)
    : CpuIcon;
}
