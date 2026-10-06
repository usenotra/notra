import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";

import { HeroDither } from "@/components/landing/hero-dither";
import {
  GRANOLA_CONNECT_HREF,
  GRANOLA_CONNECT_LABEL,
  GRANOLA_HEADLINE,
  GRANOLA_HERO_SUBHEAD,
  GRANOLA_MARKETPLACE_HREF,
  GRANOLA_MARKETPLACE_LABEL,
} from "@/constants/granola-integration";

const HERO_BUTTON_CLASSNAME =
  "h-auto rounded-[2.5625rem] px-6.5 py-3 text-[0.9375rem] leading-[1.1875rem] tracking-[-0.01em]";

export function GranolaHero() {
  return (
    <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
      <div className="relative isolate overflow-clip rounded-3xl">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>

        <div className="relative flex flex-col items-center gap-8 px-6 pt-28 pb-22 sm:gap-9 lg:pt-[8.5rem]">
          <h1 className="flex flex-col items-center gap-2.5 text-center font-sans text-[2.25rem] leading-[1.17] font-semibold tracking-[-0.02em] text-[#1E1E1E] sm:text-[3rem] lg:text-[3.75rem] lg:leading-[4.375rem] dark:text-white">
            <span className="flex flex-wrap items-center justify-center gap-3.5">
              {GRANOLA_HEADLINE.pre}
              <span className="flex items-center rounded-[0.875rem] bg-[#B2C24859] px-4 py-0.5 text-[#47511A] dark:bg-[#B2C24833] dark:text-[#D4E07A]">
                {GRANOLA_HEADLINE.highlight}
              </span>
            </span>
            <span className="flex flex-wrap items-center justify-center gap-3">
              {GRANOLA_HEADLINE.secondLinePre}
              <span className="text-primary">{GRANOLA_HEADLINE.accent}</span>
            </span>
          </h1>

          <p className="max-w-[40rem] text-center font-sans text-[1.1875rem] leading-[1.6875rem] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/75">
            {GRANOLA_HERO_SUBHEAD}
          </p>

          <div className="mt-1.5 flex flex-col items-center gap-3.5 sm:flex-row">
            <CtaButton
              className={`${HERO_BUTTON_CLASSNAME} font-semibold [box-shadow:#8B5CF640_0_0_0_0.5rem]`}
              nativeButton={false}
              render={
                <a href={GRANOLA_CONNECT_HREF}>{GRANOLA_CONNECT_LABEL}</a>
              }
              variant="primary"
            />
            <CtaButton
              className={HERO_BUTTON_CLASSNAME}
              nativeButton={false}
              render={<Link to={GRANOLA_MARKETPLACE_HREF} />}
              variant="light"
            >
              {GRANOLA_MARKETPLACE_LABEL}
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}
