"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { DitherVisibilityState } from "@/types/dithering";
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

const VIEWPORT_MARGIN = "200px";
const IDLE_FALLBACK_MS = 1500;

export function useDitherVisibility(
  unmountOffscreen = false
): DitherVisibilityState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const isPageVisible = useSyncExternalStore(
    subscribeToPageVisibility,
    getPageVisibleSnapshot,
    getDitherEnvironmentServerSnapshot
  );
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => setIsIdle(true));
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(
      () => setIsIdle(true),
      IDLE_FALLBACK_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        setIsInView(visible);
        if (visible) {
          setHasEntered(true);
        }
      },
      { rootMargin: VIEWPORT_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return {
    containerRef,
    shouldRender:
      isIdle && (unmountOffscreen ? isInView && isPageVisible : hasEntered),
    isAnimating: isInView && isPageVisible && !prefersReducedMotion,
  };
}
