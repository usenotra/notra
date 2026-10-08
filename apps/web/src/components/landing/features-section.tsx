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

import { FeaturesCard } from "./features-card";
import { FeaturesCardEngines } from "./features-card-engines";
import { FeaturesCardGaps } from "./features-card-gaps";
import { FeaturesCardShare } from "./features-card-share";
import { FeaturesCardTraffic } from "./features-card-traffic";

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
