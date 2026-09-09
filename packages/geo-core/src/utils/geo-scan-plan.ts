import type { GeoScanPlanSnapshot } from "@notra/db/types/geo-scan";

import { GEO_SEQUENCE_MAX_TURNS } from "../constants/geo";
import type { GeoScanProjectPlan } from "../types/geo";

export function geoScanAnswerKey(
  promptId: string,
  engine: string,
  language: string
): string {
  return JSON.stringify([promptId, engine, language]);
}

export function geoScanPlanSnapshot(
  plan: GeoScanProjectPlan
): GeoScanPlanSnapshot {
  return {
    tasks: plan.tasks.map((task) => ({
      key: geoScanAnswerKey(task.prompt.id, task.engine, task.language),
      promptId: task.prompt.id,
      prompt: task.prompt.text,
      engine: task.engine,
      language: task.language,
    })),
    taskStates: {},
    totalChecks:
      plan.tasks.length +
      plan.sequences.reduce(
        (total, sequence) =>
          total + Math.min(sequence.steps.length, GEO_SEQUENCE_MAX_TURNS),
        0
      ),
    promptCount: plan.promptCount,
    sequenceCount: new Set(
      plan.sequences.map((sequence) => sequence.sequenceId)
    ).size,
    engines: [...plan.engines],
    languages: [...plan.languages],
  };
}
