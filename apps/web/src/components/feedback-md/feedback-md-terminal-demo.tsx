import { ClaudeCodeHeader } from "@notra/ui/components/ai-skins/claude-code/claude-code-header";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import { ClaudeCodePrompt } from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import { ClaudeCodeTurnSummary } from "@notra/ui/components/ai-skins/claude-code/claude-code-status";
import { ClaudeCodeTodoList } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";
import { ClaudeCodeToolCall } from "@notra/ui/components/ai-skins/claude-code/claude-code-tool-call";

import {
  FEEDBACK_MD_TERMINAL_ASSISTANT_MESSAGE,
  FEEDBACK_MD_TERMINAL_HEADER,
  FEEDBACK_MD_TERMINAL_PROMPT_PLACEHOLDER,
  FEEDBACK_MD_TERMINAL_RESULT_MESSAGE,
  FEEDBACK_MD_TERMINAL_TITLE,
  FEEDBACK_MD_TERMINAL_TODOS,
  FEEDBACK_MD_TERMINAL_TOOL_CALLS,
  FEEDBACK_MD_TERMINAL_TURN_SUMMARY,
  FEEDBACK_MD_TERMINAL_USER_MESSAGE,
} from "@/lib/feedback-md/constants";

export function FeedbackMdTerminalDemo() {
  return (
    <div className="flex w-full flex-col overflow-clip rounded-[1.25rem] bg-[#0f0f0f] [box-shadow:#28282833_0rem_1.5rem_3.5rem_-1rem]">
      <div className="relative flex items-center justify-center bg-[#1c1c1c] px-4.5 py-3">
        <div className="absolute left-4.5 flex items-center gap-1.5">
          <div className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]" />
          <div className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]" />
          <div className="size-2.5 shrink-0 rounded-full bg-[#3a3a3a]" />
        </div>
        <span className="font-mono text-[0.75rem] leading-4 text-[#FFFFFF66]">
          {FEEDBACK_MD_TERMINAL_TITLE}
        </span>
      </div>
      <div className="flex flex-col gap-5 px-3 py-4 sm:px-5 sm:py-5">
        <ClaudeCodeHeader {...FEEDBACK_MD_TERMINAL_HEADER} />
        <ClaudeCodeMessage from="user">
          {FEEDBACK_MD_TERMINAL_USER_MESSAGE}
        </ClaudeCodeMessage>
        <ClaudeCodeMessage>
          {FEEDBACK_MD_TERMINAL_ASSISTANT_MESSAGE}
        </ClaudeCodeMessage>
        <ClaudeCodeTodoList todos={FEEDBACK_MD_TERMINAL_TODOS} />
        {FEEDBACK_MD_TERMINAL_TOOL_CALLS.map((call) => (
          <ClaudeCodeToolCall
            arg={call.arg}
            key={call.tool}
            result={call.result}
            status={call.status}
            tool={call.tool}
          />
        ))}
        <ClaudeCodeMessage>
          {FEEDBACK_MD_TERMINAL_RESULT_MESSAGE}
        </ClaudeCodeMessage>
        <ClaudeCodeTurnSummary {...FEEDBACK_MD_TERMINAL_TURN_SUMMARY} />
        <ClaudeCodePrompt
          className="mt-1"
          mode="bypass"
          placeholder={FEEDBACK_MD_TERMINAL_PROMPT_PLACEHOLDER}
        />
      </div>
    </div>
  );
}
