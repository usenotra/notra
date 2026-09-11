"use client";

import { cn } from "@notra/ui/lib/utils";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { DITHER_MOBILE_MAX_PIXELS } from "@/constants/dithering";
import { useDitherVisibility } from "@/lib/dithering/use-dither-visibility";
import type { DeferredDitheringProps } from "@/types/dithering";
import {
  getDitherEnvironmentServerSnapshot,
  getDitherMobileSnapshot,
  subscribeToDitherViewport,
} from "@/utils/dither-environment";

const Dithering = dynamic(
  () =>
    import("@paper-design/shaders-react").then((module_) => module_.Dithering),
  { ssr: false }
);

export function DeferredDithering({
  className,
  speed,
  maxPixelCount,
  unmountOffscreen = false,
  ...shaderProps
}: DeferredDitheringProps) {
  const { containerRef, shouldRender, isAnimating } =
    useDitherVisibility(unmountOffscreen);
  const isMobile = useSyncExternalStore(
    subscribeToDitherViewport,
    getDitherMobileSnapshot,
    getDitherEnvironmentServerSnapshot
  );

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      ref={containerRef}
    >
      {shouldRender && (
        <Dithering
          {...shaderProps}
          className="h-full w-full"
          maxPixelCount={
            maxPixelCount ?? (isMobile ? DITHER_MOBILE_MAX_PIXELS : undefined)
          }
          minPixelRatio={isMobile ? 1 : undefined}
          speed={isAnimating ? speed : 0}
        />
      )}
    </div>
  );
}
