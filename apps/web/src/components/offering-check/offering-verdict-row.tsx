import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";

import { OFFERING_VERDICTS } from "@/constants/offering-check";
import type {
  OfferingVerdict,
  OfferingVerdictRowProps,
} from "@/types/offering-check";

const VERDICT_ICON: Record<OfferingVerdict, IconSvgElement> = {
  knows: CheckmarkCircle02Icon,
  vague: HelpCircleIcon,
  confused: Alert02Icon,
  unknown: CancelCircleIcon,
};

export function OfferingVerdictRow({
  kind,
  label,
  verdict,
  summary,
  activity,
}: OfferingVerdictRowProps) {
  const copy = verdict ? OFFERING_VERDICTS[verdict] : null;

  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
          copy?.badgeClassName ?? "bg-muted text-muted-foreground"
        )}
      >
        <HugeiconsIcon
          className={cn(
            "size-5.5",
            verdict ? null : "animate-spin motion-reduce:animate-none"
          )}
          icon={verdict ? VERDICT_ICON[verdict] : Loading03Icon}
          strokeWidth={1.75}
        />
      </span>
      <div aria-live="polite" className="flex min-w-0 flex-col gap-1">
        <p className="text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50">
          {label}
        </p>
        {copy ? (
          <p
            className={cn(
              "font-display animate-in fade-in text-[1.375rem]/7 font-medium tracking-[-0.02em] duration-300 motion-reduce:animate-none",
              copy.textClassName
            )}
          >
            {kind === "problem" ? copy.problemLabel : copy.label}
          </p>
        ) : (
          <Shimmer className="font-display text-[1.375rem]/7 font-medium tracking-[-0.02em]">
            {activity ?? "Thinking"}
          </Shimmer>
        )}
        {summary ? (
          <p className="animate-in fade-in max-w-[46rem] text-[0.9375rem]/6 text-pretty text-[#1E1E1EBF] duration-300 motion-reduce:animate-none dark:text-white/70">
            {summary}
          </p>
        ) : (
          <Skeleton className="mt-1 h-5 w-[min(28rem,80vw)]" />
        )}
      </div>
    </div>
  );
}
