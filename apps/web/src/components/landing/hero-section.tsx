"use client";

import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HeroCollage } from "@/components/landing/hero-collage";
import { HeroDither } from "@/components/landing/hero-dither";
import { HeroHeadline } from "@/components/landing/hero-headline";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  HERO_BOOK_A_CALL_HREF,
  HERO_HEADLINE_CYCLE,
  HERO_HEADLINE_CYCLE_MS,
  HERO_SIGNUP_SOURCE,
  HERO_SUBHEAD,
} from "@/constants/landing/hero";

const CTA_BUTTON_CLASSNAME =
  "h-auto rounded-[2.5625rem] px-4 py-3 font-display font-medium text-[1.125rem] leading-[1.14] tracking-[-0.015em] sm:px-6";

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const word = HERO_HEADLINE_CYCLE[index] ?? HERO_HEADLINE_CYCLE[0];

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_HEADLINE_CYCLE.length);
    }, HERO_HEADLINE_CYCLE_MS);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  if (!word) {
    return null;
  }

  return (
    <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
      <div className="relative isolate overflow-clip rounded-3xl bg-[#C8B2EE40] lg:h-[59.9375rem] dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>

        <div className="relative flex h-full w-full flex-col items-center">
          <div className="flex flex-col items-center gap-8 px-6 pt-20 pb-2 sm:gap-10 sm:pt-24 lg:pt-[7.5rem]">
            <div className="flex flex-col items-center gap-7">
              <HeroHeadline word={word} />
              <p className="max-w-[42.875rem] text-center font-sans text-[1.0625rem] leading-[1.14] font-medium tracking-[-0.005em] text-pretty text-[#1E1E1EBF] sm:text-[1.25rem] dark:text-white/70">
                {HERO_SUBHEAD}
              </p>
            </div>

            <div className="flex flex-row items-center justify-center gap-4 sm:gap-7">
              <CtaButton
                className={CTA_BUTTON_CLASSNAME}
                nativeButton={false}
                render={<TrackedSignupLink source={HERO_SIGNUP_SOURCE} />}
                variant="primary"
              >
                Start for free
              </CtaButton>
              <CtaButton
                className={CTA_BUTTON_CLASSNAME}
                nativeButton={false}
                render={<Link href={HERO_BOOK_A_CALL_HREF} />}
                variant="light"
              >
                Book a Call
              </CtaButton>
            </div>
          </div>

          <div className="mt-9 flex w-full flex-1 flex-col items-center overflow-clip py-3.75 sm:mt-16.25">
            <div className="flex w-full flex-col items-center px-3">
              <HeroCollage engine={word.engine} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
