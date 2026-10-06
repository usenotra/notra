import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";

import { HeroDither } from "@/components/landing/hero-dither";
import {
  GITHUB_CONNECT_HREF,
  GITHUB_CONNECT_LABEL,
  GITHUB_HEADLINE,
  GITHUB_HERO_SUBHEAD,
  GITHUB_MARKETPLACE_HREF,
  GITHUB_MARKETPLACE_LABEL,
} from "@/constants/github-integration";

const HERO_BUTTON_CLASSNAME =
  "h-auto rounded-[2.5625rem] px-6.5 py-3 text-[0.9375rem] leading-[1.1875rem] tracking-[-0.01em]";

export function GithubHero() {
  return (
    <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
      <div className="relative isolate overflow-clip rounded-3xl">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>

        <div className="relative flex flex-col items-center gap-8 px-6 pt-28 pb-22 sm:gap-9 lg:pt-[8.5rem]">
          <h1 className="flex flex-col items-center gap-2.5 text-center font-sans text-[2.25rem] leading-[1.17] font-semibold tracking-[-0.02em] text-[#1E1E1E] sm:text-[3rem] lg:text-[3.75rem] lg:leading-[4.375rem] dark:text-white">
            <span className="flex flex-wrap items-center justify-center gap-3.5">
              {GITHUB_HEADLINE.pre}
              <span className="flex items-center rounded-[0.875rem] bg-[#1F232814] px-4 py-0.5 text-[#1F2328] dark:bg-white/10 dark:text-white">
                {GITHUB_HEADLINE.highlight}
              </span>
            </span>
            <span className="flex flex-wrap items-center justify-center gap-3">
              {GITHUB_HEADLINE.secondLinePre}
              <span className="text-primary">{GITHUB_HEADLINE.accent}</span>
            </span>
          </h1>

          <p className="max-w-[40rem] text-center font-sans text-[1.1875rem] leading-[1.6875rem] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/75">
            {GITHUB_HERO_SUBHEAD}
          </p>

          <div className="mt-1.5 flex flex-col items-center gap-3.5 sm:flex-row">
            <CtaButton
              className={`${HERO_BUTTON_CLASSNAME} font-semibold [box-shadow:#8B5CF640_0_0_0_0.5rem]`}
              nativeButton={false}
              render={<a href={GITHUB_CONNECT_HREF}>{GITHUB_CONNECT_LABEL}</a>}
              variant="primary"
            />
            <CtaButton
              className={HERO_BUTTON_CLASSNAME}
              nativeButton={false}
              render={<Link to={GITHUB_MARKETPLACE_HREF} />}
              variant="light"
            >
              {GITHUB_MARKETPLACE_LABEL}
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}
