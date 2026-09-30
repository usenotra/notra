import { ClaudeCodeHeader } from "@notra/ui/components/ai-skins/claude-code/claude-code-header";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import { ClaudeCodePrompt } from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import { ClaudeCodeTurnSummary } from "@notra/ui/components/ai-skins/claude-code/claude-code-status";
import { ClaudeCodeTerminal } from "@notra/ui/components/ai-skins/claude-code/claude-code-terminal";
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
    <ClaudeCodeTerminal title={FEEDBACK_MD_TERMINAL_TITLE}>
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
    </ClaudeCodeTerminal>
  );
}
