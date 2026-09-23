import {
  CpuIcon,
  File01Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

export function getChatToolIcon(toolName: string) {
  if (toolName === "editMarkdown") {
    return SourceCodeIcon;
  }
  if (toolName === "getMarkdown") {
    return File01Icon;
  }
  return CpuIcon;
}
