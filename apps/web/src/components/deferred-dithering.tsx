"use client";

import { cn } from "@notra/ui/lib/utils";

import { useDitherVisibility } from "@/lib/dithering/use-dither-visibility";
import type { DeferredDitheringProps } from "@/types/dithering";

import { DitheringCanvas } from "./dithering-canvas";

export function DeferredDithering({
  className,
  speed,
  maxPixelCount,
  unmountOffscreen = false,
  ...shaderProps
}: DeferredDitheringProps) {
  const { containerRef, shouldRender, isAnimating } =
    useDitherVisibility(unmountOffscreen);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      ref={containerRef}
    >
      {shouldRender ? (
        <DitheringCanvas
          {...shaderProps}
          animate={isAnimating}
          className="h-full w-full"
          maxPixelCount={maxPixelCount}
          speed={speed}
        />
      ) : null}
    </div>
  );
}
