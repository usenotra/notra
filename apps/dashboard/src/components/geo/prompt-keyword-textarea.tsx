"use client";

import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  HOVER_CARD_CLOSE_DELAY_MS,
  HOVER_CARD_DELAY_MS,
} from "@notra/ui/constants/hover-card";
import { useComposedRefs } from "@notra/ui/hooks/compose-refs";
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import { cn } from "@/lib/utils";
import type { PromptKeywordTextareaProps } from "@/types/geo";
import { findPromptKeywordSegments } from "@/utils/geo-prompt-keywords";

export const PromptKeywordTextarea = forwardRef<
  HTMLTextAreaElement,
  PromptKeywordTextareaProps
>(function PromptKeywordTextarea(
  {
    className,
    keywords,
    onChange,
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onScroll,
    value,
    ...props
  },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef(new Map<number, HTMLElement>());
  const hoverTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pendingHoverIndexRef = useRef<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const triggerIdPrefix = useId();
  const composedRef = useComposedRefs(ref, textareaRef);
  const segments = useMemo(() => {
    let start = 0;
    return findPromptKeywordSegments(value, keywords).map((segment) => {
      const positionedSegment = { ...segment, start };
      start += segment.text.length;
      return positionedSegment;
    });
  }, [keywords, value]);
  const hasMatches = segments.some((segment) => segment.keyword !== null);
  const activeIndex = focusedIndex ?? hoveredIndex;

  function cancelPointerClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function clearPointerHover() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    cancelPointerClose();
    pendingHoverIndexRef.current = null;
    setHoveredIndex(null);
  }

  function schedulePointerClose() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    pendingHoverIndexRef.current = null;
    cancelPointerClose();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setHoveredIndex(null);
    }, HOVER_CARD_CLOSE_DELAY_MS);
  }

  function schedulePointerHover(index: number | null) {
    if (index === null) {
      schedulePointerClose();
      return;
    }

    if (index === hoveredIndex || index === pendingHoverIndexRef.current) {
      cancelPointerClose();
      return;
    }

    clearPointerHover();
    pendingHoverIndexRef.current = index;
    hoverTimerRef.current = window.setTimeout(() => {
      if (pendingHoverIndexRef.current === index) {
        pendingHoverIndexRef.current = null;
        hoverTimerRef.current = null;
        setHoveredIndex(index);
      }
    }, HOVER_CARD_DELAY_MS);
  }

  function syncOverlayScroll(textarea: HTMLTextAreaElement) {
    if (overlayContentRef.current) {
      overlayContentRef.current.style.transform = `translate3d(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px, 0)`;
    }
  }

  useLayoutEffect(() => {
    if (textareaRef.current) {
      syncOverlayScroll(textareaRef.current);
    }
  }, [segments]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  return (
    <div className="relative grid">
      <Textarea
        className={cn(
          "relative z-20 col-start-1 row-start-1 leading-5 transition-[border-color,box-shadow]",
          hasMatches &&
            "caret-foreground selection:text-foreground text-transparent",
          className
        )}
        onChange={(event) => {
          clearPointerHover();
          onChange?.(event);
        }}
        onPointerDown={(event) => {
          clearPointerHover();
          onPointerDown?.(event);
        }}
        onPointerLeave={(event) => {
          schedulePointerClose();
          onPointerLeave?.(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 0) {
            clearPointerHover();
          } else {
            let nextHoveredIndex: number | null = null;
            for (const [index, mark] of markRefs.current) {
              const intersectsPointer = Array.from(mark.getClientRects()).some(
                (rect) =>
                  event.clientX >= rect.left &&
                  event.clientX <= rect.right &&
                  event.clientY >= rect.top &&
                  event.clientY <= rect.bottom
              );
              if (intersectsPointer) {
                nextHoveredIndex = index;
                break;
              }
            }
            schedulePointerHover(nextHoveredIndex);
          }
          onPointerMove?.(event);
        }}
        onScroll={(event) => {
          syncOverlayScroll(event.currentTarget);
          clearPointerHover();
          onScroll?.(event);
        }}
        ref={composedRef}
        value={value}
        {...props}
      />
      {hasMatches ? (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg border border-transparent px-2.5 py-2 text-base leading-5 wrap-break-word whitespace-pre-wrap focus-within:z-30 md:text-sm">
          <div ref={overlayContentRef}>
            {segments.map((segment, index) => {
              if (!segment.keyword) {
                return (
                  <span
                    aria-hidden="true"
                    className="text-foreground"
                    key={segment.start}
                  >
                    {segment.text}
                  </span>
                );
              }

              const keyword = segment.keyword;
              const previousText = segments[index - 1]?.text ?? "";
              const nextText = segments[index + 1]?.text ?? "";
              const precededByPunctuation = /\p{P}$/u.test(previousText);
              const followedByPunctuation = /^\p{P}/u.test(nextText);
              const triggerId = `${triggerIdPrefix}-${index}`;
              const label = (
                <button
                  aria-label={`Search Console metrics for ${keyword.query}: ${keyword.impressions.toLocaleString("en-US")} impressions, ${keyword.clicks.toLocaleString("en-US")} clicks, position ${keyword.position.toLocaleString("en-US", { maximumFractionDigits: 1 })}`}
                  className={cn(
                    "pointer-events-none inline rounded-[5px] bg-blue-500/10 text-blue-700 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.65),inset_0_1px_2px_rgb(255_255_255_/_0.9),inset_0_-1px_2px_rgb(37_99_235_/_0.12)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 dark:bg-blue-400/15 dark:text-blue-300 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.14),inset_0_1px_2px_rgb(255_255_255_/_0.12),inset_0_-1px_2px_rgb(15_23_42_/_0.35)]",
                    !precededByPunctuation && "-ml-0.5 pl-0.5",
                    !followedByPunctuation && "-mr-0.5 pr-0.5"
                  )}
                  id={triggerId}
                  type="button"
                >
                  {segment.text}
                </button>
              );

              return (
                <HoverCard
                  key={segment.start}
                  open={activeIndex === index}
                  triggerId={triggerId}
                >
                  <HoverCardTrigger
                    closeDelay={0}
                    id={triggerId}
                    onBlur={() => {
                      setFocusedIndex((current) =>
                        current === index ? null : current
                      );
                    }}
                    onFocus={() => {
                      clearPointerHover();
                      setFocusedIndex(index);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setFocusedIndex(null);
                      }
                    }}
                    ref={(node) => {
                      if (node) {
                        markRefs.current.set(index, node);
                      } else {
                        markRefs.current.delete(index);
                      }
                    }}
                    render={label}
                  />
                  <TrafficBreakdownCard
                    aside="Last 28 days"
                    icon={<Google className="size-4" />}
                    onPointerEnter={cancelPointerClose}
                    onPointerLeave={schedulePointerClose}
                    title="Google Search Console"
                  >
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-1.5 text-xs">
                      <dt className="text-muted-foreground">Query</dt>
                      <dd className="truncate text-right font-medium">
                        {keyword.query}
                      </dd>
                      <dt className="text-muted-foreground">Impressions</dt>
                      <dd className="text-right tabular-nums">
                        {keyword.impressions.toLocaleString("en-US")}
                      </dd>
                      <dt className="text-muted-foreground">Clicks</dt>
                      <dd className="text-right tabular-nums">
                        {keyword.clicks.toLocaleString("en-US")}
                      </dd>
                      <dt className="text-muted-foreground">Position</dt>
                      <dd className="text-right tabular-nums">
                        {keyword.position.toLocaleString("en-US", {
                          maximumFractionDigits: 1,
                        })}
                      </dd>
                    </dl>
                  </TrafficBreakdownCard>
                </HoverCard>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
});
