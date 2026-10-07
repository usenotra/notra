import { Link } from "@tanstack/react-router";

import { CompareLockup } from "@/components/compare/compare-logo";
import type { CompareCompetitorProps } from "@/types/compare";
import { getCompareHref, getCompareTitle } from "@/utils/compare";

export function CompareCard({ competitor }: CompareCompetitorProps) {
  return (
    <article className="group relative flex h-full flex-col gap-5 rounded-[1.25rem] bg-white p-5 [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] transition-[box-shadow] duration-200 hover:[box-shadow:#E0E0E0_0_0_0_0.0625rem,#28282814_0_0.25rem_1rem] dark:bg-white/[0.02] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] dark:hover:[box-shadow:#FFFFFF29_0_0_0_0.0625rem]">
      <Link
        aria-label={getCompareTitle(competitor)}
        className="focus-visible:ring-primary absolute inset-0 z-0 cursor-pointer rounded-[1.25rem] outline-none focus-visible:ring-2"
        to={getCompareHref(competitor)}
      />
      <div className="pointer-events-none relative z-10 flex h-full flex-col gap-5">
        <CompareLockup competitor={competitor} size="sm" />
        <div className="flex flex-col gap-1.5">
          <h3 className="font-sans text-[1.0625rem] leading-[1.29] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
            {getCompareTitle(competitor)}
          </h3>
          <p className="font-sans text-[0.875rem] leading-[1.46] tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
            {competitor.summary}
          </p>
        </div>
      </div>
    </article>
  );
}
