"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { ClaudeCodeHeader } from "../components/claude-code-header";
import { ClaudeCodeMessage } from "../components/claude-code-message";
import { ClaudeCodePrompt } from "../components/claude-code-prompt";
import {
  ClaudeCodeInterrupted,
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
import {
  CLAUDE_CODE_REPLIES,
  CLAUDE_CODE_SESSION,
} from "../constants/claude-code-session";
import { useClaudeCodeChat } from "../hooks/use-claude-code-chat";
import type { ClaudeCodeChatTurn, ClaudeCodeMode } from "../types/claude-code";

/** How close to the bottom still counts as following the transcript. */
const FOLLOW_THRESHOLD_PX = 48;

const nextMode = (current: ClaudeCodeMode) => {
  const index = CLAUDE_CODE_MODE_ORDER.indexOf(current);
  return CLAUDE_CODE_MODE_ORDER[(index + 1) % CLAUDE_CODE_MODE_ORDER.length];
};

const ClaudeCodeTurn = ({ turn }: { turn: ClaudeCodeChatTurn }) => {
  const toolCalls = turn.commands.map((command) => (
    <ClaudeCodeToolCall
      arg={command.arg}
      key={command.id}
      result={command.result}
      status={command.status}
      tool={command.tool}
    >
      {command.detail}
    </ClaudeCodeToolCall>
  ));
  // Claude Code folds finished shell commands into one "Ran N" line.
  const foldsShell =
    turn.status === "done" &&
    turn.commands.length > 0 &&
    turn.commands.every((command) => command.tool === "Bash");

  return (
    <div className="flex flex-col gap-5">
      <ClaudeCodeMessage from="user">{turn.prompt}</ClaudeCodeMessage>
      {turn.todos && <ClaudeCodeTodoList todos={turn.todos} />}
      {foldsShell ? (
        <ClaudeCodeToolSummary count={turn.commands.length}>
          {toolCalls}
        </ClaudeCodeToolSummary>
      ) : (
        toolCalls
      )}
      {turn.answer && <ClaudeCodeMessage>{turn.answer}</ClaudeCodeMessage>}
      {turn.status === "interrupted" && <ClaudeCodeInterrupted />}
      {turn.summary && <ClaudeCodeTurnSummary {...turn.summary} />}
    </div>
  );
};

export default function ClaudeCodeDemo() {
  const { header, pending, promptPlaceholder, pullRequest, title, turns } =
    CLAUDE_CODE_SESSION;
  const chat = useClaudeCodeChat(turns, CLAUDE_CODE_REPLIES);
  const [mode, setMode] = useState<ClaudeCodeMode>("bypass");
  const terminalRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(false);
  const activeTurn = chat.busy ? chat.turns.at(-1) : undefined;

  // Follow new output only while the reader sits at the bottom, so
  // scrolling up to reread a turn is not undone by the next streamed word.
  // Sending always jumps back down. Scrolling the viewport directly (not
  // scrollIntoView) keeps the host page still.
  const viewportOf = () =>
    terminalRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );

  useEffect(() => {
    const viewport = viewportOf();
    if (!viewport) {
      return;
    }
    const handleScroll = () => {
      followRef.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
        FOLLOW_THRESHOLD_PX;
    };
    handleScroll();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!followRef.current) {
      return;
    }
    const viewport = viewportOf();
    viewport?.scrollTo({ top: viewport.scrollHeight });
  }, [chat.turns, chat.busy]);

  const handleSend = (text: string) => {
    followRef.current = true;
    return chat.send(text);
  };

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
          busy={chat.busy}
          mode={mode}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          onStop={chat.stop}
          placeholder={promptPlaceholder}
          pullRequest={pullRequest}
        />
      }
      ref={terminalRef}
      title={title}
    >
      <ClaudeCodeHeader {...header} />
      {chat.turns.map((turn) => (
        <ClaudeCodeTurn key={turn.id} turn={turn} />
      ))}
      {activeTurn && (
        <ClaudeCodeSpinner
          details={
            activeTurn.status === "working"
              ? ["thinking", "esc to interrupt"]
              : ["esc to interrupt"]
          }
          elapsed={`${chat.elapsed}s`}
          tip={pending.spinner.tip}
          tokens={chat.tokens > 0 ? chat.tokens : undefined}
          verb={chat.spinnerVerb}
        />
      )}
    </ClaudeCodeTerminal>
  );
}
