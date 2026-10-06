"use client";

import { ICON_TABS_INDICATOR_MS } from "@notra/ui/constants/icon-tabs";
import {
  applyIndicatorBox,
  easeOutQuint,
  measureActiveTab,
} from "@notra/ui/lib/icon-tabs";
import { cn } from "@notra/ui/lib/utils";
import type {
  SlideInTabIconProps,
  IconTabsIndicatorBox,
  IconTabsIndicatorProps,
  IconTabsListProps,
  IconTabsTriggerProps,
} from "@notra/ui/types/icon-tabs";
import { useLayoutEffect, useRef } from "react";

import { TabsList, TabsTrigger } from "./tabs";

/**
 * Icon that only shows on the active tab: it widens and fades in beside the
 * label, so inactive tabs stay text-only. `IconTabsIndicator` follows the
 * resize frame by frame. `pinned` keeps it visible anyway,
 * e.g. for a live scan spinner.
 */
function SlideInTabIcon({ children, pinned = false }: SlideInTabIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "duration-normal ease-emphasized -me-1.5 flex w-0 shrink-0 items-center justify-center overflow-hidden opacity-0 transition-all group-data-active/tab:me-0 group-data-active/tab:w-4 group-data-active/tab:opacity-100 motion-reduce:transition-none",
        pinned && "me-0 w-4 opacity-100"
      )}
    >
      <span
        className={cn(
          "duration-normal ease-emphasized flex scale-50 items-center transition-transform group-data-active/tab:scale-100 motion-reduce:transition-none",
          pinned && "scale-100"
        )}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * Tabs indicator for triggers whose width animates when they turn active.
 * The built-in indicator measures its target once and chases it with a CSS
 * transition, so it lags and overshoots while the tabs resize. This one
 * re-measures the active tab every frame and interpolates from where it
 * started, so it lands with the resize in one motion and never leaves the
 * space between the two tabs.
 */
function IconTabsIndicator({ value }: IconTabsIndicatorProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<IconTabsIndicatorBox | null>(null);

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
        if (now - start < ICON_TABS_INDICATOR_MS) {
          frame = requestAnimationFrame(tick);
        }
        return;
      }
      // rAF timestamps mark the frame start and can predate `start`.
      const elapsed = Math.max(0, now - start);
      const progress = animate
        ? Math.min(1, elapsed / ICON_TABS_INDICATOR_MS)
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
      applyIndicatorBox(element, box);
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
        applyIndicatorBox(element, target);
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

/** `TabsList` with the sliding indicator. Pair with `IconTabsTrigger`. */
function IconTabsList({ value, children, ...props }: IconTabsListProps) {
  return (
    <TabsList indicator={false} {...props}>
      <IconTabsIndicator value={value} />
      {children}
    </TabsList>
  );
}

/** `TabsTrigger` whose icon only shows, and slides in, while it is active. */
function IconTabsTrigger({
  icon,
  iconPinned,
  className,
  children,
  ...props
}: IconTabsTriggerProps) {
  return (
    <TabsTrigger className={cn("group/tab", className)} {...props}>
      <SlideInTabIcon pinned={iconPinned}>{icon}</SlideInTabIcon>
      {children}
    </TabsTrigger>
  );
}

export { IconTabsList, IconTabsTrigger };
