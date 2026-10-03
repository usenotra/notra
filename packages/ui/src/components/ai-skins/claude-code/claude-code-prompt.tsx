"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { cn } from "@notra/ui/lib/utils";
import type {
  ChangeEvent,
  ChangeEventHandler,
  KeyboardEventHandler,
  Ref,
} from "react";
import { useState } from "react";

export type ClaudeCodeMode =
  | "auto"
  | "manual"
  | "accept-edits"
  | "plan"
  | "bypass";

export type ClaudeCodeEffort =
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"
  | "ultracode";

const MODE_STATUS: Record<
  ClaudeCodeMode,
  { label: string; className: string; cycles: boolean }
> = {
  manual: { label: "? for shortcuts", className: "text-[#8c8c8c]", cycles: false },
  "accept-edits": {
    label: "⏵⏵ accept edits on",
    className: "text-[#af87ff]",
    cycles: true,
  },
  plan: { label: "⏸ plan mode on", className: "text-[#48968c]", cycles: true },
  auto: { label: "⏵⏵ auto mode on", className: "text-[#e5c07b]", cycles: true },
  bypass: {
    label: "⏵⏵ bypass permissions on",
    className: "text-[#fd526f]",
    cycles: true,
  },
};

const KBD_CLASS =
  "inline h-auto min-w-0 select-auto rounded-none bg-transparent p-0 font-mono text-[length:inherit] font-normal text-[#8c8c8c] leading-[inherit]";

const EFFORT_GLYPH: Record<ClaudeCodeEffort, string> = {
  low: "○",
  medium: "◑",
  high: "◕",
  xhigh: "◉",
  max: "●",
  ultracode: "✦",
};

export function ClaudeCodePrompt({
  value,
  defaultValue = "",
  onChange,
  onKeyDown,
  placeholder,
  mode = "manual",
  effort = false,
  pullRequest,
  className,
  inputClassName,
  ref,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  mode?: ClaudeCodeMode;
  effort?: ClaudeCodeEffort | false;
  /** Shows "· PR #123" after the mode, like Claude Code does for the branch PR. */
  pullRequest?: { number: number; href?: string };
  className?: string;
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const [draft, setDraft] = useState(defaultValue);
  const isControlled = value !== undefined;
  const isEmpty = (isControlled ? value : draft) === "";
  const status = MODE_STATUS[mode];

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setDraft(event.target.value);
    }
    onChange?.(event);
  };

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-5 font-mono text-[13px] leading-5 text-[#f7f7f7]",
        className
      )}
    >
      <InputGroup className="grid h-auto min-w-0 grid-cols-[2ch_minmax(0,1fr)] items-stretch rounded-none border-0 border-[#7b7b7b] border-y bg-transparent py-1.5 has-[[data-slot=input-group-control]:focus-visible]:border-[#7b7b7b] has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent">
        <InputGroupAddon className="order-none cursor-text justify-start p-0 font-normal text-[length:inherit] text-white leading-[inherit]">
          <span aria-hidden="true">❯</span>
        </InputGroupAddon>
        <span className="relative flex min-w-0">
          <InputGroupInput
            aria-label="Message Claude Code"
            className={cn(
              "h-auto p-0 font-mono text-[13px] text-white leading-5 caret-white transition-none placeholder:text-[#8c8c8c] md:text-[13px]",
              isEmpty && "caret-transparent",
              inputClassName
            )}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={ref}
            spellCheck={false}
            type="text"
            value={isControlled ? value : draft}
          />
          {isEmpty ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[1ch] bg-white mix-blend-difference"
            />
          ) : null}
        </span>
      </InputGroup>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-[2ch] pl-[2ch] text-[#8c8c8c]">
        <p className="min-w-0">
          <span className={status.className}>{status.label}</span>
          {status.cycles ? (
            <>
              {" ("}
              <Kbd className={KBD_CLASS}>shift+tab</Kbd>
              {" to cycle)"}
            </>
          ) : null}
          {pullRequest ? (
            <>
              {" · PR "}
              <a
                className="text-[#d9b559] underline underline-offset-2"
                href={pullRequest.href ?? "#"}
              >
                #{pullRequest.number}
              </a>
            </>
          ) : null}
        </p>
        {effort ? (
          <p
            className={cn(
              "shrink-0",
              effort === "ultracode" ? "text-[#e06443]" : "text-[#8c8c8c]"
            )}
          >
            {EFFORT_GLYPH[effort]} {effort} · /effort
          </p>
        ) : null}
      </div>
    </div>
  );
}
