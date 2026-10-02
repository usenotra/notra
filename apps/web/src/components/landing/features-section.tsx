import { cn } from "@notra/ui/lib/utils";

import {
  FEATURES_ENGINES_COPY,
  FEATURES_GAPS_COPY,
  FEATURES_HEADING,
  FEATURES_SHARE_COPY,
  FEATURES_SHARE_FRAME,
  FEATURES_SUBCOPY_LINE_ONE,
  FEATURES_SUBCOPY_LINE_TWO,
  FEATURES_TRAFFIC_COPY,
} from "@/constants/landing/features";
import type { FeaturesCardShellProps } from "@/types/landing/features";

import { FeaturesCardEngines } from "./features-card-engines";
import { FeaturesCardGaps } from "./features-card-gaps";
import { FeaturesCardShare } from "./features-card-share";
import { FeaturesCardTraffic } from "./features-card-traffic";

function FeaturesCard({
  copy,
  footnote,
  className,
  children,
}: FeaturesCardShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col items-start overflow-clip rounded-[0.8125rem] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-6 [box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#ECECEC_0rem_0rem_0rem_0.0625rem] sm:p-8.75 dark:bg-white/[0.02] dark:bg-none dark:[box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#FFFFFF14_0rem_0rem_0rem_0.0625rem]",
        className
      )}
    >
      <div className="relative z-10 flex w-full flex-col items-start gap-1.5">
        <h3 className="font-sans text-xl/7 font-medium tracking-[-0.015em] text-[#0A0D14] sm:text-[1.5625rem]/8 dark:text-white">
          {copy.title}
        </h3>
        <p className="w-full max-w-[34rem] font-sans text-base/6 font-medium text-[#6A6B70] dark:text-white/60">
          {copy.description}
        </p>
      </div>
      <div className="relative z-10 -mx-6 mt-2 flex h-[24.5rem] min-w-0 flex-col self-stretch overflow-hidden [mask-image:linear-gradient(to_bottom,black_78%,transparent)] px-6 pt-6">
        {children}
      </div>
      {footnote ? (
        <p className="relative z-10 mt-2 font-sans text-xs text-[#6A6B70] dark:text-white/50">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="mx-auto flex w-full max-w-360 flex-col items-center px-6 pt-20 antialiased [font-synthesis:none] sm:px-12 lg:px-20 lg:pt-35">
      <div className="flex w-full flex-col items-center gap-13.5">
        <header className="flex flex-col items-center gap-4">
          <h2 className="font-display text-center text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-black sm:text-[2.25rem] lg:text-[3.0625rem]/14 dark:text-white">
            {FEATURES_HEADING}
          </h2>
          <p className="font-display w-full max-w-206.25 text-center text-lg/7 font-medium tracking-[-0.01em] text-balance text-[#1E1E1EBF] sm:text-xl/7.5 dark:text-white/70">
            {FEATURES_SUBCOPY_LINE_ONE}
            <br />
            {FEATURES_SUBCOPY_LINE_TWO}
          </p>
        </header>
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
          <FeaturesCard copy={FEATURES_ENGINES_COPY}>
            <FeaturesCardEngines />
          </FeaturesCard>
          <FeaturesCard
            copy={FEATURES_SHARE_COPY}
            footnote={FEATURES_SHARE_FRAME.footnote}
          >
            <FeaturesCardShare />
          </FeaturesCard>
          <FeaturesCard copy={FEATURES_TRAFFIC_COPY}>
            <FeaturesCardTraffic />
          </FeaturesCard>
          <FeaturesCard copy={FEATURES_GAPS_COPY}>
            <FeaturesCardGaps />
          </FeaturesCard>
        </div>
      </div>
    </section>
  );
}
