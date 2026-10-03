"use client";

import { useLayoutEffect, useRef } from "react";

import { GEO_PROMPTS_TAB_INDICATOR_MS } from "@/constants/geo-prompts";
import type { SlidingTabIndicatorProps, TabIndicatorBox } from "@/types/geo";
import { easeOutQuint } from "@/utils/easing";

function measureActiveTab(list: HTMLElement): TabIndicatorBox | null {
  const tab = list.querySelector<HTMLElement>('[role="tab"][data-active]');
  if (!tab) {
    return null;
  }
  return {
    left: tab.offsetLeft,
    top: tab.offsetTop,
    width: tab.offsetWidth,
    height: tab.offsetHeight,
  };
}

function applyBox(element: HTMLElement, box: TabIndicatorBox) {
  element.style.transform = `translate(${box.left}px, ${box.top}px)`;
  element.style.width = `${box.width}px`;
  element.style.height = `${box.height}px`;
}

/**
 * Tabs indicator for triggers whose width animates when they turn active.
 * The built-in indicator measures its target once and chases it with a CSS
 * transition, so it lags and overshoots while the tabs resize. This one
 * re-measures the active tab every frame and interpolates from where it
 * started, so it lands with the resize in one motion and never leaves the
 * space between the two tabs.
 */
export function SlidingTabIndicator({ value }: SlidingTabIndicatorProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<TabIndicatorBox | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const list = element?.parentElement;
    if (!(element && list)) {
      return;
    }

    const from = boxRef.current;
    const animate =
      from !== null &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      frame = 0;
      const target = measureActiveTab(list);
      if (!target) {
        // The active tab can be marked a frame after this effect runs.
        if (now - start < GEO_PROMPTS_TAB_INDICATOR_MS) {
          frame = requestAnimationFrame(tick);
        }
        return;
      }
      // rAF timestamps mark the frame start and can predate `start`.
      const elapsed = Math.max(0, now - start);
      const progress = animate
        ? Math.min(1, elapsed / GEO_PROMPTS_TAB_INDICATOR_MS)
        : 1;
      const eased = easeOutQuint(progress);
      const box =
        from && progress < 1
          ? {
              left: from.left + (target.left - from.left) * eased,
              top: target.top,
              width: from.width + (target.width - from.width) * eased,
              height: target.height,
            }
          : target;
      boxRef.current = box;
      applyBox(element, box);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    tick(start);

    // Keep following the tab once settled, e.g. when a count changes.
    const observer = new ResizeObserver(() => {
      if (frame !== 0) {
        return;
      }
      const target = measureActiveTab(list);
      if (target) {
        boxRef.current = target;
        applyBox(element, target);
      }
    });
    observer.observe(list);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  return (
    <span
      aria-hidden="true"
      className="bg-background dark:bg-foreground/10 pointer-events-none absolute top-0 left-0 z-0 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
      ref={ref}
    />
  );
}
