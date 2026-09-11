"use client";

import { useEffect, useRef } from "react";

export function useDitherPainted(onPainted?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onPaintedRef = useRef(onPainted);
  const hasPaintedCallback = Boolean(onPainted);

  useEffect(() => {
    onPaintedRef.current = onPainted;
  }, [onPainted]);

  useEffect(() => {
    if (!hasPaintedCallback) {
      return;
    }
    const root = ref.current;
    if (!root) {
      return;
    }

    let cancelled = false;
    let frameA = 0;
    let frameB = 0;
    let fired = false;

    const finish = () => {
      if (cancelled || fired) {
        return;
      }
      fired = true;
      onPaintedRef.current?.();
    };

    const arm = () => {
      if (!root.querySelector("canvas")) {
        return false;
      }
      frameA = requestAnimationFrame(() => {
        frameB = requestAnimationFrame(finish);
      });
      return true;
    };

    if (arm()) {
      return () => {
        cancelled = true;
        cancelAnimationFrame(frameA);
        cancelAnimationFrame(frameB);
      };
    }

    const observer = new MutationObserver(() => {
      if (arm()) {
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, [hasPaintedCallback]);

  return ref;
}
