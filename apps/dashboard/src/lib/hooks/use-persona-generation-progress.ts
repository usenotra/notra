"use client";

import { useEffect, useState } from "react";

import {
  GEO_PERSONA_GENERATION_STEPS,
  GEO_PERSONA_GENERATION_TICK_MS,
} from "@/constants/geo-personas";
import type { PersonaGenerationProgress } from "@/types/geo-personas-ui";

function stepForElapsed(elapsedMs: number): number {
  let step = 0;
  for (const [index, entry] of GEO_PERSONA_GENERATION_STEPS.entries()) {
    if (elapsedMs >= entry.afterMs) {
      step = index;
    }
  }
  return step;
}

/**
 * Time-paced progress for the persona generation button. Returns null while
 * idle; otherwise the current step (1-based), the total, and its label.
 */
export function usePersonaGenerationProgress(
  active: boolean
): PersonaGenerationProgress | null {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setStep(stepForElapsed(Date.now() - startedAt));
    }, GEO_PERSONA_GENERATION_TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) {
    return null;
  }
  const entry = GEO_PERSONA_GENERATION_STEPS[step];
  return {
    step: step + 1,
    total: GEO_PERSONA_GENERATION_STEPS.length,
    label: entry?.label ?? "",
  };
}
