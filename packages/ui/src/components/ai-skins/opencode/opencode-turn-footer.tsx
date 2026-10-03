import {
  OPENCODE_DEFAULT_AGENT,
  OPENCODE_DEFAULT_MODEL,
} from "@notra/ui/constants/opencode-skin";
import { cn } from "@notra/ui/lib/utils";
import type { OpencodeTurnFooterProps } from "@notra/ui/types/opencode-skin";

export function OpencodeTurnFooter({
  agent = OPENCODE_DEFAULT_AGENT,
  model = OPENCODE_DEFAULT_MODEL,
  duration,
  className,
}: OpencodeTurnFooterProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-[1ch] pl-[3ch] font-mono text-[13px] text-opencode-tui-muted leading-5",
        className
      )}
    >
      <span
        aria-hidden
        className="grid size-[1.1em] shrink-0 place-items-center border-[1.5px] border-opencode-tui-blue"
      >
        <span className="size-[0.5em] bg-opencode-tui-blue" />
      </span>
      <span className="text-opencode-tui-foreground">{agent}</span>
      <span aria-hidden>·</span>
      <span className="min-w-0 truncate">{model}</span>
      {duration ? (
        <>
          <span aria-hidden>·</span>
          <span className="shrink-0 tabular-nums">{duration}</span>
        </>
      ) : null}
    </div>
  );
}
