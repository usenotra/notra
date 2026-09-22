"use client";

import { useEffect, useState } from "react";

import {
  GEO_PERSONA_GENERATION_STEPS,
  GEO_PERSONA_GENERATION_TICK_MS,
} from "@/constants/geo-personas";
import type { PersonaGenerationProgress } from "@/types/geo-personas-ui";

/** Last step holds under full until the request actually lands. */
const FILL_HOLD = 0.94;
const LAST_STEP_SPAN_MS = 30_000;

function stepForElapsed(elapsedMs: number): number {
  let step = 0;
  for (const [index, entry] of GEO_PERSONA_GENERATION_STEPS.entries()) {
    if (elapsedMs >= entry.afterMs) {
      step = index;
    }
  }
  return step;
}

/** Fill ratio for the generate button: current step, then ease toward the next. */
export function personaGenerationFill(elapsedMs: number): number {
  const count = GEO_PERSONA_GENERATION_STEPS.length;
  if (count === 0) {
    return 0;
  }
  const index = stepForElapsed(elapsedMs);
  const start = GEO_PERSONA_GENERATION_STEPS[index]?.afterMs ?? 0;
  const next = GEO_PERSONA_GENERATION_STEPS[index + 1];
  const span = next ? next.afterMs - start : LAST_STEP_SPAN_MS;
  const t =
    span <= 0 ? 1 : Math.min(1, Math.max(0, (elapsedMs - start) / span));
  const from = Math.min(FILL_HOLD, (index + 1) / count);
  const to = next ? Math.min(FILL_HOLD, (index + 2) / count) : FILL_HOLD;
  return from + (to - from) * t;
}

/**
 * Time-paced progress for the persona generation button. Returns null while
 * idle; otherwise the current step (1-based), the total, and its label.
 */
export function usePersonaGenerationProgress(
  active: boolean,
  generationStartedAt: string
): PersonaGenerationProgress | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => {
      setNow(Date.now());
    }, GEO_PERSONA_GENERATION_TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) {
    return null;
  }
  const elapsedMs = now - Date.parse(generationStartedAt);
  const step = stepForElapsed(elapsedMs);
  const entry = GEO_PERSONA_GENERATION_STEPS[step];
  return {
    step: step + 1,
    total: GEO_PERSONA_GENERATION_STEPS.length,
    label: entry?.label ?? "",
    fill: personaGenerationFill(elapsedMs),
  };
}
