"use client";

import { OpencodeProgress } from "@notra/ui/components/ai-skins/opencode/opencode-progress";
import {
  OPENCODE_DEFAULT_AGENT,
  OPENCODE_DEFAULT_EFFORT,
  OPENCODE_DEFAULT_MODEL,
  OPENCODE_DEFAULT_PLACEHOLDER,
  OPENCODE_DEFAULT_PROVIDER,
} from "@notra/ui/constants/opencode-skin";
import { cn } from "@notra/ui/lib/utils";
import type { OpencodeComposerProps } from "@notra/ui/types/opencode-skin";

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span>
      <kbd className="font-mono text-opencode-tui-foreground">{keys}</kbd>{" "}
      {label}
    </span>
  );
}

export function OpencodeComposer({
  value,
  defaultValue = "",
  onChange,
  onKeyDown,
  placeholder = OPENCODE_DEFAULT_PLACEHOLDER,
  agent = OPENCODE_DEFAULT_AGENT,
  model = OPENCODE_DEFAULT_MODEL,
  provider = OPENCODE_DEFAULT_PROVIDER,
  effort = OPENCODE_DEFAULT_EFFORT,
  context,
  busy = false,
  cwd,
  className,
  inputClassName,
  ref,
}: OpencodeComposerProps) {
  const controlled = value !== undefined;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-5 font-mono text-[13px] leading-5",
        className
      )}
    >
      <div className="relative flex flex-col gap-5 border-opencode-tui-blue border-l-2 bg-opencode-tui-panel pt-5 pr-[2ch] pb-2.5 pl-[calc(3ch-2px)]">
        <input
          aria-label="Prompt"
          className={cn(
            "peer h-5 w-full min-w-0 bg-transparent text-opencode-tui-foreground caret-opencode-tui-foreground outline-none placeholder:text-opencode-tui-muted [&:placeholder-shown:not(:focus)]:indent-[1ch]",
            inputClassName
          )}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={ref}
          type="text"
          {...(controlled ? { value, onChange } : { defaultValue, onChange })}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-5 left-[calc(3ch-2px)] hidden h-5 w-[1ch] bg-opencode-tui-foreground peer-[:placeholder-shown:not(:focus)]:block"
        />
        <div className="flex min-w-0 flex-wrap gap-x-[1ch]">
          <span className="text-opencode-tui-blue">{agent}</span>
          <span aria-hidden className="text-opencode-tui-muted">
            ·
          </span>
          <span className="text-opencode-tui-foreground">{model}</span>
          <span className="text-opencode-tui-muted">{provider}</span>
          <span aria-hidden className="text-opencode-tui-muted">
            ·
          </span>
          <span className="font-bold text-opencode-tui-orange">{effort}</span>
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-[2ch] pl-[1ch] text-opencode-tui-muted">
        {busy ? (
          <span className="flex min-w-0 items-center gap-[2ch]">
            <OpencodeProgress />
            <Hint keys="esc" label="interrupt" />
          </span>
        ) : (
          <span className="min-w-0 truncate">{cwd}</span>
        )}
        <span className="flex shrink-0 items-center gap-[2ch]">
          {context ? (
            <span className="tabular-nums">{context}</span>
          ) : (
            <Hint keys="tab" label="agents" />
          )}
          <Hint keys="ctrl+p" label="commands" />
        </span>
      </div>
    </div>
  );
}
