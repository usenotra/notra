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
  getAssistantActivityStep,
  groupAssistantMessageParts,
  isAssistantActivityForceOpen,
  isAssistantActivityStreaming,
  stackAssistantActivityItems,
} from "@/utils/group-assistant-message-parts";

export function ChatAssistantParts({
  durationMs,
  elapsedSeconds,
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
  const lastActivityIndex = segments.findLastIndex(
    (segment) => segment.kind === "activity"
  );

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
      segmentIndex === lastActivityIndex
    );
    const forceOpen = isAssistantActivityForceOpen(segment.items);
    const details = stackAssistantActivityItems(segment.items)
      .map((item) => {
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
          return item.part.text.trim() ? (
            <ChatReasoningBlock key={`${messageId}-reasoning-${item.index}`}>
              {item.part.text}
            </ChatReasoningBlock>
          ) : null;
        }
        if (isToolUIPart(item.part)) {
          const tool = renderTool(item.part, item.index);
          return tool == null || tool === false ? null : (
            <Fragment key={`${messageId}-tool-${item.index}`}>{tool}</Fragment>
          );
        }
        return null;
      })
      .filter((detail) => detail !== null);

    return (
      <ChatActivityGroup
        durationMs={activityCount === 1 ? durationMs : undefined}
        elapsedSeconds={
          segmentIndex === lastActivityIndex ? elapsedSeconds : undefined
        }
        forceOpen={forceOpen}
        groupId={`${messageId}-${segment.startIndex}`}
        hasDetails={details.length > 0}
        isLoading={isLoading}
        isStreaming={isStreaming}
        step={getAssistantActivityStep(parts)}
        key={`${messageId}-activity-${segment.startIndex}`}
      >
        {details}
      </ChatActivityGroup>
    );
  });
}
