"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { cn } from "@notra/ui/lib/utils";
import { Link } from "@notra/ui/components/framework-provider";
import type { MouseEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export type SectionTickLevel = "group" | "section";

export interface SectionTickItem {
  id: string;
  href: string;
  label: string;
  level?: SectionTickLevel;
}

/**
 * The tick number is the item's position in the list, so it is derived from the
 * index rather than stored on every item.
 */
function tickNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

const TICK_ROW_PX = 8;
const SCAN_LINE_RATIO = 0.22;

function scrollToHash(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return;
  }

  const path = href.slice(0, hashIndex);
  const hash = href.slice(hashIndex + 1);
  if (path !== window.location.pathname) {
    return;
  }

  const target = document.getElementById(hash);
  if (!target) {
    return;
  }

  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", href);
}

function activeTick(
  items: readonly SectionTickItem[],
  line: number
): { id: string; index: number } | null {
  let current: { id: string; index: number } | null = null;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!item) {
      continue;
    }
    const element = document.getElementById(item.id);
    if (!element) {
      continue;
    }
    if (element.getBoundingClientRect().top <= line) {
      current = { id: item.id, index };
    }
  }

  if (current) {
    return current;
  }

  const firstWithElement = items.findIndex(
    (item) => document.getElementById(item.id) !== null
  );
  const fallback = items[firstWithElement];
  if (!fallback) {
    return null;
  }

  return { id: fallback.id, index: firstWithElement };
}

export function SectionTicks({
  items,
  className,
  ariaLabel,
}: {
  items: readonly SectionTickItem[];
  className?: string;
  ariaLabel?: string;
}) {
  const labels = useUiLabels();
  const markerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const paintedRef = useRef(false);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useLayoutEffect(() => {
    const marker = markerRef.current;
    if (!marker) {
      return;
    }

    let frame = 0;

    const update = () => {
      const next = activeTick(
        itemsRef.current,
        window.innerHeight * SCAN_LINE_RATIO
      );
      if (!next) {
        return;
      }

      marker.style.transition = paintedRef.current
        ? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)"
        : "none";
      marker.style.transform = `translate3d(0, ${next.index * TICK_ROW_PX}px, 0)`;
      marker.style.opacity = "1";
      paintedRef.current = true;
      setActiveId((current) => (current === next.id ? current : next.id));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const resize = new ResizeObserver(onScroll);
    resize.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      aria-label={ariaLabel ?? labels.catalog}
      className={cn(
        "pointer-events-none fixed top-1/2 left-3 z-40 hidden -translate-y-1/2 md:block",
        className
      )}
    >
      <TooltipProvider delay={180}>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute top-[3.5px] left-0 h-px w-8 rounded-full bg-foreground opacity-0 motion-reduce:!transition-none"
            ref={markerRef}
          />
          <ol className="flex flex-col items-start">
            {items.map((item, index) => {
              const isActive = item.id === activeId;
              const isGroup = item.level === "group";
              const number = tickNumber(index);

              return (
                <li className="pointer-events-auto" key={item.id}>
                  <TooltipPrimitive.Root>
                    <TooltipTrigger
                      render={
                        <Link
                          aria-current={isActive ? "location" : undefined}
                          aria-label={`${number} ${item.label}`}
                          className="relative flex h-2 w-8 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          href={item.href}
                          onClick={(event) => scrollToHash(event, item.href)}
                        />
                      }
                    >
                      <span
                        className={cn(
                          "block h-px rounded-full",
                          isGroup
                            ? "w-2.5 bg-foreground/30"
                            : "w-2 bg-foreground/18"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12}>
                      <span className="flex items-baseline gap-2">
                        <span className="text-muted-foreground tabular-nums">
                          {number}
                        </span>
                        <span>{item.label}</span>
                      </span>
                    </TooltipContent>
                  </TooltipPrimitive.Root>
                </li>
              );
            })}
          </ol>
        </div>
      </TooltipProvider>
    </nav>
  );
}
