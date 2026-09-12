"use client";

import { cn } from "@notra/ui/lib/utils";
import { Dithering } from "@paper-design/shaders-react";
import { useSyncExternalStore } from "react";

import { DITHER_MOBILE_MAX_PIXELS } from "@/constants/dithering";
import { useDitherPainted } from "@/lib/dithering/use-dither-painted";
import type { DitheringCanvasProps } from "@/types/dithering";
import {
  getDitherEnvironmentServerSnapshot,
  getDitherMobileSnapshot,
  subscribeToDitherViewport,
} from "@/utils/dither-environment";

export function DitheringShader({
  className,
  speed,
  maxPixelCount,
  animate = true,
  onPainted,
  ...shaderProps
}: DitheringCanvasProps) {
  const isMobile = useSyncExternalStore(
    subscribeToDitherViewport,
    getDitherMobileSnapshot,
    getDitherEnvironmentServerSnapshot
  );
  const paintRef = useDitherPainted(onPainted);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      ref={paintRef}
    >
      <Dithering
        {...shaderProps}
        className="h-full w-full"
        maxPixelCount={
          maxPixelCount ?? (isMobile ? DITHER_MOBILE_MAX_PIXELS : undefined)
        }
        minPixelRatio={isMobile ? 1 : undefined}
        speed={animate ? speed : 0}
      />
    </div>
  );
}
