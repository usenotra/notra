"use client";

import { DURATION } from "@notra/ui/lib/motion";
import { useReducedMotion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";

import type { RightPanelSlide } from "@/types/components/right-panel";

const CLOSE_FALLBACK_MS = DURATION.normal * 1000 + 50;

export function useRightPanelSlide(
  open: boolean,
  expanded: boolean
): RightPanelSlide {
  const prefersReducedMotion = useReducedMotion() === true;
  const [slotOpen, setSlotOpen] = useState(open);
  const [entered, setEntered] = useState(open);
  const wasEnteredRef = useRef(open);

  useLayoutEffect(() => {
    if (open) {
      setSlotOpen(true);
      if (prefersReducedMotion || expanded) {
        setEntered(true);
        wasEnteredRef.current = true;
        return;
      }

      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          setEntered(true);
          wasEnteredRef.current = true;
        });
      });

      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }

    const shouldWaitForExit =
      wasEnteredRef.current && !prefersReducedMotion && !expanded;
    setEntered(false);
    wasEnteredRef.current = false;
    if (!shouldWaitForExit) {
      setSlotOpen(false);
    }
  }, [expanded, open, prefersReducedMotion]);

  useEffect(() => {
    if (open || entered || !slotOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSlotOpen(false);
    }, CLOSE_FALLBACK_MS);

    return () => window.clearTimeout(timeout);
  }, [entered, open, slotOpen]);

  const onFrameTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.propertyName !== "transform") {
      return;
    }
    if (!open) {
      setSlotOpen(false);
    }
  };

  return { entered, onFrameTransitionEnd, slotOpen };
}
