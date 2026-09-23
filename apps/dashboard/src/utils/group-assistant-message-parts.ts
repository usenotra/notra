import { isToolUIPart } from "ai";

import type {
  AssistantActivityStackItem,
  AssistantMessagePart,
  AssistantMessageSegment,
  AssistantPartRef,
  GroupAssistantMessagePartsOptions,
} from "@/types/chat-activity";
import { isSearchToolPart } from "@/utils/chat-search-activity";

function isSkippablePart(part: AssistantMessagePart): boolean {
  if (part.type === "step-start") {
    return true;
  }
  if (part.type === "text" && !part.text.trim()) {
    return true;
  }
  if (part.type === "reasoning" && !part.text.trim()) {
    return true;
  }
  return false;
}

function isActivityPart(
  part: AssistantMessagePart,
  isStandaloneTool?: (part: AssistantMessagePart) => boolean
): boolean {
  if (part.type === "reasoning") {
    return Boolean(part.text.trim());
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
  let activity: AssistantPartRef[] = [];

  function flushActivity() {
    const first = activity[0];
    if (!first) {
      return;
    }
    segments.push({
      kind: "activity",
      startIndex: first.index,
      items: activity,
    });
    activity = [];
  }

  parts.forEach((part, index) => {
    if (isSkippablePart(part)) {
      return;
    }
    if (isActivityPart(part, options.isStandaloneTool)) {
      activity.push({ part, index });
      return;
    }
    flushActivity();
    segments.push({
      kind: "standalone",
      startIndex: index,
      index,
      part,
    });
  });

  flushActivity();
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
    if (isSearchToolPart(item.part)) {
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
  items: AssistantPartRef[],
  isLoading: boolean
): boolean {
  if (!isLoading) {
    return false;
  }

  return items.some(({ part }) => {
    if (part.type === "reasoning") {
      return part.state === "streaming";
    }
    if (!isToolUIPart(part)) {
      return false;
    }
    return part.state === "input-streaming" || part.state === "input-available";
  });
}

export function isAssistantActivityAwaitingApproval(
  items: AssistantPartRef[]
): boolean {
  return items.some(
    ({ part }) => isToolUIPart(part) && part.state === "approval-requested"
  );
}
