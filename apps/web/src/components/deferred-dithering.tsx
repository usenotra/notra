"use client";

import { cn } from "@notra/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

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
  const onPaintedRef = useRef(onPainted);
  const didNotify = useRef(false);

  useEffect(() => {
    onPaintedRef.current = onPainted;
  }, [onPainted]);

  return (
    <DitheringCanvas
      {...shaderProps}
      className={cn(
        "h-full w-full transition-opacity duration-300 motion-reduce:transition-none",
        painted ? "opacity-100" : "opacity-0"
      )}
      maxPixelCount={maxPixelCount}
      onPainted={() => {
        if (didNotify.current) {
          return;
        }
        didNotify.current = true;
        setPainted(true);
        onPaintedRef.current?.();
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
      className={cn("pointer-events-none relative", className)}
      ref={containerRef}
    >
      <div
        className="absolute inset-0 hidden motion-reduce:block"
        style={{
          backgroundImage: `radial-gradient(circle, ${shaderProps.colorFront ?? "#000000"} 0.75px, transparent 1px)`,
          backgroundSize: "4px 4px",
          maskImage:
            "linear-gradient(155deg, transparent 15%, black 45%, transparent 75%)",
        }}
      />
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
