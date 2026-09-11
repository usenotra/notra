"use client";

import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";

import { useDitherVisibility } from "@/lib/dithering/use-dither-visibility";
import type {
  DeferredDitheringProps,
  DitheringCanvasProps,
} from "@/types/dithering";

import { DitheringCanvas } from "./dithering-canvas";

function DeferredDitherLayer({
  speed,
  maxPixelCount,
  onPainted,
  ...shaderProps
}: DitheringCanvasProps) {
  const [painted, setPainted] = useState(false);

  return (
    <DitheringCanvas
      {...shaderProps}
      className={cn(
        "h-full w-full transition-opacity duration-300",
        painted ? "opacity-100" : "opacity-0"
      )}
      maxPixelCount={maxPixelCount}
      onPainted={() => {
        setPainted(true);
        onPainted?.();
      }}
      speed={speed}
    />
  );
}

export function DeferredDithering({
  className,
  speed,
  maxPixelCount,
  unmountOffscreen = false,
  eager = false,
  onPainted,
  ...shaderProps
}: DeferredDitheringProps) {
  const { containerRef, shouldRender, isAnimating } = useDitherVisibility(
    unmountOffscreen,
    eager
  );

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      ref={containerRef}
    >
      {shouldRender ? (
        <DeferredDitherLayer
          {...shaderProps}
          animate={isAnimating}
          maxPixelCount={maxPixelCount}
          onPainted={onPainted}
          speed={speed}
        />
      ) : null}
    </div>
  );
}
