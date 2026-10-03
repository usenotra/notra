import { cn } from "cn";

import {
  OPENCODE_DEFAULT_AGENT,
  OPENCODE_DEFAULT_MODEL,
} from "../constants/opencode";
import type { OpencodeTurnFooterProps } from "../types/opencode";

export const OpencodeTurnFooter = ({
  agent = OPENCODE_DEFAULT_AGENT,
  className,
  duration,
  interrupted = false,
  model = OPENCODE_DEFAULT_MODEL,
  ...props
}: OpencodeTurnFooterProps) => (
  <div
    className={cn(
      "text-opencode-muted flex min-w-0 items-center gap-[1ch] ps-[3ch]",
      className
    )}
    data-slot="opencode-turn-footer"
    {...props}
  >
    <span
      aria-hidden="true"
      className="border-opencode-blue grid size-[1.1em] shrink-0 place-items-center border-[1.5px]"
    >
      <span className="bg-opencode-blue size-[0.5em]" />
    </span>
    <span className="text-opencode-fg">{agent}</span>
    <span aria-hidden="true">·</span>
    <span className="min-w-0 truncate">{model}</span>
    {duration && (
      <>
        <span aria-hidden="true">·</span>
        <span className="shrink-0 tabular-nums">{duration}</span>
      </>
    )}
    {interrupted && (
      <>
        <span aria-hidden="true">·</span>
        <span className="text-opencode-orange shrink-0">interrupted</span>
      </>
    )}
  </div>
);
