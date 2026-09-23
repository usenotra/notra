"use client";

import {
  CancelCircleIcon,
  Clock01Icon,
  GlobalIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CLAUDE_CHAT_SEARCH_QUERY_MS,
  CLAUDE_CHAT_SEARCH_RESULTS_MS,
  CLAUDE_CHAT_SEARCH_STAGGER_MS,
  CLAUDE_CHAT_SEARCH_STEP_MS,
  CLAUDE_CHAT_SEARCH_VERB_HOLD_MS,
} from "@notra/ui/components/brainless/claude-chat/claude-chat-search-timing";
import { ClaudeChatSpinner } from "@notra/ui/components/brainless/claude-chat/claude-chat-spinner";
import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export interface ClaudeChatSearchResult {
  title: string;
  domain: string;
}

export interface ClaudeChatSearchGroup {
  query: string;
  count: number;
  results: ClaudeChatSearchResult[];
}

export type ClaudeChatSearchStepIcon = "clock" | "check" | "error";

export interface ClaudeChatSearchStep {
  icon: ClaudeChatSearchStepIcon;
  label: string;
}

const EMPTY_STEPS: readonly ClaudeChatSearchStep[] = [];
const ENTER_CLASS =
  "translate-y-0 opacity-100 transition-[opacity,transform] duration-normal ease-emphasized starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";
const FADE_IN_CLASS =
  "animate-in fade-in slide-in-from-top-2 fill-mode-both duration-normal ease-emphasized motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0";
const FADE_IN_SOFT_CLASS =
  "animate-in fade-in fill-mode-both duration-normal ease-emphasized motion-reduce:animate-none motion-reduce:opacity-100";

function faviconSrc(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function SiteFavicon({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn("inline-block rounded-[3px] bg-[#eceae4]", className)}
      />
    );
  }

  return (
    <Image
      alt=""
      className={cn("rounded-[3px] bg-[#eceae4]", className)}
      height={64}
      onError={() => setFailed(true)}
      src={faviconSrc(domain)}
      unoptimized
      width={64}
    />
  );
}

function StepIcon({ icon }: { icon: ClaudeChatSearchStepIcon }) {
  if (icon === "check") {
    return (
      <HugeiconsIcon
        className="text-[#5c5a55]"
        icon={Tick02Icon}
        size={14}
        strokeWidth={1.75}
      />
    );
  }

  if (icon === "error") {
    return (
      <HugeiconsIcon
        className="text-destructive"
        icon={CancelCircleIcon}
        size={14}
        strokeWidth={1.75}
      />
    );
  }

  return (
    <HugeiconsIcon
      className="text-[#8a8680]"
      icon={Clock01Icon}
      size={14}
      strokeWidth={1.75}
    />
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function SearchRow({
  animate,
  children,
}: {
  animate: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5",
        animate && ENTER_CLASS
      )}
    >
      {children}
    </div>
  );
}

function staggerStyle(index: number, startMs = 0) {
  const delay = startMs + index * CLAUDE_CHAT_SEARCH_STAGGER_MS;
  if (delay <= 0) {
    return undefined;
  }
  return { animationDelay: `${delay}ms` };
}

export function ClaudeChatSearch({
  verb = "Entwirren",
  groups,
  steps = EMPTY_STEPS,
  sequential = false,
  reducedMotion = false,
  className,
}: {
  verb?: string;
  groups: readonly ClaudeChatSearchGroup[];
  steps?: readonly ClaudeChatSearchStep[];
  sequential?: boolean;
  reducedMotion?: boolean;
  className?: string;
}) {
  const shouldSequence = sequential && !reducedMotion;
  const [progress, setProgress] = useState({
    queries: 0,
    filled: 0,
    steps: 0,
    done: false,
  });
  const visibleQueries = shouldSequence ? progress.queries : groups.length;
  const filledGroups = shouldSequence ? progress.filled : groups.length;
  const visibleSteps = shouldSequence ? progress.steps : steps.length;
  const finished = shouldSequence ? progress.done : true;

  useEffect(() => {
    if (!shouldSequence) {
      return;
    }

    let cancelled = false;

    async function run() {
      await wait(CLAUDE_CHAT_SEARCH_VERB_HOLD_MS);
      if (cancelled) {
        return;
      }

      for (let index = 0; index < groups.length; index += 1) {
        if (cancelled) {
          return;
        }
        setProgress((current) => ({ ...current, queries: index + 1 }));
        await wait(CLAUDE_CHAT_SEARCH_QUERY_MS);
        if (cancelled) {
          return;
        }
        setProgress((current) => ({ ...current, filled: index + 1 }));
        await wait(CLAUDE_CHAT_SEARCH_RESULTS_MS);
      }

      for (let index = 0; index < steps.length; index += 1) {
        if (cancelled) {
          return;
        }
        setProgress((current) => ({ ...current, steps: index + 1 }));
        await wait(CLAUDE_CHAT_SEARCH_STEP_MS);
      }

      if (!cancelled) {
        setProgress((current) => ({ ...current, done: true }));
      }
    }

    run().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [shouldSequence, groups, steps]);

  const visibleGroups = groups.slice(0, visibleQueries);
  const shownSteps = steps.slice(0, visibleSteps);
  const animateEnter = shouldSequence;

  return (
    <div className={cn("w-full font-sans", className)}>
      <div className="relative flex flex-col gap-4">
        <SearchRow animate={false}>
          <span className="relative flex h-5 w-4 items-center justify-center">
            <span
              className={cn(
                "flex size-3.5 items-center justify-center transition-opacity duration-normal ease-emphasized motion-reduce:transition-none",
                finished && "opacity-0"
              )}
            >
              <ClaudeChatSpinner
                animated={!finished}
                reducedMotion={reducedMotion}
                size={14}
              />
            </span>
          </span>
          <p className="flex h-5 items-center font-serif text-[16px] leading-none tracking-[-0.01em] text-[#8a8680]">
            {verb}
          </p>
        </SearchRow>

        {visibleGroups.length > 0 || shownSteps.length > 0 ? (
          <span
            aria-hidden
            className="absolute top-9 bottom-2 left-[0.4375rem] w-px bg-[#e6e4de] dark:bg-white/10"
          />
        ) : null}

        {visibleGroups.map((group, index) => {
          const filled = index < filledGroups;
          const searching = !filled;

          return (
            <SearchRow animate={animateEnter} key={group.query}>
              <span className="relative flex h-5 w-4 items-center justify-center">
                <HugeiconsIcon
                  className={cn(
                    "text-[#8a8680]",
                    searching && "animate-pulse"
                  )}
                  icon={GlobalIcon}
                  size={14}
                  strokeWidth={1.75}
                />
              </span>
              <div className="flex h-5 min-w-0 items-center justify-between gap-3">
                <p className="truncate text-[13px] leading-5 text-[#3f3e3a] dark:text-foreground">
                  {group.query}
                </p>
                {filled ? (
                  <p
                    className={cn(
                      "shrink-0 text-[12px] leading-5 text-[#9b9890]",
                      animateEnter && FADE_IN_SOFT_CLASS
                    )}
                  >
                    {group.count} Ergebnisse
                  </p>
                ) : null}
              </div>
              {filled ? (
                <ul
                  className={cn(
                    "col-start-2 overflow-hidden rounded-xl border border-[#e8e6e1] bg-white dark:border-white/10 dark:bg-white/5",
                    animateEnter && FADE_IN_SOFT_CLASS
                  )}
                >
                  {group.results.map((result, resultIndex) => (
                    <li
                      className={cn(
                        "flex items-center gap-2.5 border-[#f0eeea] border-b px-3 py-2 last:border-b-0 dark:border-white/8",
                        animateEnter && FADE_IN_CLASS
                      )}
                      key={`${result.domain}-${result.title}`}
                      style={
                        animateEnter
                          ? staggerStyle(resultIndex, CLAUDE_CHAT_SEARCH_STAGGER_MS)
                          : undefined
                      }
                    >
                      <SiteFavicon
                        className="size-3.5 shrink-0"
                        domain={result.domain}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-[#3f3e3a] dark:text-foreground">
                        {result.title}
                      </span>
                      <span className="max-w-[38%] shrink-0 truncate text-[12px] text-[#9b9890]">
                        {result.domain}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </SearchRow>
          );
        })}

        {shownSteps.map((step) => (
          <SearchRow animate={animateEnter} key={step.label}>
            <span className="relative flex h-5 w-4 items-center justify-center">
              <StepIcon icon={step.icon} />
            </span>
            <p
              className={cn(
                "flex h-5 items-center text-[13px] leading-5",
                step.icon === "error"
                  ? "text-destructive"
                  : step.icon === "check"
                    ? "text-[#8a8680]"
                    : "text-[#3f3e3a] dark:text-foreground"
              )}
            >
              {step.label}
            </p>
          </SearchRow>
        ))}
      </div>
    </div>
  );
}
