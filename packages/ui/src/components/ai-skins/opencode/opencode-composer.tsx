"use client";

import { OpencodeProgress } from "@notra/ui/components/ai-skins/opencode/opencode-progress";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Kbd } from "@notra/ui/components/ui/kbd";
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
      <Kbd className="inline h-auto min-w-0 select-auto rounded-none bg-transparent p-0 font-mono font-normal text-[length:inherit] text-opencode-tui-foreground leading-[inherit]">
        {keys}
      </Kbd>{" "}
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
      <InputGroup className="relative h-auto flex-col items-stretch gap-2.5 rounded-none border-0 border-opencode-tui-blue border-l-2 bg-opencode-tui-panel py-2.5 pr-[2ch] pl-[calc(3ch-2px)] has-[>[data-align=block-end]]:[&>input]:pt-0 has-[[data-slot=input-group-control]:focus-visible]:border-opencode-tui-blue has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-opencode-tui-panel">
        <InputGroupInput
          aria-label="Prompt"
          className={cn(
            "peer h-5 flex-none p-0 font-mono text-[13px] text-opencode-tui-foreground leading-5 caret-opencode-tui-foreground transition-none placeholder:text-opencode-tui-muted md:text-[13px] [&:placeholder-shown:not(:focus)]:indent-[1ch]",
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
          className="pointer-events-none absolute top-2.5 left-[calc(3ch-2px)] hidden h-5 w-[1ch] bg-opencode-tui-foreground peer-[:placeholder-shown:not(:focus)]:block"
        />
        <InputGroupAddon
          align="block-end"
          className="min-w-0 cursor-auto select-auto flex-wrap items-stretch justify-start gap-x-[1ch] gap-y-0 p-0 font-normal text-[length:inherit] leading-[inherit] group-has-[>input]/input-group:pb-0"
        >
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
        </InputGroupAddon>
      </InputGroup>
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
