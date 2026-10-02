import { cn } from "@notra/ui/lib/utils";
import type { MarketingHeroWashProps } from "~types/marketing-hero-wash";

import { HeroDither } from "@/components/landing/hero-dither";

export function MarketingHeroWash({
  children,
  className,
  title,
  subtitle,
}: MarketingHeroWashProps) {
  return (
    <section className={cn("w-full px-6 pt-6", className)}>
      <div className="relative isolate overflow-clip rounded-3xl bg-[#C8B2EE40] dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>
        <div className="relative flex flex-col items-center gap-5 px-6 pt-28 pb-16 text-center md:px-24 lg:pt-[9.5rem] lg:pb-24">
          <h1 className="font-display max-w-[56.875rem] text-[2.5rem] leading-[1.08] font-medium tracking-[-0.015em] text-balance text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] lg:leading-[1.12] dark:text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-[42.875rem] font-sans text-lg leading-7 font-medium text-balance text-[#1E1E1EBF] dark:text-white/70">
              {subtitle}
            </p>
          ) : null}
          {children ? (
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:gap-7">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
