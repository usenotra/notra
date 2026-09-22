"use client";

import { Loading03Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Counter from "@notra/ui/components/shared/counter";
import { useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type {
  GeneratePersonasButtonProps,
  PersonaGenerationCounterProps,
} from "@/types/geo-personas-ui";

function GenerationCounter({ progress }: PersonaGenerationCounterProps) {
  const reducedMotion = useReducedMotion();
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center leading-none tabular-nums"
    >
      {reducedMotion ? (
        <span>{progress.step}</span>
      ) : (
        <Counter
          borderRadius={0}
          fontSize={14}
          gap={0}
          gradientHeight={0}
          horizontalPadding={0}
          value={progress.step}
        />
      )}
      <span className="leading-none">/{progress.total}</span>
    </span>
  );
}

export function GeneratePersonasButton({
  hasPersonas,
  progress,
  onClick,
}: GeneratePersonasButtonProps) {
  const label = hasPersonas ? "Add personas" : "Generate personas";
  const isGenerating = progress !== null;
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {progress
          ? `${progress.label}, step ${progress.step} of ${progress.total}`
          : ""}
      </span>
      <Button
        aria-label={
          progress
            ? `${progress.label}, step ${progress.step} of ${progress.total}`
            : label
        }
        className={cn(
          "relative overflow-hidden",
          isGenerating && "data-disabled:opacity-100"
        )}
        disabled={isGenerating}
        onClick={onClick}
        size="lg"
      >
        {progress ? (
          <span
            aria-hidden="true"
            className={cn(
              "bg-primary-foreground/25 pointer-events-none absolute inset-0 origin-left scale-x-(--generate-fill)",
              reducedMotion
                ? undefined
                : "transition-transform duration-500 ease-linear"
            )}
            style={
              {
                "--generate-fill": String(progress.fill),
              } as CSSProperties
            }
          />
        ) : null}
        <HugeiconsIcon
          className={cn(
            "relative z-10",
            isGenerating ? "motion-safe:animate-spin" : undefined
          )}
          icon={isGenerating ? Loading03Icon : UserGroupIcon}
          size={16}
        />
        {progress ? (
          <span className="relative z-10 inline-flex items-center gap-1.5 leading-none">
            <span>{progress.label}</span>
            <GenerationCounter progress={progress} />
          </span>
        ) : (
          <span className="relative z-10">{label}</span>
        )}
      </Button>
    </div>
  );
}
