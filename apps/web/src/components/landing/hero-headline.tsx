"use client";

import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import Scritto from "@scritto/react";
import { useReducedMotion } from "motion/react";
import { createElement, type HTMLAttributes, type ReactNode } from "react";

import {
  HERO_HEADLINE_LINE_ONE,
  HERO_HEADLINE_LINE_TWO_PREFIX,
  HERO_HEADLINE_SUFFIX,
  HERO_HEADLINE_WIDTH_WORD,
} from "@/constants/landing/hero";
import type { HeroCycleWord, HeroHeadlineProps } from "@/types/landing/hero";

const ICON_SLOT_CLASS =
  "ml-[0.22em] inline-block size-[0.75em] overflow-visible align-baseline [&_svg]:block [&_svg]:size-full";

function EngineMark({ engine }: Pick<HeroCycleWord, "engine">) {
  return (
    <span className={ICON_SLOT_CLASS}>
      <EngineIcon className="size-full" engine={engine} />
    </span>
  );
}

function ScrittoFlow({
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children?: ReactNode }) {
  return createElement("scritto-flow", props, children);
}

function HeadlineLineTwo({
  word,
  animated,
}: {
  word: HeroCycleWord;
  animated: boolean;
}) {
  return (
    <span className="whitespace-nowrap">
      {HERO_HEADLINE_LINE_TWO_PREFIX}
      <EngineMark engine={word.engine} />
      {/* Inline style: at connect, ScrittoFlow stamps display:block if it still sees inline. */}
      <ScrittoFlow
        className="ml-[0.16em] align-baseline"
        style={{ display: "inline-block" }}
      >
        <Scritto
          animated={animated}
          className="align-baseline leading-none"
          value={word.text}
        />
      </ScrittoFlow>
      {HERO_HEADLINE_SUFFIX}
    </span>
  );
}

export function HeroHeadline({ word }: HeroHeadlineProps) {
  const reduceMotion = useReducedMotion();

  return (
    <h1 className="font-display mx-auto w-fit max-w-[20.5rem] text-center text-[clamp(1.5rem,calc(10.1vw-0.42rem),2.0625rem)] leading-[1.08] font-medium tracking-[-0.015em] text-[#1E1E1E] sm:max-w-[56.875rem] sm:text-[3.25rem] sm:font-semibold lg:text-[4.75rem] lg:leading-[1.12] dark:text-white">
      <span className="block whitespace-nowrap">{HERO_HEADLINE_LINE_ONE}</span>
      <span className="relative mx-auto block w-fit">
        <span aria-hidden className="invisible whitespace-nowrap">
          {HERO_HEADLINE_LINE_TWO_PREFIX}
          <span className={ICON_SLOT_CLASS} />
          <span className="ml-[0.16em]">{HERO_HEADLINE_WIDTH_WORD.text}</span>
          {HERO_HEADLINE_SUFFIX}
        </span>
        <span className="absolute inset-0 flex justify-center">
          <HeadlineLineTwo animated={!reduceMotion} word={word} />
        </span>
      </span>
    </h1>
  );
}
