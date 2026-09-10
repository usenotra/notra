"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { tween } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  LazyMotion,
  m,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  CHAT_SUGGESTION_ROTATE_MS,
  CHAT_SUGGESTION_VISIBLE_COUNT,
  CHAT_SUGGESTIONS,
} from "@/constants/chat-suggestions";
import { localStorageKeys } from "@/constants/storage";
import { useChatSuggestionsDismissal } from "@/lib/hooks/use-chat-suggestions-dismissal";
import type {
  ChatSuggestionsProps,
  SuggestionCardProps,
} from "@/types/components/chat-suggestions";

const SWAP_DISTANCE_PX = 6;
const SWAP_BLUR_PX = 6;
const SWAP_STAGGER_S = 0.04;

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((module) => module.default);

const rest = {
  opacity: 1,
  transform: "translateY(0px)",
  filter: "blur(0px)",
};

function suggestionPageSlice<T>(
  items: T[],
  page: number,
  visibleCount: number
) {
  if (items.length === 0 || visibleCount <= 0) {
    return items;
  }

  const pageCount = Math.max(1, Math.ceil(items.length / visibleCount));
  const start = (page % pageCount) * visibleCount;
  return items.slice(start, start + visibleCount);
}

function SuggestionCard({
  suggestion,
  disabled,
  hidden,
  onSelect,
  layout,
}: SuggestionCardProps) {
  const isList = layout === "list";
  const isPresent = useIsPresent();

  return (
    <button
      className={cn(
        "bg-muted/70 hover:bg-muted disabled:hover:bg-muted/70 duration-normal flex w-full cursor-pointer text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        isList
          ? "relative h-9 overflow-hidden rounded-lg"
          : "h-full flex-col items-start gap-2 rounded-xl px-3.5 py-3"
      )}
      disabled={disabled || hidden || !isPresent}
      onClick={() => onSelect(suggestion.prompt)}
      tabIndex={hidden || !isPresent ? -1 : undefined}
      type="button"
    >
      {isList ? (
        <span className="absolute inset-0 flex items-center gap-2.5 px-3">
          <HugeiconsIcon
            className="text-muted-foreground size-4 shrink-0"
            icon={suggestion.icon}
          />
          <span className="text-foreground min-w-0 truncate text-sm font-medium tracking-tight">
            {suggestion.title}
          </span>
        </span>
      ) : (
        <>
          <HugeiconsIcon
            className="text-muted-foreground size-4 shrink-0"
            icon={suggestion.icon}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium tracking-tight">
              {suggestion.title}
            </span>
            <span className="text-muted-foreground text-xs leading-snug">
              {suggestion.description}
            </span>
          </span>
        </>
      )}
    </button>
  );
}

function SuggestionListItem(props: SuggestionCardProps) {
  const { reduceMotion, slotIndex } = props;
  const swapTransition = {
    ...tween("slow", "emphasized"),
    delay: reduceMotion ? 0 : slotIndex * SWAP_STAGGER_S,
  };
  const fromBelow = reduceMotion
    ? { opacity: 0, transform: "translateY(0px)", filter: "blur(0px)" }
    : {
        opacity: 0,
        transform: `translateY(${SWAP_DISTANCE_PX}px)`,
        filter: `blur(${SWAP_BLUR_PX}px)`,
      };
  const toAbove = reduceMotion
    ? { opacity: 0, transform: "translateY(0px)", filter: "blur(0px)" }
    : {
        opacity: 0,
        transform: `translateY(-${SWAP_DISTANCE_PX}px)`,
        filter: `blur(${SWAP_BLUR_PX}px)`,
      };

  return (
    <m.li
      animate={rest}
      className="min-w-0"
      exit={toAbove}
      initial={fromBelow}
      style={{ gridArea: `${slotIndex + 1} / 1` }}
      transition={swapTransition}
    >
      <SuggestionCard {...props} />
    </m.li>
  );
}

export function ChatSuggestions({
  onSelect,
  disabled,
  hidden = false,
  suggestions = CHAT_SUGGESTIONS,
  dismissStorageKey = localStorageKeys.chatSuggestionsDismissed,
  layout = "grid",
  rotate = false,
  rotateIntervalMs = CHAT_SUGGESTION_ROTATE_MS,
  visibleCount = CHAT_SUGGESTION_VISIBLE_COUNT,
}: ChatSuggestionsProps) {
  const shouldReduceMotion = useReducedMotion();
  const { dismissed, dismiss } = useChatSuggestionsDismissal(dismissStorageKey);
  const [page, setPage] = useState(0);
  const isPointerInside = useRef(false);
  const isFocusInside = useRef(false);
  const isList = layout === "list";
  const pageCount = Math.max(1, Math.ceil(suggestions.length / visibleCount));
  const shouldRotate = rotate && pageCount > 1 && !hidden && !dismissed;

  useEffect(() => {
    if (hidden) {
      isPointerInside.current = false;
      isFocusInside.current = false;
    }
  }, [hidden]);

  useEffect(() => {
    if (!shouldRotate) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!isPointerInside.current && !isFocusInside.current) {
        setPage((current) => current + 1);
      }
    }, rotateIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [rotateIntervalMs, shouldRotate]);

  const displayedSuggestions = rotate
    ? suggestionPageSlice(suggestions, page, visibleCount)
    : suggestions;

  if (dismissed) {
    return null;
  }

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <m.section
        animate={
          shouldReduceMotion
            ? undefined
            : { opacity: hidden ? 0 : 1, y: hidden ? -2 : 0 }
        }
        aria-hidden={hidden}
        aria-label="Example prompts"
        className={cn("flex w-full flex-col", isList ? "gap-1.5" : "gap-2")}
        initial={false}
        onBlurCapture={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return;
          }
          isFocusInside.current = false;
        }}
        onFocusCapture={() => {
          isFocusInside.current = true;
        }}
        onPointerEnter={() => {
          isPointerInside.current = true;
        }}
        onPointerLeave={() => {
          isPointerInside.current = false;
        }}
        style={{ pointerEvents: hidden ? "none" : undefined }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Get started with some examples
          </p>
          <Button
            aria-label="Dismiss examples"
            disabled={disabled || hidden}
            onClick={dismiss}
            size="icon-xs"
            tabIndex={hidden ? -1 : undefined}
            variant="ghost"
          >
            <HugeiconsIcon
              className="text-muted-foreground size-3.5"
              icon={Cancel01Icon}
            />
          </Button>
        </div>
        <ul
          className={cn(
            isList ? "grid gap-1" : "grid grid-cols-1 gap-2 sm:grid-cols-3"
          )}
        >
          <AnimatePresence initial={false}>
            {displayedSuggestions.map((suggestion, index) => {
              const card = (
                <SuggestionCard
                  disabled={disabled}
                  hidden={hidden}
                  layout={layout}
                  onSelect={onSelect}
                  reduceMotion={Boolean(shouldReduceMotion)}
                  slotIndex={index}
                  suggestion={suggestion}
                />
              );

              if (isList) {
                return (
                  <SuggestionListItem
                    key={suggestion.title}
                    disabled={disabled}
                    hidden={hidden}
                    layout={layout}
                    onSelect={onSelect}
                    reduceMotion={Boolean(shouldReduceMotion)}
                    slotIndex={index}
                    suggestion={suggestion}
                  />
                );
              }

              return (
                <m.li
                  animate={
                    shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
                  }
                  className="min-w-0"
                  initial={
                    shouldReduceMotion ? undefined : { opacity: 0, y: 4 }
                  }
                  key={suggestion.title}
                  transition={{
                    duration: 0.35,
                    delay: 0.05 + index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {card}
                </m.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </m.section>
    </LazyMotion>
  );
}
