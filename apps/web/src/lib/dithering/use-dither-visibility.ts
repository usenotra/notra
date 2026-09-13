"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { DitherVisibilityState } from "@/types/dithering";
import {
  getDitherEnvironmentServerSnapshot,
  getDitherMobileServerSnapshot,
  getDitherMobileSnapshot,
  getPageVisibleSnapshot,
  subscribeToDitherViewport,
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
  unmountOffscreen = false,
  eager = false
): DitherVisibilityState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeToDitherViewport,
    getDitherMobileSnapshot,
    getDitherMobileServerSnapshot
  );
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
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => setIsIdle(true), {
          timeout: IDLE_FALLBACK_MS,
        });
      } else {
        timeoutId = window.setTimeout(() => setIsIdle(true), IDLE_FALLBACK_MS);
      }
    };

    // Let the document, styles, and fonts finish loading before starting WebGL.
    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      window.removeEventListener("load", schedule);
      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
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

  // The hero's eager hint applies only to desktop. Mobile always waits for
  // load + idle, and every background must enter the viewport before loading.
  const renderEagerly = eager && !isMobile;

  return {
    containerRef,
    shouldRender:
      !prefersReducedMotion &&
      (renderEagerly || isIdle) &&
      (renderEagerly ||
        (unmountOffscreen ? isInView && isPageVisible : hasEntered)),
    isAnimating: isInView && isPageVisible && !prefersReducedMotion,
  };
}
