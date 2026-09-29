import { cn } from "cn";

import { Shimmer } from "../../shimmer/components/shimmer";
import { GEMINI_SEARCHING_LABEL } from "../constants/gemini";
import type { GeminiThinkingProps } from "../types/gemini";
import { GeminiSparkle } from "./gemini-sparkle";

export const GeminiThinking = ({
  className,
  label = GEMINI_SEARCHING_LABEL,
  reducedMotion,
  ...props
}: GeminiThinkingProps) => (
  <div
    aria-live="polite"
    className={cn(
      "font-gemini text-gemini-fg flex items-center gap-2.5 text-[0.9375rem] leading-none",
      className
    )}
    data-slot="gemini-thinking"
    role="status"
    {...props}
  >
    <GeminiSparkle
      animated
      aria-hidden="true"
      aria-label={undefined}
      reducedMotion={reducedMotion}
      role="presentation"
      size={20}
    />
    <Shimmer
      className="[--shimmer-highlight:var(--gemini-subtle)]"
      paused={reducedMotion}
    >
      {label}
    </Shimmer>
  </div>
);
