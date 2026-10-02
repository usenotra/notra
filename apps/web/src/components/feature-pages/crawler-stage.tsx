import { cn } from "@notra/ui/lib/utils";

import { StageShell } from "@/components/feature-pages/stage-shell";
import { LiveTrafficLog } from "@/components/landing/live-traffic-log";
import {
  AI_CRAWLER_REASON_BAR_CLASS,
  AI_CRAWLER_REASON_TOTALS,
  AI_CRAWLER_VISITS_CHANGE,
  AI_CRAWLER_VISITS_TOTAL,
} from "@/constants/feature-pages/ai-crawler-logs";

export function CrawlerStage() {
  return (
    <StageShell
      className="flex flex-col items-center justify-center gap-6 bg-[position:50%_40%] lg:p-10 xl:flex-row"
      image="/features/stage/dusk.jpg"
    >
      <div className="h-[29rem] w-full min-w-0 xl:flex-1">
        <LiveTrafficLog />
      </div>

      <div className="flex w-full max-w-80 shrink-0 flex-col gap-5.5 rounded-2xl border border-white/90 bg-white/90 p-5.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[0.9375rem]/5 font-semibold text-[#1E1E1E]">
            Bot visits, last 7 days
          </span>
          <span className="font-sans text-[0.8125rem]/4.5 text-[#6B6B6B]">
            Why each engine came to your site
          </span>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[2.75rem]/11 font-semibold tracking-[-0.02em] text-[#1E1E1E]">
            {AI_CRAWLER_VISITS_TOTAL}
          </span>
          <span className="font-sans text-[0.8125rem]/4 font-medium text-[#2F7D4B]">
            {AI_CRAWLER_VISITS_CHANGE}
          </span>
        </div>
        <ul className="flex flex-col gap-4.5">
          {AI_CRAWLER_REASON_TOTALS.map((total) => (
            <li className="flex flex-col gap-2" key={total.reason}>
              <div className="flex items-center justify-between">
                <span className="font-sans text-[0.8125rem]/4 font-medium text-[#1E1E1E]">
                  {total.reason}
                </span>
                <span className="font-mono text-xs/4 text-[#6B6B6B]">
                  {total.count}
                </span>
              </div>
              <div className="flex h-2 w-full rounded-full bg-[#F1EEF6]">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    AI_CRAWLER_REASON_BAR_CLASS[total.reason]
                  )}
                  style={{ width: `${total.share}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </StageShell>
  );
}
