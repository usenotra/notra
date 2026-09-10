"use client";

import { useEffect, useRef } from "react";

export function useDitherPainted(onPainted?: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onPainted) {
      return;
    }
    const root = ref.current;
    if (!root) {
      return;
    }

    let cancelled = false;
    let frameA = 0;
    let frameB = 0;

    const finish = () => {
      if (cancelled) {
        return;
      }
      onPainted();
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
  }, [onPainted]);

  return ref;
}
