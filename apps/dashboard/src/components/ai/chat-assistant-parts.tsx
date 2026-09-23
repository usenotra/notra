"use client";

import { isToolUIPart } from "ai";
import { Fragment } from "react";

import {
  ChatActivityGroup,
  ChatSearchStack,
} from "@/components/ai/chat-activity-group";
import { ChatReasoningBlock } from "@/components/ai/chat-reasoning-block";
import type { ChatAssistantPartsProps } from "@/types/components/chat-activity-group";
import {
  groupAssistantMessageParts,
  isAssistantActivityForceOpen,
  isAssistantActivityStreaming,
  stackAssistantActivityItems,
} from "@/utils/group-assistant-message-parts";

export function ChatAssistantParts({
  durationMs,
  isLoading,
  isStandaloneTool,
  messageId,
  parts,
  renderStandalone,
  renderTool,
}: ChatAssistantPartsProps) {
  const segments = groupAssistantMessageParts(parts, { isStandaloneTool });
  const activityCount = segments.filter(
    (segment) => segment.kind === "activity"
  ).length;
  const lastSegmentIndex = segments.length - 1;

  return segments.map((segment, segmentIndex) => {
    if (segment.kind === "standalone") {
      if (isToolUIPart(segment.part)) {
        return (
          <Fragment key={`${messageId}-standalone-tool-${segment.index}`}>
            {renderTool(segment.part, segment.index)}
          </Fragment>
        );
      }
      return (
        <Fragment key={`${messageId}-standalone-${segment.index}`}>
          {renderStandalone(segment.part, segment.index)}
        </Fragment>
      );
    }

    const isStreaming = isAssistantActivityStreaming(
      isLoading,
      segmentIndex === lastSegmentIndex
    );
    const forceOpen = isAssistantActivityForceOpen(segment.items);

    return (
      <ChatActivityGroup
        durationMs={activityCount === 1 ? durationMs : undefined}
        forceOpen={forceOpen}
        groupId={`${messageId}-${segment.startIndex}`}
        isStreaming={isStreaming}
        key={`${messageId}-activity-${segment.startIndex}`}
      >
        {stackAssistantActivityItems(segment.items).map((item) => {
          if (item.kind === "searches") {
            return (
              <ChatSearchStack
                items={item.items.flatMap(({ part }) =>
                  isToolUIPart(part)
                    ? [
                        {
                          input: part.input,
                          output: part.output,
                          state: part.state,
                          toolCallId: part.toolCallId,
                        },
                      ]
                    : []
                )}
                key={`${messageId}-searches-${item.items[0]?.index}`}
              />
            );
          }

          if (item.part.type === "reasoning") {
            return (
              <ChatReasoningBlock
                isStreaming={isLoading && item.part.state === "streaming"}
                key={`${messageId}-reasoning-${item.index}`}
              >
                {item.part.text}
              </ChatReasoningBlock>
            );
          }

          if (isToolUIPart(item.part)) {
            return (
              <Fragment key={`${messageId}-tool-${item.index}`}>
                {renderTool(item.part, item.index)}
              </Fragment>
            );
          }

          return null;
        })}
      </ChatActivityGroup>
    );
  });
}
