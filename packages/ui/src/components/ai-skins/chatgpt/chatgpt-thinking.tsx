"use client";

import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { cn } from "@notra/ui/lib/utils";

export function ChatgptThinking({
  className,
  reducedMotion = false,
}: {
  className?: string;
  reducedMotion?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in text-[15px] leading-7 text-muted-foreground duration-normal ease-emphasized motion-reduce:animate-none",
        className
      )}
    >
      {reducedMotion ? (
        "Thinking"
      ) : (
        <Shimmer className="font-medium">Thinking</Shimmer>
      )}
    </div>
  );
}
