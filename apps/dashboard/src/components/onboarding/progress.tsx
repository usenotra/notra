import { useTranslations } from "use-intl";

import Link from "@/components/framework/link";
import { ONBOARDING_STEP_COUNT } from "@/constants/onboarding";
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
  const t = useTranslations("onboarding.progress");
  return (
    <nav
      aria-label={t("label", { current, total: STEPS.length })}
      className="flex items-center gap-1.5"
    >
      {STEPS.map((step) => {
        const href = hrefs?.[step - 1];
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
          return (
            <span
              className="flex size-6 items-center justify-center"
              key={step}
            >
              {pill}
            </span>
          );
        }

        return (
          <Link
            aria-label={t("goTo", { step: String(step) })}
            className="focus-visible:ring-ring flex size-6 items-center justify-center rounded-full hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
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
