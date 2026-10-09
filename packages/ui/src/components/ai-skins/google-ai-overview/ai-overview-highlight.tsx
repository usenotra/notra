import { cn } from "@notra/ui/lib/utils";

import type { AIOverviewHighlightProps } from "@notra/ui/types/google-ai-overview";

export const AIOverviewHighlight = ({
  active = false,
  className,
  ...props
}: AIOverviewHighlightProps) => (
  <mark
    className={cn(
      "rounded-sm bg-transparent bg-[linear-gradient(90deg,var(--aio-mark)_50%,transparent_50%)] bg-size-[200%_100%] bg-position-[100%_0] px-0.5 text-inherit transition-[background-position] duration-750 ease-[cubic-bezier(0.05,0.7,0.1,1)] motion-reduce:transition-none",
      "[&:has(+[data-slot=ai-overview-citation]:is(:hover,:focus-within))]:bg-aio-hover [&:has(+[data-slot=ai-overview-citation]:is(:hover,:focus-within))]:rounded-none [&:has(+[data-slot=ai-overview-citation]:is(:hover,:focus-within))]:bg-none",
      active &&
        "text-aio-mark-fg bg-position-[0_0] font-medium delay-250 starting:bg-position-[100%_0]",
      className
    )}
    data-active={active || undefined}
    data-slot="ai-overview-highlight"
    {...props}
  />
);
