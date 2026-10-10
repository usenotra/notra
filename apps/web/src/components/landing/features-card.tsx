import { cn } from "@notra/ui/lib/utils";

import type { FeaturesCardShellProps } from "@/types/landing/features";

export function FeaturesCard({
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
