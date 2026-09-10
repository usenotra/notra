"use client";

import type * as React from "react";
import { cn } from "@notra/ui/lib/utils";

const FG = "#ececec";
const DIM = "#8a8a8a";
const RULE = "#3a3a3a";
const GREEN = "#2f9d63";

export function CodexComposer({
  value,
  defaultValue = "",
  onChange,
  onKeyDown,
  placeholder = "Ask Codex to do anything",
  model = "gpt-6-astra",
  cwd = "~/acme/web",
  context = "12% context used",
  className,
  inputClassName,
  ref,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  model?: string;
  cwd?: string;
  context?: string;
  className?: string;
  inputClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  const controlled = value !== undefined;

  return (
    <div
      className={cn("min-w-0 font-mono text-[13px] leading-[1.6]", className)}
    >
      <div
        className="flex min-w-0 items-center gap-0 border-t pt-1.5"
        style={{ borderColor: RULE }}
      >
        <span aria-hidden className="shrink-0" style={{ color: GREEN }}>
          ›
        </span>
        <input
          aria-label="Prompt"
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={ref}
          type="text"
          {...(controlled ? { value, onChange } : { defaultValue, onChange })}
          className={cn(
            "min-w-0 flex-1 bg-transparent py-0.5 pl-[1ch] outline-none placeholder:text-[#565656]",
            inputClassName
          )}
          style={{ color: FG, caretColor: FG }}
        />
      </div>
      <div
        className="mt-1.5 min-w-0 break-words px-0 text-[11px]"
        style={{ color: DIM }}
      >
        {model} · {context} · {cwd}
      </div>
    </div>
  );
}
