"use client";

import { cn } from "cn";
import { useState, type ChangeEvent } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

import {
  CODEX_DEFAULT_CWD,
  CODEX_DEFAULT_MODEL,
  CODEX_DEFAULT_PLACEHOLDER,
  CODEX_ROW_CLASS,
} from "../constants/codex";
import type { CodexComposerProps } from "../types/codex";

const CodexDot = () => <span className="text-codex-dim"> · </span>;

const CodexKey = ({ children }: { children: string }) => (
  <Kbd className="text-codex-fg font-codex inline h-auto min-w-0 rounded-none bg-transparent p-0 text-[length:inherit] leading-[inherit] font-bold">
    {children}
  </Kbd>
);

export const CodexComposer = ({
  "aria-label": ariaLabel,
  className,
  context,
  cwd = CODEX_DEFAULT_CWD,
  defaultValue,
  effort,
  inputClassName,
  model = CODEX_DEFAULT_MODEL,
  onChange,
  placeholder = CODEX_DEFAULT_PLACEHOLDER,
  task,
  value,
  warnings,
  ...props
}: CodexComposerProps) => {
  const [draft, setDraft] = useState(String(defaultValue ?? ""));
  const isEmpty = String(value ?? draft).length === 0;
  const [cursorChar = " ", ...restChars] = Array.from(placeholder);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    onChange?.(event);
  };

  return (
    <div
      className={cn(
        "font-codex text-codex-dim min-w-0 text-[0.8125rem] leading-[1.3]",
        className
      )}
      data-slot="codex-composer"
    >
      <InputGroup
        className={cn(
          CODEX_ROW_CLASS,
          "bg-codex-composer dark:bg-codex-composer h-auto rounded-none border-0 py-[1.3em] has-[[data-slot=input-group-control]:focus-visible]:ring-0"
        )}
      >
        <InputGroupAddon className="text-codex-fg order-none cursor-text justify-start p-0 text-[length:inherit] leading-[inherit] font-bold">
          <span aria-hidden="true">›</span>
        </InputGroupAddon>
        <div className="relative min-w-0">
          {isEmpty && (
            <span
              aria-hidden="true"
              className="text-codex-placeholder pointer-events-none absolute inset-0 truncate"
            >
              <span className="bg-codex-cursor text-codex-fg">
                {cursorChar}
              </span>
              {restChars.join("")}
            </span>
          )}
          <InputGroupInput
            aria-label={ariaLabel ?? placeholder}
            className={cn(
              "text-codex-fg caret-codex-cursor h-auto p-0 font-[inherit] text-[0.8125rem] leading-[1.3] md:text-[0.8125rem]",
              isEmpty && "caret-transparent",
              inputClassName
            )}
            defaultValue={defaultValue}
            onChange={handleChange}
            type="text"
            value={value}
            {...props}
          />
        </div>
      </InputGroup>
      <div className={cn(CODEX_ROW_CLASS, "mt-[0.5em]")}>
        <p className="col-start-2 min-w-0 truncate">
          <span className="text-codex-yellow">
            {effort ? `${model} ${effort}` : model}
          </span>
          <CodexDot />
          <span className="text-codex-green">{cwd}</span>
          {task && (
            <>
              <CodexDot />
              <span className="text-codex-yellow">{task}</span>
            </>
          )}
        </p>
        <div className="col-start-2 flex min-w-0 flex-wrap justify-between gap-x-[2ch]">
          <p>
            <CodexKey>←</CodexKey> for agents
            <CodexDot />
            <CodexKey>?</CodexKey> for shortcuts
          </p>
          {warnings ? (
            <p>
              <span className="text-codex-amber">
                <span aria-hidden="true" className="inline-block w-[1ch]">
                  ⚠
                </span>
                {` ${warnings} ${warnings === 1 ? "warning" : "warnings"}`}
              </span>
              <CodexDot />
              <CodexKey>f2</CodexKey> to view
            </p>
          ) : (
            context && <p>{context}</p>
          )}
        </div>
      </div>
    </div>
  );
};
