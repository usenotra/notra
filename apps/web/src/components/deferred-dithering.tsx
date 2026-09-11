"use client";

import { cn } from "@notra/ui/lib/utils";
import { useCallback, useEffect, useState } from "react";

import { useDitherVisibility } from "@/lib/dithering/use-dither-visibility";
import type { DeferredDitheringProps } from "@/types/dithering";

import { DitheringCanvas } from "./dithering-canvas";

export function DeferredDithering({
  className,
  speed,
  maxPixelCount,
  unmountOffscreen = false,
  eager = false,
  ...shaderProps
}: DeferredDitheringProps) {
  const { containerRef, shouldRender, isAnimating } = useDitherVisibility(
    unmountOffscreen,
    eager
  );
  const [painted, setPainted] = useState(false);
  const handlePainted = useCallback(() => {
    setPainted(true);
  }, []);

  useEffect(() => {
    if (!shouldRender) {
      setPainted(false);
    }
  }, [shouldRender]);

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
          className={cn(
            "h-full w-full transition-opacity duration-300",
            painted ? "opacity-100" : "opacity-0"
          )}
          maxPixelCount={maxPixelCount}
          onPainted={handlePainted}
          speed={speed}
        />
      ) : null}
    </div>
  );
}
