"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

import { ClaudeCodeHeader } from "../components/claude-code-header";
import { ClaudeCodeMessage } from "../components/claude-code-message";
import { ClaudeCodePrompt } from "../components/claude-code-prompt";
import {
  ClaudeCodeSpinner,
  ClaudeCodeTurnSummary,
} from "../components/claude-code-status";
import { ClaudeCodeTerminal } from "../components/claude-code-terminal";
import { ClaudeCodeTodoList } from "../components/claude-code-todo-list";
import {
  ClaudeCodeToolCall,
  ClaudeCodeToolSummary,
} from "../components/claude-code-tool-call";
import { CLAUDE_CODE_MODE_ORDER } from "../constants/claude-code";
import { CLAUDE_CODE_SESSION } from "../constants/claude-code-session";
import type { ClaudeCodeMode } from "../types/claude-code";

const nextMode = (current: ClaudeCodeMode) => {
  const index = CLAUDE_CODE_MODE_ORDER.indexOf(current);
  return CLAUDE_CODE_MODE_ORDER[(index + 1) % CLAUDE_CODE_MODE_ORDER.length];
};

export default function ClaudeCodeDemo() {
  const { header, pending, promptPlaceholder, pullRequest, title, turns } =
    CLAUDE_CODE_SESSION;
  const [mode, setMode] = useState<ClaudeCodeMode>("bypass");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      setMode(nextMode);
    }
  };

  return (
    <ClaudeCodeTerminal
      className="h-170"
      footer={
        <ClaudeCodePrompt
          mode={mode}
          onKeyDown={handleKeyDown}
          placeholder={promptPlaceholder}
          pullRequest={pullRequest}
        />
      }
      title={title}
    >
      <ClaudeCodeHeader {...header} />
      {turns.map((turn) => (
        <div className="flex flex-col gap-5" key={turn.id}>
          <ClaudeCodeMessage from="user">{turn.prompt}</ClaudeCodeMessage>
          <ClaudeCodeToolSummary count={turn.commands.length}>
            {turn.commands.map((command) => (
              <ClaudeCodeToolCall
                arg={command.arg}
                key={command.id}
                result={command.result}
                status={command.status}
                tool={command.tool}
              />
            ))}
          </ClaudeCodeToolSummary>
          <ClaudeCodeMessage>{turn.answer}</ClaudeCodeMessage>
          <ClaudeCodeTurnSummary {...turn.summary} />
        </div>
      ))}
      <ClaudeCodeMessage from="user">{pending.prompt}</ClaudeCodeMessage>
      <ClaudeCodeTodoList todos={pending.todos} />
      <ClaudeCodeToolCall
        result={pending.toolCall.result}
        status={pending.toolCall.status}
        tool={pending.toolCall.tool}
      />
      <ClaudeCodeSpinner {...pending.spinner} />
    </ClaudeCodeTerminal>
  );
}
