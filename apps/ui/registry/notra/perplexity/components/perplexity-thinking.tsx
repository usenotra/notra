import { cn } from "cn";

import { Shimmer } from "../../shimmer/components/shimmer";
import type { PerplexityThinkingProps } from "../types/perplexity";

export const PerplexityThinking = ({
  className,
  label = "Thinking...",
  reducedMotion = false,
  ...props
}: PerplexityThinkingProps) => (
  <div
    aria-live="polite"
    className={cn(
      "font-pplx text-pplx-secondary text-sm leading-5 opacity-100 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none starting:opacity-0",
      className
    )}
    data-slot="perplexity-thinking"
    {...props}
  >
    {reducedMotion ? (
      label
    ) : (
      <Shimmer className="font-medium [--shimmer-highlight:var(--color-pplx-fg)]">
        {label}
      </Shimmer>
    )}
  </div>
);
