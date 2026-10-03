"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Kbd } from "@notra/ui/components/ui/kbd";
import {
  CODEX_COLORS,
  CODEX_DEFAULT_CWD,
  CODEX_DEFAULT_MODEL,
  CODEX_DEFAULT_PLACEHOLDER,
  CODEX_ROW_CLASS,
} from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexComposerProps } from "@notra/ui/types/codex-skin";
import type * as React from "react";
import { useState } from "react";

function Separator() {
  return <span style={{ color: CODEX_COLORS.dim }}> · </span>;
}

function Key({ children }: { children: string }) {
  return (
    <Kbd
      className="inline h-auto min-w-0 select-auto rounded-none bg-transparent p-0 font-bold font-mono text-[length:inherit] leading-[inherit]"
      style={{ color: CODEX_COLORS.foreground }}
    >
      {children}
    </Kbd>
  );
}

export function CodexComposer({
  value,
  defaultValue = "",
  onChange,
  onKeyDown,
  placeholder = CODEX_DEFAULT_PLACEHOLDER,
  model = CODEX_DEFAULT_MODEL,
  effort,
  cwd = CODEX_DEFAULT_CWD,
  task,
  context,
  warnings,
  className,
  inputClassName,
  ref,
}: CodexComposerProps) {
  const controlled = value !== undefined;
  const [draft, setDraft] = useState(defaultValue);
  const isEmpty = (controlled ? value : draft).length === 0;
  const [firstChar = "", ...restChars] = Array.from(placeholder);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (!controlled) {
      setDraft(event.target.value);
    }
    onChange?.(event);
  };

  return (
    <div
      className={cn("min-w-0 font-mono text-[13px] leading-[1.3]", className)}
      style={{ color: CODEX_COLORS.dim }}
    >
      <InputGroup
        className={cn(
          CODEX_ROW_CLASS,
          "h-auto items-stretch rounded-none border-0 py-[1.3em] has-[[data-slot=input-group-control]:focus-visible]:ring-0"
        )}
        style={{ backgroundColor: CODEX_COLORS.composer }}
      >
        <InputGroupAddon
          className="order-none cursor-text justify-start p-0 font-bold text-[length:inherit] leading-[inherit]"
          style={{ color: CODEX_COLORS.foreground }}
        >
          <span aria-hidden="true">›</span>
        </InputGroupAddon>
        <div className="relative min-w-0">
          {isEmpty ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 truncate"
              style={{ color: CODEX_COLORS.placeholder }}
            >
              <span
                style={{
                  backgroundColor: CODEX_COLORS.cursor,
                  color: CODEX_COLORS.foreground,
                }}
              >
                {firstChar}
              </span>
              {restChars.join("")}
            </span>
          ) : null}
          <InputGroupInput
            aria-label={placeholder}
            className={cn(
              "relative block h-auto p-0 font-mono text-[13px] leading-[1.3] transition-none md:text-[13px]",
              inputClassName
            )}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            ref={ref}
            style={{
              caretColor: isEmpty ? "transparent" : CODEX_COLORS.cursor,
              color: CODEX_COLORS.foreground,
            }}
            type="text"
            value={controlled ? value : draft}
          />
        </div>
      </InputGroup>
      <div className={cn(CODEX_ROW_CLASS, "mt-[0.5em]")}>
        <p className="col-start-2 min-w-0 truncate">
          <span style={{ color: CODEX_COLORS.yellow }}>
            {effort ? `${model} ${effort}` : model}
          </span>
          <Separator />
          <span style={{ color: CODEX_COLORS.green }}>{cwd}</span>
          {task ? (
            <>
              <Separator />
              <span style={{ color: CODEX_COLORS.yellow }}>{task}</span>
            </>
          ) : null}
        </p>
        <div className="col-start-2 flex min-w-0 flex-wrap justify-between gap-x-[2ch]">
          <p>
            <Key>←</Key> for agents
            <Separator />
            <Key>?</Key> for shortcuts
          </p>
          {warnings ? (
            <p>
              <span style={{ color: CODEX_COLORS.amber }}>
                <span aria-hidden="true" className="inline-block w-[1ch]">
                  ⚠
                </span>
                {` ${warnings} ${warnings === 1 ? "warning" : "warnings"}`}
              </span>
              <Separator />
              <Key>f2</Key> to view
            </p>
          ) : null}
          {!warnings && context ? <p>{context}</p> : null}
        </div>
      </div>
    </div>
  );
}
