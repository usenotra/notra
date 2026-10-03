"use client";

import { getToolName } from "ai";

import { ChatSubagentBlock } from "@/components/ai/chat-subagent-block";
import { ChatToolBlock } from "@/components/ai/chat-tool-block";
import type { ChatSubagentToolPartProps } from "@/types/components/chat-subagent-block";
import {
  getChatSubagentErrorText,
  getChatSubagentSteps,
} from "@/utils/chat-subagents";

/**
 * Renders a subagent tool call, such as the code researcher, with its own
 * tool calls nested below. Shared by the chat page and the agent sidebar.
 */
export function ChatSubagentToolPart({
  part,
  isActive,
}: ChatSubagentToolPartProps) {
  // Preliminary outputs stream the subagent's steps while it still runs.
  const isPreliminary =
    part.state === "output-available" && part.preliminary === true;
  const output = part.state === "output-available" ? part.output : undefined;
  const steps = getChatSubagentSteps(output);

  return (
    <ChatSubagentBlock
      agentName={getToolName(part)}
      errorText={
        part.state === "output-error"
          ? part.errorText
          : getChatSubagentErrorText(output)
      }
      isActive={isActive}
      output={isPreliminary ? undefined : output}
      state={isPreliminary ? "input-available" : part.state}
      stepCount={steps.length > 0 ? steps.length : undefined}
      toolCallId={part.toolCallId}
    >
      {steps.length > 0
        ? steps.map((step) => (
            <ChatToolBlock
              input={step.input}
              isActive={isActive}
              key={step.toolCallId}
              output={
                step.state === "output-error"
                  ? { error: step.errorText }
                  : step.output
              }
              state={step.state}
              toolCallId={step.toolCallId}
              toolName={step.toolName}
            />
          ))
        : null}
    </ChatSubagentBlock>
  );
}
