import { cn } from "@notra/ui/lib/utils";

import { MERCH_HERO_CALLOUTS } from "@/constants/merch";

export function MerchHeroCallouts() {
  return (
    <div aria-hidden="true" className="hidden xl:block">
      {MERCH_HERO_CALLOUTS.map((callout) => (
        <div
          className={cn(
            "absolute z-20 flex items-center gap-3",
            callout.className
          )}
          key={callout.number}
        >
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-xs tracking-[0.08em] text-[#1E1E1EA6] dark:text-white/60">
              {callout.number}
            </span>
            <span className="font-sans text-[0.9375rem] leading-5 font-medium tracking-[-0.005em] text-[#1E1E1E] dark:text-white">
              {callout.label}
            </span>
          </div>
          <div className="h-px w-44 bg-[#1E1E1E66] dark:bg-white/40" />
          <div className="bg-primary size-1.75 rounded-full" />
        </div>
      ))}
    </div>
  );
}
