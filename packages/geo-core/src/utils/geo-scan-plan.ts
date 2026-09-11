import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import type {
  GeoScanPlannedAnswer,
  GeoScanPlanSnapshot,
} from "@notra/db/types/geo-scan";

import { GEO_SEQUENCE_MAX_TURNS } from "../constants/geo";
import type { GeoScanPlannedSequence, GeoScanProjectPlan } from "../types/geo";

export function geoScanAnswerKey(
  promptId: string,
  engine: string,
  language: string,
  turn = 0
): string {
  return JSON.stringify(
    turn > 0 ? [promptId, engine, language, turn] : [promptId, engine, language]
  );
}

export function geoScanSequenceTasks(
  sequence: GeoScanPlannedSequence
): GeoScanPlannedAnswer[] {
  const promptId = `sequence-${sequence.sequenceId}`;
  return sequence.steps
    .slice(0, GEO_SEQUENCE_MAX_TURNS)
    .map((prompt, index) => ({
      key: geoScanAnswerKey(
        promptId,
        sequence.engine,
        DEFAULT_LANGUAGE,
        index + 1
      ),
      promptId,
      prompt,
      engine: sequence.engine,
      language: DEFAULT_LANGUAGE,
      sequenceId: sequence.sequenceId,
      turn: index + 1,
    }));
}

export function geoScanPlanSnapshot(
  plan: GeoScanProjectPlan
): GeoScanPlanSnapshot {
  const tasks = [
    ...plan.tasks.map((task) => ({
      key: geoScanAnswerKey(task.prompt.id, task.engine, task.language),
      promptId: task.prompt.id,
      prompt: task.prompt.text,
      engine: task.engine,
      language: task.language,
    })),
    ...plan.sequences.flatMap(geoScanSequenceTasks),
  ];
  return {
    tasks,
    taskStates: {},
    totalChecks: tasks.length,
    promptCount: plan.promptCount,
    sequenceCount: new Set(
      plan.sequences.map((sequence) => sequence.sequenceId)
    ).size,
    engines: [...plan.engines],
    languages: [...plan.languages],
  };
}
