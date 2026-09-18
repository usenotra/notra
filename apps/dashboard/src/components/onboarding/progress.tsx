import Link from "next/link";

import {
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_LABELS,
} from "@/constants/onboarding";
import { cn } from "@/lib/utils";
import type { OnboardingProgressProps } from "@/types/onboarding";

const STEPS = Array.from(
  { length: ONBOARDING_STEP_COUNT },
  (_, index) => index + 1
);

function getStepClasses(step: number, current: number) {
  if (step === current) {
    return "w-6 bg-primary";
  }
  if (step < current) {
    return "w-1.5 bg-primary/60";
  }
  return "w-1.5 bg-muted-foreground/30";
}

export function OnboardingProgress({
  current,
  hrefs,
}: OnboardingProgressProps) {
  return (
    <nav
      aria-label={`Step ${current} of ${STEPS.length}`}
      className="flex items-center gap-1.5"
    >
      {STEPS.map((step) => {
        const href = hrefs?.[step - 1];
        const label = ONBOARDING_STEP_LABELS[step - 1];
        const pill = (
          <span
            aria-current={step === current ? "step" : undefined}
            className={cn(
              "block h-1.5 rounded-full transition-all",
              getStepClasses(step, current)
            )}
          />
        );

        if (!href) {
          return <span key={step}>{pill}</span>;
        }

        return (
          <Link
            aria-label={`Go to ${label}`}
            className="focus-visible:ring-ring relative rounded-full after:absolute after:top-1/2 after:left-1/2 after:h-6 after:w-3 after:-translate-1/2 hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
            href={href}
            key={step}
          >
            {pill}
          </Link>
        );
      })}
    </nav>
  );
}
