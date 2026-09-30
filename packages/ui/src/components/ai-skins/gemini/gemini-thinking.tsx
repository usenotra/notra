"use client";

import { GeminiSparkle } from "@notra/ui/components/ai-skins/gemini/gemini-sparkle";
import { cn } from "@notra/ui/lib/utils";

export function GeminiThinking({
  label = "Web wird durchsucht",
  reducedMotion = false,
  className,
}: {
  label?: string;
  reducedMotion?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-2.5 text-[16px] leading-none text-[#1f1f1f] dark:text-foreground",
        className
      )}
    >
      <GeminiSparkle animated reducedMotion={reducedMotion} size={20} />
      <span>{label}</span>
    </div>
  );
}
