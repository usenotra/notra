import { getToolName, isToolUIPart } from "ai";

import type {
  AssistantActivityStackItem,
  AssistantMessagePart,
  AssistantMessageSegment,
  AssistantPartRef,
  GroupAssistantMessagePartsOptions,
} from "@/types/chat-activity";
import {
  isSearchToolPart,
  isStackableSearchPart,
} from "@/utils/chat-search-activity";
import { isFailedToolOutput } from "@/utils/chat-tool-output";

function isSkippablePart(part: AssistantMessagePart): boolean {
  if (part.type === "step-start") {
    return true;
  }
  if (part.type === "text" && !part.text.trim()) {
    return true;
  }
  return false;
}

function isActivityPart(
  part: AssistantMessagePart,
  isStandaloneTool?: (part: AssistantMessagePart) => boolean
): boolean {
  if (part.type === "reasoning") {
    return true;
  }
  if (!isToolUIPart(part)) {
    return false;
  }
  return !isStandaloneTool?.(part);
}

export function groupAssistantMessageParts(
  parts: AssistantMessagePart[],
  options: GroupAssistantMessagePartsOptions = {}
): AssistantMessageSegment[] {
  const segments: AssistantMessageSegment[] = [];
  const activity: AssistantPartRef[] = [];

  parts.forEach((part, index) => {
    if (isSkippablePart(part)) {
      return;
    }
    if (isActivityPart(part, options.isStandaloneTool)) {
      activity.push({ part, index });
      return;
    }
    segments.push({
      kind: "standalone",
      startIndex: index,
      index,
      part,
    });
  });

  const first = activity[0];
  if (first) {
    segments.unshift({
      kind: "activity",
      startIndex: first.index,
      items: activity,
    });
  }
  return segments;
}

export function stackAssistantActivityItems(
  items: AssistantPartRef[]
): AssistantActivityStackItem[] {
  const stacked: AssistantActivityStackItem[] = [];
  let searches: AssistantPartRef[] = [];

  function flushSearches() {
    if (searches.length === 0) {
      return;
    }
    stacked.push({ kind: "searches", items: searches });
    searches = [];
  }

  for (const item of items) {
    if (isStackableSearchPart(item.part)) {
      searches.push(item);
      continue;
    }
    flushSearches();
    stacked.push({ kind: "part", part: item.part, index: item.index });
  }

  flushSearches();
  return stacked;
}

export function isAssistantActivityStreaming(
  isLoading: boolean,
  isLastActivity: boolean
): boolean {
  return isLoading && isLastActivity;
}

export function getAssistantActivityStep(
  parts: AssistantMessagePart[]
): string {
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index];
    if (!part || part.type === "step-start") {
      continue;
    }
    if (part.type === "text") {
      if (part.text.trim()) {
        return "Writing response";
      }
      continue;
    }
    if (part.type === "reasoning") {
      return "Thinking";
    }
    if (isToolUIPart(part)) {
      if (part.state === "approval-requested") {
        return "Waiting for approval";
      }
      if (
        part.state === "input-streaming" ||
        part.state === "input-available"
      ) {
        if (isSearchToolPart(part)) {
          return "Searching web";
        }
        return getToolName(part) === "code_mode"
          ? "Executing tools"
          : "Running tool";
      }
      return "Thinking";
    }
  }
  return "Thinking";
}

export function isAssistantActivityForceOpen(
  items: AssistantPartRef[]
): boolean {
  return items.some(({ part }) => {
    if (!isToolUIPart(part)) {
      return false;
    }
    if (part.state === "output-error") {
      return true;
    }
    return part.state === "output-available" && isFailedToolOutput(part.output);
  });
}
