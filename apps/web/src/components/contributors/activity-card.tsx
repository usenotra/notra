import type { ActivityCardProps } from "~types/contributors";

import { ViewAllLink } from "@/components/contributors/view-all-link";
import { DeferredDithering } from "@/components/deferred-dithering";
import { ACTIVITY_CARD_DITHER_MAX_PIXELS } from "@/constants/dithering";

export function ActivityCard({
  title,
  description,
  viewAllHref,
  viewAllLabel,
  children,
}: ActivityCardProps) {
  return (
    <div className="relative flex min-w-0 flex-col gap-7 overflow-clip rounded-[0.8125rem] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-6 [box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#ECECEC_0rem_0rem_0rem_0.0625rem] sm:p-8.75 dark:bg-white/[0.02] dark:bg-none dark:[box-shadow:#0A0D1408_0rem_0.0625rem_0.125rem,#0A0D1408_0rem_0.0625rem_0.125rem,#FFFFFF14_0rem_0rem_0rem_0.0625rem]">
      <DeferredDithering
        className="absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,black_0%,transparent_70%)]"
        colorBack="#00000000"
        colorFront="#8B5CF62D"
        maxPixelCount={ACTIVITY_CARD_DITHER_MAX_PIXELS}
        scale={0.53}
        shape="wave"
        size={2.9}
        speed={0.5}
        type="4x4"
        unmountOffscreen
      />
      <div className="relative z-10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-6">
          <h3 className="font-sans text-xl/7 font-medium tracking-[-0.015em] text-[#0A0D14] sm:text-[1.5625rem]/8 dark:text-white">
            {title}
          </h3>
          <ViewAllLink href={viewAllHref}>{viewAllLabel}</ViewAllLink>
        </div>
        <p className="max-w-[25.5rem] font-sans text-base/6 font-medium text-[#6A6B70] dark:text-white/60">
          {description}
        </p>
      </div>
      <div className="relative z-10 flex flex-col overflow-clip rounded-[0.5625rem] bg-white [box-shadow:#ECECEC_0rem_0rem_0rem_0.0625rem,#0A0D1408_0rem_0.0625rem_0.125rem] dark:bg-white/[0.03] dark:[box-shadow:#FFFFFF14_0rem_0rem_0rem_0.0625rem]">
        {children}
      </div>
    </div>
  );
}
