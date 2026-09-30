"use client";

import { cn } from "cn";
import { useState } from "react";
import type { ChangeEvent } from "react";

import {
  CLAUDE_CODE_EFFORTS,
  CLAUDE_CODE_MODES,
} from "../constants/claude-code";
import type { ClaudeCodePromptProps } from "../types/claude-code";

export const ClaudeCodePrompt = ({
  className,
  defaultValue = "",
  effort = false,
  inputClassName,
  inputRef,
  mode = "manual",
  onChange,
  onKeyDown,
  placeholder,
  pullRequest,
  value,
  ...props
}: ClaudeCodePromptProps) => {
  const [draft, setDraft] = useState(defaultValue);
  const isControlled = value !== undefined;
  const isEmpty = (isControlled ? value : draft) === "";
  const modeConfig = CLAUDE_CODE_MODES[mode];
  const effortConfig = effort ? CLAUDE_CODE_EFFORTS[effort] : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setDraft(event.target.value);
    }
    onChange?.(event);
  };

  return (
    <div
      className={cn(
        "font-claude-code text-claude-code-fg flex min-w-0 flex-col gap-5 text-[0.8125rem] leading-5",
        className
      )}
      data-slot="claude-code-prompt"
      {...props}
    >
      <label className="border-claude-code-rule grid min-w-0 cursor-text grid-cols-[2ch_minmax(0,1fr)] border-y py-1.5">
        <span
          aria-hidden="true"
          className="text-claude-code-strong select-none"
        >
          ❯
        </span>
        <span className="relative flex min-w-0">
          <input
            aria-label="Message Claude Code"
            className={cn(
              "font-claude-code text-claude-code-strong placeholder:text-claude-code-muted caret-claude-code-strong w-full min-w-0 bg-transparent p-0 outline-none",
              isEmpty && "caret-transparent",
              inputClassName
            )}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={inputRef}
            spellCheck={false}
            type="text"
            value={isControlled ? value : draft}
          />
          {isEmpty && (
            <span
              aria-hidden="true"
              className="bg-claude-code-strong pointer-events-none absolute inset-y-0 left-0 w-[1ch] mix-blend-difference"
            />
          )}
        </span>
      </label>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-[2ch] pl-[2ch]">
        <p className="text-claude-code-muted min-w-0">
          <span className={modeConfig.className}>{modeConfig.label}</span>
          {modeConfig.cycles && " (shift+tab to cycle)"}
          {pullRequest && (
            <>
              {" · PR "}
              <a
                className="text-claude-code-pr underline underline-offset-2"
                href={pullRequest.href ?? "#"}
              >
                #{pullRequest.number}
              </a>
            </>
          )}
        </p>
        {effortConfig && (
          <p className={cn("shrink-0", effortConfig.className)}>
            {effortConfig.glyph} {effort} · /effort
          </p>
        )}
      </div>
    </div>
  );
};
