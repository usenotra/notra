"use client";

import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, domMax, LazyMotion, m } from "motion/react";

import { GEO_ENGINE_NAMES } from "@/constants/landing/geo-engines";
import {
  HERO_HEADLINE_CYCLE,
  HERO_HEADLINE_LINE_ONE,
  HERO_HEADLINE_LINE_TWO_PREFIX,
  HERO_HEADLINE_SUFFIX,
  HERO_WORD_SIZE_DESCENDER_EM,
  HERO_WORD_SIZE_EM,
} from "@/constants/landing/hero";
import type { HeroCycleWord, HeroHeadlineProps } from "@/types/landing/hero";

const WORD_TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;

const WORD_CONTENT_CLASS =
  "inline-flex items-center gap-[0.16em] whitespace-nowrap px-[0.22em] leading-none";

const DESCENDER_PATTERN = /[gjpqy]/;

function wordSizeEm(word: HeroCycleWord): number {
  return DESCENDER_PATTERN.test(word.text)
    ? HERO_WORD_SIZE_DESCENDER_EM
    : HERO_WORD_SIZE_EM;
}

function listEngineNames(): string {
  const names = HERO_HEADLINE_CYCLE.map(
    (word) => GEO_ENGINE_NAMES[word.engine]
  );
  const last = names.at(-1);
  if (names.length < 2 || !last) {
    return names.join("");
  }
  return `${names.slice(0, -1).join(", ")} or ${last}`;
}

function WordContent({ word }: { word: HeroCycleWord }) {
  return (
    <>
      <EngineIcon className="size-[0.68em] shrink-0" engine={word.engine} />
      <span className="inline-block leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {word.text}
      </span>
    </>
  );
}

export function HeroHeadline({ word }: HeroHeadlineProps) {
  return (
    <h1 className="font-display mx-auto w-fit max-w-[20.5rem] text-left text-[clamp(1.5rem,calc(10.1vw-0.42rem),2.0625rem)] leading-[1.08] font-medium tracking-[-0.015em] text-[#1E1E1E] sm:max-w-[56.875rem] sm:text-[3.25rem] sm:font-semibold lg:text-[4.75rem] lg:leading-[1.12] dark:text-white">
      <span className="block whitespace-nowrap">{HERO_HEADLINE_LINE_ONE}</span>
      <span className="flex items-center gap-[0.22em] whitespace-nowrap">
        <LazyMotion features={domMax}>
          <m.span
            className="inline-block"
            layout="position"
            transition={WORD_TRANSITION}
          >
            {HERO_HEADLINE_LINE_TWO_PREFIX}
          </m.span>
          <span className="sr-only">{listEngineNames()}</span>
          <span className="inline-flex items-center">
            <m.span
              aria-hidden
              className={cn(
                "relative inline-grid h-[1em] items-center overflow-hidden",
                "bg-white text-[#1E1E1E] shadow-[0_0.05em_0.22em_rgba(0,0,0,0.1),0_0_0_0.0625rem_rgba(0,0,0,0.04)] dark:bg-white/[0.08] dark:text-white dark:shadow-[0_0_0_0.0625rem_rgba(255,255,255,0.12)]"
              )}
              layout
              style={{ borderRadius: "0.24em" }}
              transition={WORD_TRANSITION}
            >
              <span
                aria-hidden
                className={cn(
                  WORD_CONTENT_CLASS,
                  "invisible col-start-1 row-start-1"
                )}
                style={{ fontSize: `${wordSizeEm(word)}em` }}
              >
                <WordContent word={word} />
              </span>
              <span
                className="absolute inset-0"
                style={{ fontSize: `${wordSizeEm(word)}em` }}
              >
                <AnimatePresence initial={false}>
                  <m.span
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      WORD_CONTENT_CLASS,
                      "absolute inset-0 justify-center"
                    )}
                    exit={{ opacity: 0, y: "-0.3em" }}
                    initial={{ opacity: 0, y: "0.3em" }}
                    key={word.text}
                    layout="position"
                    transition={WORD_TRANSITION}
                  >
                    <WordContent word={word} />
                  </m.span>
                </AnimatePresence>
              </span>
            </m.span>
            <m.span
              className="inline-block"
              layout="position"
              transition={WORD_TRANSITION}
            >
              {HERO_HEADLINE_SUFFIX}
            </m.span>
          </span>
        </LazyMotion>
      </span>
    </h1>
  );
}
