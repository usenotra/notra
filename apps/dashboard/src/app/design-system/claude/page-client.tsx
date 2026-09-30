"use client";

import {
  ClaudeCodeHeader,
  ClaudeCodeLogo,
} from "@notra/ui/components/ai-skins/claude-code/claude-code-header";
import { ClaudeCodeMessage } from "@notra/ui/components/ai-skins/claude-code/claude-code-message";
import {
  type ClaudeCodeEffort,
  type ClaudeCodeMode,
  ClaudeCodePrompt,
} from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import {
  ClaudeCodeSpinner,
  ClaudeCodeTurnSummary,
} from "@notra/ui/components/ai-skins/claude-code/claude-code-status";
import { ClaudeCodeTerminal } from "@notra/ui/components/ai-skins/claude-code/claude-code-terminal";
import { ClaudeCodeTodoList } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";
import {
  ClaudeCodeToolCall,
  ClaudeCodeToolSummary,
} from "@notra/ui/components/ai-skins/claude-code/claude-code-tool-call";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import {
  CLAUDE_STORY_EFFORTS,
  CLAUDE_STORY_MODES,
  CLAUDE_STORY_PROMPT_EFFORTS,
  CLAUDE_STORY_PROMPT_MODES,
  CLAUDE_STORY_SESSION,
  CLAUDE_STORY_TODO_STATES,
  CLAUDE_STORY_TOOL_STATUSES,
} from "@/constants/design-system-claude";

function nextItem<T>(items: readonly T[], current: T): T {
  const index = items.indexOf(current);
  return items[(index + 1) % items.length] ?? current;
}

function ClaudePromptPlayground() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ClaudeCodeMode>("auto");
  const [effort, setEffort] = useState<ClaudeCodeEffort>("xhigh");

  return (
    <div className="space-y-3">
      <ClaudeCodeTerminal title="claude — playground">
        <ClaudeCodePrompt
          effort={effort}
          mode={mode}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Tab" && event.shiftKey) {
              event.preventDefault();
              setMode((current) => nextItem(CLAUDE_STORY_MODES, current));
            }
          }}
          placeholder="Type here · Shift+Tab cycles mode"
          value={value}
        />
      </ClaudeCodeTerminal>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span>Effort</span>
        <div className="flex flex-wrap gap-2">
          {CLAUDE_STORY_EFFORTS.map((item) => (
            <button
              aria-pressed={item === effort}
              className={cn(
                "rounded-md px-2 py-1 font-mono transition-colors",
                item === effort
                  ? "bg-muted text-foreground"
                  : "hover:text-foreground"
              )}
              key={item}
              onClick={() => setEffort(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesignSystemClaudeCatalog() {
  const session = CLAUDE_STORY_SESSION;

  return (
    <>
      <section className="scroll-mt-10 space-y-6" id="claude-session">
        <DesignSystemSectionHeader
          description="Header, messages, todos, tool calls, and prompt in one Claude Code window."
          id="claude-session"
          title="Full session"
        />
        <ClaudeCodeTerminal title={session.title}>
          <ClaudeCodeHeader {...session.header} />
          <ClaudeCodeMessage from="user">
            {session.userMessage}
          </ClaudeCodeMessage>
          <ClaudeCodeToolSummary count={session.commands.length}>
            {session.commands.map((call) => (
              <ClaudeCodeToolCall
                arg={call.arg}
                key={call.id}
                result={call.result}
                tool={call.tool}
              />
            ))}
          </ClaudeCodeToolSummary>
          <ClaudeCodeMessage>{session.assistantMessage}</ClaudeCodeMessage>
          <ClaudeCodeTurnSummary {...session.summary} />
          <ClaudeCodeMessage from="user">
            {session.followUpMessage}
          </ClaudeCodeMessage>
          <ClaudeCodeTodoList todos={session.todos} />
          <ClaudeCodeToolCall
            result={session.pendingToolCall.result}
            status={session.pendingToolCall.status}
            tool={session.pendingToolCall.tool}
          />
          <ClaudeCodeSpinner {...session.spinner} />
          <ClaudeCodePrompt
            className="mt-2"
            mode="bypass"
            placeholder={session.promptPlaceholder}
            pullRequest={{ number: session.pullRequestNumber }}
          />
        </ClaudeCodeTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-header">
        <DesignSystemSectionHeader
          description="The pixel mascot next to version, model and working directory, then notices."
          id="claude-header"
          title="Header"
        />
        <ClaudeCodeTerminal title="claude — header">
          <ClaudeCodeLogo size={132} />
          <ClaudeCodeHeader {...session.header} />
        </ClaudeCodeTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-messages">
        <DesignSystemSectionHeader
          description="User turns sit on a full-width gray bar. Assistant turns start with a white bullet and render `code` and **bold**."
          id="claude-messages"
          title="Messages"
        />
        <ClaudeCodeTerminal title="claude — messages">
          <ClaudeCodeMessage from="user">
            {session.userMessage}
          </ClaudeCodeMessage>
          <ClaudeCodeMessage>{session.assistantMessage}</ClaudeCodeMessage>
        </ClaudeCodeTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-todos">
        <DesignSystemSectionHeader
          description="Done, in progress, and pending in the Claude Code todo glyph set."
          id="claude-todos"
          title="Todos"
        />
        <ClaudeCodeTerminal title="claude — todos">
          <ClaudeCodeTodoList todos={CLAUDE_STORY_TODO_STATES} />
        </ClaudeCodeTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-tools">
        <DesignSystemSectionHeader
          description="Success, running, error, an expandable Read result, and the collapsed shell summary."
          id="claude-tools"
          title="Tool calls"
        />
        <ClaudeCodeTerminal title="claude — tools">
          <div className="flex flex-col gap-5">
            {CLAUDE_STORY_TOOL_STATUSES.map((call) => (
              <ClaudeCodeToolCall
                arg={call.arg}
                defaultOpen={Boolean(call.detail)}
                key={call.id}
                result={call.result}
                status={call.status}
                tool={call.tool}
              >
                {call.detail}
              </ClaudeCodeToolCall>
            ))}
            <ClaudeCodeToolSummary count={session.commands.length}>
              {session.commands.map((call) => (
                <ClaudeCodeToolCall
                  arg={call.arg}
                  key={call.id}
                  result={call.result}
                  tool={call.tool}
                />
              ))}
            </ClaudeCodeToolSummary>
          </div>
        </ClaudeCodeTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-status">
        <DesignSystemSectionHeader
          description="The orange spinner while a turn runs and the dim summary once it is done."
          id="claude-status"
          title="Status"
        />
        <ClaudeCodeTerminal title="claude — status">
          <ClaudeCodeSpinner {...session.spinner} />
          <ClaudeCodeTurnSummary {...session.summary} />
        </ClaudeCodeTerminal>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-modes">
        <DesignSystemSectionHeader
          description="Permission modes. Shift+Tab is the Claude Code cycle."
          id="claude-modes"
          title="Prompt modes"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {CLAUDE_STORY_PROMPT_MODES.map((variant) => (
            <ClaudeCodeTerminal
              key={variant.id}
              title={`claude — ${variant.mode}`}
            >
              <ClaudeCodePrompt
                defaultValue=""
                effort={variant.effort}
                mode={variant.mode}
                placeholder={variant.mode}
              />
            </ClaudeCodeTerminal>
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-effort">
        <DesignSystemSectionHeader
          description="Effort sits on the right of the status line. Ultracode is orange."
          id="claude-effort"
          title="Prompt effort"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {CLAUDE_STORY_PROMPT_EFFORTS.map((variant) => (
            <ClaudeCodeTerminal
              key={variant.id}
              title={`claude — ${variant.effort}`}
            >
              <ClaudeCodePrompt
                defaultValue=""
                effort={variant.effort}
                mode={variant.mode}
                placeholder="/effort"
              />
            </ClaudeCodeTerminal>
          ))}
        </div>
      </section>

      <section className="scroll-mt-10 space-y-6" id="claude-playground">
        <DesignSystemSectionHeader
          description="Type into a live prompt. Shift+Tab cycles mode. Effort is below the window."
          id="claude-playground"
          title="Playground"
        />
        <ClaudePromptPlayground />
      </section>
    </>
  );
}
