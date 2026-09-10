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
  CHAT_SUGGESTION_SWAP_BLUR_PX,
  CHAT_SUGGESTION_SWAP_DISTANCE_PX,
  CHAT_SUGGESTION_VISIBLE_COUNT,
  CHAT_SUGGESTIONS,
} from "@/constants/chat-suggestions";
import { localStorageKeys } from "@/constants/storage";
import { useChatSuggestionsDismissal } from "@/lib/hooks/use-chat-suggestions-dismissal";
import type {
  ChatSuggestionsProps,
  SuggestionCardProps,
} from "@/types/components/chat-suggestions";
import { suggestionPageSlice } from "@/utils/chat-suggestions";

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((module) => module.default);

const rest = {
  opacity: 1,
  transform: "translateY(0px)",
  filter: "blur(0px)",
};

const faded = {
  opacity: 0,
  transform: "translateY(0px)",
  filter: "blur(0px)",
};

const swapTransition = tween("slow", "emphasizedInOut");

function SuggestionCard({
  suggestion,
  disabled,
  hidden,
  onSelect,
}: SuggestionCardProps) {
  const isPresent = useIsPresent();

  return (
    <button
      className="bg-muted/70 hover:bg-muted disabled:hover:bg-muted/70 duration-normal flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-xl px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || hidden || !isPresent}
      onClick={() => onSelect(suggestion.prompt)}
      tabIndex={hidden || !isPresent ? -1 : undefined}
      type="button"
    >
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
    </button>
  );
}

function SuggestionListItem({
  suggestion,
  disabled,
  hidden,
  onSelect,
  reduceMotion,
}: SuggestionCardProps) {
  const fromBelow = reduceMotion
    ? faded
    : {
        opacity: 0,
        transform: `translateY(${CHAT_SUGGESTION_SWAP_DISTANCE_PX}px)`,
        filter: `blur(${CHAT_SUGGESTION_SWAP_BLUR_PX}px)`,
      };
  const toAbove = reduceMotion
    ? faded
    : {
        opacity: 0,
        transform: `translateY(-${CHAT_SUGGESTION_SWAP_DISTANCE_PX}px)`,
        filter: `blur(${CHAT_SUGGESTION_SWAP_BLUR_PX}px)`,
      };

  return (
    <li className="h-9 min-w-0">
      <button
        className="bg-muted/70 hover:bg-muted disabled:hover:bg-muted/70 duration-normal relative flex h-9 w-full cursor-pointer overflow-hidden rounded-lg text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || hidden}
        onClick={() => onSelect(suggestion.prompt)}
        tabIndex={hidden ? -1 : undefined}
        type="button"
      >
        <AnimatePresence initial={false}>
          <m.span
            animate={rest}
            className="pointer-events-none absolute inset-0 flex items-center gap-2.5 px-3"
            exit={toAbove}
            initial={fromBelow}
            key={suggestion.title}
            transition={swapTransition}
          >
            <HugeiconsIcon
              className="text-muted-foreground size-4 shrink-0"
              icon={suggestion.icon}
            />
            <span className="text-foreground min-w-0 truncate text-sm font-medium tracking-tight">
              {suggestion.title}
            </span>
          </m.span>
        </AnimatePresence>
      </button>
    </li>
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
  const shouldRotate =
    rotate && suggestions.length > visibleCount && !hidden && !dismissed;

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
            isList
              ? "grid auto-rows-[2.25rem] gap-1"
              : "grid grid-cols-1 gap-2 sm:grid-cols-3"
          )}
        >
          {isList ? (
            displayedSuggestions.map((suggestion, index) => (
              <SuggestionListItem
                key={`slot-${index}`}
                disabled={disabled}
                hidden={hidden}
                layout={layout}
                onSelect={onSelect}
                reduceMotion={Boolean(shouldReduceMotion)}
                slotIndex={index}
                suggestion={suggestion}
              />
            ))
          ) : (
            <AnimatePresence initial={false}>
              {displayedSuggestions.map((suggestion, index) => (
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
                  <SuggestionCard
                    disabled={disabled}
                    hidden={hidden}
                    layout={layout}
                    onSelect={onSelect}
                    reduceMotion={Boolean(shouldReduceMotion)}
                    slotIndex={index}
                    suggestion={suggestion}
                  />
                </m.li>
              ))}
            </AnimatePresence>
          )}
        </ul>
      </m.section>
    </LazyMotion>
  );
}
