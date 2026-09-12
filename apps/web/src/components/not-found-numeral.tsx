"use client";

import { cn } from "@notra/ui/lib/utils";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DitheringShader } from "@/components/dithering-shader";
import { NOT_FOUND_DITHERING, NOT_FOUND_HEADING } from "@/constants/not-found";
import { useDitherPointer } from "@/lib/dithering/use-dither-pointer";
import { createTextMaskDataUrl } from "@/utils/create-text-mask-data-url";
import {
  getDitherEnvironmentServerSnapshot,
  getPageVisibleSnapshot,
  subscribeToPageVisibility,
} from "@/utils/dither-environment";
import {
  getReducedMotionServerSnapshot,
  getReducedMotionSnapshot,
  subscribeToReducedMotion,
} from "@/utils/reduced-motion";

const NUMERAL_CLASSNAME =
  "font-display px-[0.04em] py-[0.12em] text-[clamp(5.75rem,28vw,16rem)] leading-none font-medium tracking-[-0.015em] text-transparent forced-colors:text-primary";

export function NotFoundNumeral() {
  const textRef = useRef<HTMLHeadingElement>(null);
  const maskSizeRef = useRef("");
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [shaderPainted, setShaderPainted] = useState(false);
  const ready = Boolean(maskUrl && shaderPainted);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const isPageVisible = useSyncExternalStore(
    subscribeToPageVisibility,
    getPageVisibleSnapshot,
    getDitherEnvironmentServerSnapshot
  );
  const { offsetX, offsetY, speed, pointerProps } = useDitherPointer({
    restSpeed: NOT_FOUND_DITHERING.speed,
    offsetRange: NOT_FOUND_DITHERING.hover.offsetRange,
    lerp: NOT_FOUND_DITHERING.hover.lerp,
    visibleYRatio: NOT_FOUND_DITHERING.hover.visibleYRatio,
  });
  const handlePainted = useCallback(() => {
    setShaderPainted(true);
  }, []);

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node) {
      return;
    }

    const updateMask = () => {
      const size = `${node.offsetWidth}x${node.offsetHeight}`;
      if (size === maskSizeRef.current) {
        return;
      }
      const nextMask = createTextMaskDataUrl(node, NOT_FOUND_HEADING);
      if (!nextMask) {
        return;
      }
      maskSizeRef.current = size;
      setMaskUrl(nextMask);
    };

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    void fontsReady.then(updateMask);

    const observer = new ResizeObserver(updateMask);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-fit">
      <div className="pointer-events-none mask-[linear-gradient(to_bottom,black_45%,transparent)]">
        <h1 className={NUMERAL_CLASSNAME} ref={textRef}>
          {NOT_FOUND_HEADING}
        </h1>
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 forced-colors:hidden",
            "duration-slower transition-opacity ease-out motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0"
          )}
          style={
            maskUrl
              ? {
                  maskImage: `url("${maskUrl}")`,
                  maskRepeat: "no-repeat",
                  maskSize: "100% 100%",
                  WebkitMaskImage: `url("${maskUrl}")`,
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: "100% 100%",
                }
              : undefined
          }
        >
          <DitheringShader
            animate={!prefersReducedMotion && isPageVisible}
            className="h-full w-full"
            colorBack={NOT_FOUND_DITHERING.colorBack}
            colorFront={NOT_FOUND_DITHERING.colorFront}
            fit={NOT_FOUND_DITHERING.fit}
            offsetX={offsetX}
            offsetY={offsetY}
            onPainted={handlePainted}
            scale={NOT_FOUND_DITHERING.scale}
            shape={NOT_FOUND_DITHERING.shape}
            size={NOT_FOUND_DITHERING.size}
            speed={speed}
            type={NOT_FOUND_DITHERING.type}
          />
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0" {...pointerProps} />
    </div>
  );
}
