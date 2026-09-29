"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

import { ClaudeCodeHeader } from "../components/claude-code-header";
import { ClaudeCodeMessage } from "../components/claude-code-message";
import { ClaudeCodePrompt } from "../components/claude-code-prompt";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { ClaudeCodeThinking } from "../components/claude-code-thinking";
import { ClaudeCodeTodoList } from "../components/claude-code-todo-list";
import { ClaudeCodeToolCall } from "../components/claude-code-tool-call";
import { CLAUDE_CODE_MODE_ORDER } from "../constants/claude-code";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";
import type { ClaudeCodeMode } from "../types/claude-code";

const nextMode = (current: ClaudeCodeMode) => {
  const index = CLAUDE_CODE_MODE_ORDER.indexOf(current);
  return CLAUDE_CODE_MODE_ORDER[(index + 1) % CLAUDE_CODE_MODE_ORDER.length];
};

export default function ClaudeCodeDemo() {
  const session = CLAUDE_CODE_SESSION;
  const [mode, setMode] = useState<ClaudeCodeMode>("auto");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      setMode(nextMode);
    }
  };

  return (
    <ClaudeCodeTerminal className="h-150" title={session.title}>
      <ClaudeCodeHeader {...session.header} variant="compact" />
      <ClaudeCodeMessage className="mt-1 rounded-sm px-2.5 py-1.5" from="user">
        {session.userMessage}
      </ClaudeCodeMessage>
      {session.thinking ? (
        <ClaudeCodeThinking>{session.thinking}</ClaudeCodeThinking>
      ) : null}
      <ClaudeCodeMessage>{session.assistantMessage}</ClaudeCodeMessage>
      <ClaudeCodeTodoList todos={session.todos} />
      <div className="flex flex-col gap-[1.125rem]">
        {session.toolCalls.map((call) => (
          <ClaudeCodeToolCall
            arg={call.arg}
            key={call.id}
            result={call.result}
            status={call.status}
            tool={call.tool}
          >
            {call.detail}
          </ClaudeCodeToolCall>
        ))}
      </div>
      <ClaudeCodeMessage>{session.resultMessage}</ClaudeCodeMessage>
      <ClaudeCodePrompt
        className="mt-1"
        effort="xhigh"
        mode={mode}
        pullRequest={{ number: 1317 }}
        onKeyDown={handleKeyDown}
        placeholder={session.promptPlaceholder}
      />
    </ClaudeCodeTerminal>
  );
}
