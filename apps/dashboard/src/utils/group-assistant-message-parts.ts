import type { ChatMessageMetadata } from "@notra/ai/types/chat";
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

export function getActivityGroupDuration(
  items: AssistantPartRef[],
  parts: AssistantMessagePart[],
  timings: ChatMessageMetadata["activityTimings"]
): number | undefined {
  if (!timings || items.length === 0) {
    return undefined;
  }
  let startedAt = Number.POSITIVE_INFINITY;
  let finishedAt = 0;
  for (const { part, index } of items) {
    const key = isToolUIPart(part)
      ? `tool:${part.toolCallId}`
      : `reasoning:${parts.slice(0, index).filter((item) => item.type === "reasoning").length}`;
    const span = timings[key];
    if (!span || span.finishedAt === undefined) {
      return undefined;
    }
    startedAt = Math.min(startedAt, span.startedAt);
    finishedAt = Math.max(finishedAt, span.finishedAt);
  }
  return Math.max(0, finishedAt - startedAt);
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
