"use client";

import { Loading03Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Counter from "@notra/ui/components/shared/counter";
import { useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";

import { Button } from "@/components/button";
import { personaGenerationFill } from "@/lib/hooks/use-persona-generation-progress";
import { cn } from "@/lib/utils";
import type {
  GeneratePersonasButtonProps,
  PersonaGenerationCounterProps,
  PersonaGenerationProgress,
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

function GenerateFill({
  fill,
  startedAtMs,
}: Pick<PersonaGenerationProgress, "fill" | "startedAtMs">) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const paint = (value: number) => {
      node.style.setProperty("--generate-fill", String(value));
    };

    if (reducedMotion || startedAtMs === undefined) {
      paint(fill);
      return;
    }

    let frame = 0;
    const tick = () => {
      paint(personaGenerationFill(Date.now() - startedAtMs));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fill, startedAtMs, reducedMotion]);

  return (
    <span
      aria-hidden="true"
      className="bg-primary-foreground/25 pointer-events-none absolute inset-0 origin-left scale-x-(--generate-fill)"
      ref={ref}
      style={{ "--generate-fill": String(fill) } as CSSProperties}
    />
  );
}

export function GeneratePersonasButton({
  hasPersonas,
  progress,
  onClick,
}: GeneratePersonasButtonProps) {
  const label = hasPersonas ? "Add personas" : "Generate personas";
  const isGenerating = progress !== null;
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <span aria-atomic="true" aria-live="polite" className="sr-only">
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
          <GenerateFill
            fill={progress.fill}
            startedAtMs={progress.startedAtMs}
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
