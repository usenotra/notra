import { cn } from "cn";
import { Fragment } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

import {
  CLAUDE_CODE_EFFORTS,
  CLAUDE_CODE_MODES,
} from "../constants/claude-code";
import type {
  ClaudeCodeKeyHint,
  ClaudeCodePromptProps,
} from "../types/claude-code";

const KEY_CLASS_NAME =
  "text-claude-code-muted h-auto min-w-0 rounded-none bg-transparent p-0 align-baseline font-claude-code text-[length:inherit] leading-[inherit] font-normal";

const KeyHint = ({ keys, label, parenthesized }: ClaudeCodeKeyHint) => (
  <>
    {parenthesized && "("}
    <Kbd className={KEY_CLASS_NAME}>{keys}</Kbd> {label}
    {parenthesized && ")"}
  </>
);

export const ClaudeCodePrompt = ({
  className,
  defaultValue = "",
  effort = "xhigh",
  inputClassName,
  inputRef,
  mode = "auto",
  onChange,
  onKeyDown,
  placeholder = "",
  pullRequest,
  value,
  ...props
}: ClaudeCodePromptProps) => {
  const modeConfig = CLAUDE_CODE_MODES[mode];
  const effortConfig = effort === false ? null : CLAUDE_CODE_EFFORTS[effort];
  const ruleClassName = effortConfig?.rainbow
    ? "bg-[image:var(--claude-code-rainbow)]"
    : "bg-claude-code-rule";
  const valueProps =
    value === undefined ? { defaultValue, onChange } : { onChange, value };

  return (
    <div
      className={cn(
        "font-claude-code text-claude-code-fg min-w-0 text-[0.8125rem] leading-[1.125rem]",
        className
      )}
      data-effort={effort || undefined}
      data-mode={mode}
      data-slot="claude-code-prompt"
      {...props}
    >
      {effortConfig && (
        <div className="text-claude-code-muted flex justify-end px-1 pb-1">
          <span className="min-w-0 text-right wrap-break-word">
            <span aria-hidden="true">{effortConfig.glyph}</span>{" "}
            {effortConfig.label}
          </span>
        </div>
      )}

      <Separator className={cn("h-px w-full", ruleClassName)} />
      <InputGroup className="h-auto min-w-0 rounded-none border-0 bg-transparent py-0.5 has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent has-[>[data-align=inline-start]]:[&>input]:pl-[1ch]">
        <InputGroupAddon className="text-claude-code-fg cursor-text p-0 text-[0.8125rem] leading-[1.125rem] font-normal">
          <InputGroupText
            aria-hidden="true"
            className="text-claude-code-fg text-[0.8125rem]"
          >
            ❯
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Prompt"
          className={cn(
            "font-claude-code text-claude-code-fg caret-claude-code-fg placeholder:text-claude-code-comment h-auto py-0 ps-[1ch] pe-0 text-[0.8125rem] leading-[1.125rem] md:text-[0.8125rem]",
            inputClassName
          )}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          {...valueProps}
        />
      </InputGroup>
      <Separator className={cn("h-px w-full", ruleClassName)} />

      <div className="mt-1 min-w-0 px-1 wrap-break-word">
        <span className={modeConfig.className}>
          <span aria-hidden="true">{modeConfig.glyph} </span>
          {modeConfig.label}
        </span>
        {pullRequest ? (
          <span className="text-claude-code-muted">
            {" · PR "}
            {pullRequest.href ? (
              <a
                className="text-claude-code-pending underline underline-offset-2"
                href={pullRequest.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                #{pullRequest.number}
              </a>
            ) : (
              <span className="text-claude-code-pending">
                #{pullRequest.number}
              </span>
            )}
          </span>
        ) : null}
        {modeConfig.hints.length > 0 && (
          <span className="text-claude-code-muted">
            {modeConfig.leadingDot ? " · " : " "}
            {modeConfig.hints.map((hint, index) => (
              <Fragment key={hint.keys}>
                {index > 0 && " · "}
                <KeyHint {...hint} />
              </Fragment>
            ))}
          </span>
        )}
      </div>
    </div>
  );
};
