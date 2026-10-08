"use client";

import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { SiteCreateStepListProps } from "@/types/components/sites";

export function SiteCreateStepList({
  steps,
  onSelect,
}: SiteCreateStepListProps) {
  const t = useTranslations("sites.new");
  return (
    <nav aria-label={t("stepsLabel")}>
      <ol className="space-y-1">
        {steps.map((step) => {
          const dot = (
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full transition-colors duration-300",
                step.state === "active"
                  ? "bg-foreground"
                  : "bg-muted-foreground/40"
              )}
            />
          );
          return (
            <li key={step.id}>
              {step.state === "done" ? (
                <button
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring/50 flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-sm transition-colors outline-none focus-visible:ring-[3px]"
                  onClick={() => onSelect(step.id)}
                  type="button"
                >
                  {dot}
                  {step.label}
                </button>
              ) : (
                <span
                  aria-current={step.state === "active" ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1 text-sm transition-colors duration-300",
                    step.state === "active"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/60"
                  )}
                >
                  {dot}
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
