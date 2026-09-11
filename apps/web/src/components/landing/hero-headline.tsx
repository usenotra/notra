"use client";

import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { tween } from "@notra/ui/lib/motion";
import Scritto from "@scritto/react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { createElement, useSyncExternalStore, type ReactNode } from "react";

import {
  HERO_HEADLINE_LINE_ONE,
  HERO_HEADLINE_LINE_TWO_PREFIX,
  HERO_HEADLINE_SUFFIX,
} from "@/constants/landing/hero";
import type { HeroCycleWord, HeroHeadlineProps } from "@/types/landing/hero";

const ICON_SLOT_CLASS =
  "relative ml-[0.22em] inline-flex size-[1cap] shrink-0 items-center justify-center overflow-visible align-baseline";

const ICON_SWAP = tween("slower", "emphasizedInOut");
const ICON_HIDDEN = { opacity: 0, transform: "scale(0.94)" } as const;
const ICON_SHOWN = { opacity: 1, transform: "scale(1)" } as const;

function subscribeIsClient() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(
    subscribeIsClient,
    () => true,
    () => false
  );
}

function EngineMark({
  engine,
  animated,
}: Pick<HeroCycleWord, "engine"> & { animated: boolean }) {
  return (
    <span className={ICON_SLOT_CLASS}>
      <AnimatePresence initial={false}>
        <m.span
          animate={ICON_SHOWN}
          className="absolute inset-0 flex items-center justify-center [&_svg]:size-full"
          exit={animated ? ICON_HIDDEN : undefined}
          initial={animated ? ICON_HIDDEN : false}
          key={engine}
          transition={animated ? ICON_SWAP : { duration: 0 }}
        >
          <EngineIcon className="size-full" engine={engine} />
        </m.span>
      </AnimatePresence>
    </span>
  );
}

function HeadlineFlow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return createElement("scritto-flow", { className }, children);
}

function HeadlineLineTwo({
  word,
  animated,
}: {
  word: HeroCycleWord;
  animated: boolean;
}) {
  const morph = useIsClient();
  const name = morph ? (
    <Scritto
      animated={animated}
      className="ml-[0.16em] align-baseline"
      value={word.text}
    />
  ) : (
    <span className="ml-[0.16em]">{word.text}</span>
  );
  const line = (
    <>
      {HERO_HEADLINE_LINE_TWO_PREFIX}
      <EngineMark animated={animated} engine={word.engine} />
      {name}
      {HERO_HEADLINE_SUFFIX}
    </>
  );

  if (!morph) {
    return <span className="block whitespace-nowrap">{line}</span>;
  }

  return <HeadlineFlow className="whitespace-nowrap">{line}</HeadlineFlow>;
}

export function HeroHeadline({ word }: HeroHeadlineProps) {
  const animated = useReducedMotion() === false;

  return (
    <LazyMotion features={domAnimation}>
      <h1 className="font-display mx-auto w-fit max-w-[20.5rem] text-center text-[clamp(1.5rem,calc(10.1vw-0.42rem),2.0625rem)] leading-[1.08] font-medium tracking-[-0.015em] text-[#1E1E1E] sm:max-w-[56.875rem] sm:text-[3.25rem] sm:font-semibold lg:text-[4.75rem] lg:leading-[1.12] dark:text-white">
        <span className="block whitespace-nowrap">
          {HERO_HEADLINE_LINE_ONE}
        </span>
        <HeadlineLineTwo animated={animated} word={word} />
      </h1>
    </LazyMotion>
  );
}
