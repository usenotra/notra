"use client";

import { cn } from "cn";
import { useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

import {
  CLAUDE_CODE_EFFORTS,
  CLAUDE_CODE_MODES,
} from "../constants/claude-code";
import type { ClaudeCodePromptProps } from "../types/claude-code";

const KBD_CLASS =
  "font-claude-code text-claude-code-muted inline h-auto min-w-0 rounded-none bg-transparent p-0 text-[length:inherit] leading-[inherit] font-normal select-auto";

export const ClaudeCodePrompt = ({
  busy = false,
  className,
  defaultValue = "",
  effort = false,
  inputClassName,
  inputRef,
  mode = "manual",
  onChange,
  onKeyDown,
  onSend,
  onStop,
  placeholder,
  pullRequest,
  value,
  ...props
}: ClaudeCodePromptProps) => {
  const [draft, setDraft] = useState(defaultValue);
  const isControlled = value !== undefined;
  const text = isControlled ? value : draft;
  const isEmpty = text === "";
  const modeConfig = CLAUDE_CODE_MODES[mode];
  const effortConfig = effort ? CLAUDE_CODE_EFFORTS[effort] : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setDraft(event.target.value);
    }
    onChange?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && busy && onStop) {
      event.preventDefault();
      onStop();
    }
    onKeyDown?.(event);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || busy || !onSend) {
      return;
    }
    onSend(message);
    if (!isControlled) {
      setDraft("");
    }
  };

  return (
    <form
      className={cn(
        "font-claude-code text-claude-code-fg flex min-w-0 flex-col gap-5 text-[0.8125rem] leading-5",
        className
      )}
      data-slot="claude-code-prompt"
      onSubmit={handleSubmit}
      {...props}
    >
      <InputGroup className="border-claude-code-rule has-[[data-slot=input-group-control]:focus-visible]:border-claude-code-rule grid h-auto min-w-0 grid-cols-[2ch_minmax(0,1fr)] items-stretch rounded-none border-0 border-y bg-transparent py-1.5 has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent">
        <InputGroupAddon className="text-claude-code-strong order-none cursor-text justify-start p-0 text-[length:inherit] leading-[inherit] font-normal">
          <span aria-hidden="true">❯</span>
        </InputGroupAddon>
        <span className="relative flex min-w-0">
          <InputGroupInput
            aria-label="Message Claude Code"
            autoComplete="off"
            className={cn(
              "font-claude-code text-claude-code-strong placeholder:text-claude-code-muted caret-claude-code-strong h-auto p-0 text-[length:inherit] leading-[inherit] transition-none md:text-[length:inherit]",
              isEmpty && "caret-transparent",
              inputClassName
            )}
            enterKeyHint="send"
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef}
            spellCheck={false}
            type="text"
            value={text}
          />
          {isEmpty && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[1ch] bg-white mix-blend-difference"
            />
          )}
        </span>
      </InputGroup>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-[2ch] pl-[2ch]">
        <p className="text-claude-code-muted min-w-0">
          <span className={modeConfig.className}>{modeConfig.label}</span>
          {modeConfig.cycles && (
            <>
              {" ("}
              <Kbd className={KBD_CLASS}>shift+tab</Kbd>
              {" to cycle)"}
            </>
          )}
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
    </form>
  );
};
