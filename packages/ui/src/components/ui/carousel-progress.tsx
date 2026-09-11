"use client";

import { cn } from "@notra/ui/lib/utils";

interface CarouselProgressProps {
  activeIndex: number;
  labels: readonly string[];
  onSelect: (index: number) => void;
  progress: number;
  variant?: "default" | "inverted";
  className?: string;
}

function CarouselProgress({
  activeIndex,
  labels,
  onSelect,
  progress,
  variant = "default",
  className,
}: CarouselProgressProps) {
  const progressWidth = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {labels.map((label, index) => {
        const isActive = index === activeIndex;

        return (
          <button
            aria-current={isActive ? "true" : undefined}
            aria-label={label}
            className="group flex h-11 cursor-pointer items-center justify-center rounded-full px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            key={label}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none relative block h-2 overflow-hidden rounded-full transition-[width,background-color] duration-slow motion-reduce:transition-none",
                isActive ? "w-12" : "w-2",
                variant === "inverted"
                  ? isActive
                    ? "bg-white/20"
                    : "bg-white/40 group-hover:bg-white/60"
                  : isActive
                    ? "bg-foreground/15"
                    : "bg-foreground/20 group-hover:bg-foreground/40"
              )}
            >
              {isActive ? (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 min-w-2 rounded-full",
                    variant === "inverted" ? "bg-white" : "bg-foreground/60"
                  )}
                  style={{
                    width: `calc(${progressWidth}% + ${0.5 * (1 - progressWidth / 100)}rem)`,
                  }}
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { CarouselProgress };
