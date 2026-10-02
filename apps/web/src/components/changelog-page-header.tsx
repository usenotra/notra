import type { ChangelogPageHeaderProps } from "~types/changelog";

import { HeroDither } from "@/components/landing/hero-dither";

export function ChangelogPageHeader({
  eyebrow,
  title,
  description,
  meta,
}: ChangelogPageHeaderProps) {
  return (
    <section className="w-full px-6 pt-6">
      <div className="relative isolate overflow-clip rounded-3xl bg-[#C8B2EE40] dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>
        <div className="relative mx-auto flex w-full max-w-[53.75rem] flex-col items-center gap-5 px-6 pt-28 pb-16 text-center lg:pt-[9.5rem] lg:pb-24">
          {eyebrow ? (
            <p className="font-sans text-sm font-medium tracking-[0.2em] text-[#1E1E1E99] uppercase dark:text-white/50">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display max-w-[56.875rem] text-[2.5rem] leading-[1.08] font-medium tracking-[-0.015em] text-balance text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] lg:leading-[1.12] dark:text-white">
            {title}
          </h1>
          <div className="max-w-[42.875rem] font-sans text-lg leading-7 font-medium text-balance text-[#1E1E1EBF] dark:text-white/70">
            {description}
          </div>
          {meta ? <div className="pt-1">{meta}</div> : null}
        </div>
      </div>
    </section>
  );
}
