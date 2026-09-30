import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import type {
  GeoScanPlannedAnswer,
  GeoScanPlanSnapshot,
  GeoScanPlanSummary,
} from "@notra/db/types/geo-scan";

import { GEO_SEQUENCE_MAX_TURNS } from "../constants/geo";
import { GEO_PERSONA_MAX_TURNS } from "../constants/geo-personas";
import type {
  GeoScanPlannedPersona,
  GeoScanPlannedSequence,
  GeoScanProjectPlan,
} from "../types/geo";
import { personaPromptId } from "./geo-personas";

export function geoScanPersonaTasks(
  persona: Pick<GeoScanPlannedPersona, "personaId" | "prompts" | "engine">
): GeoScanPlannedAnswer[] {
  const promptId = personaPromptId(persona.personaId);
  return persona.prompts
    .slice(0, GEO_PERSONA_MAX_TURNS)
    .map((prompt, index) => ({
      key: geoScanAnswerKey(
        promptId,
        persona.engine,
        DEFAULT_LANGUAGE,
        index + 1
      ),
      promptId,
      personaId: persona.personaId,
      prompt,
      engine: persona.engine,
      language: DEFAULT_LANGUAGE,
      turn: index + 1,
    }));
}

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
    ...plan.personas.flatMap(geoScanPersonaTasks),
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

export function geoScanPlanSummary(
  snapshot: GeoScanPlanSnapshot
): GeoScanPlanSummary {
  const plannedChecksByEngine = new Map<string, number>();
  for (const task of snapshot.tasks ?? []) {
    plannedChecksByEngine.set(
      task.engine,
      (plannedChecksByEngine.get(task.engine) ?? 0) + 1
    );
  }

  return {
    plannedChecks: snapshot.totalChecks,
    hasTasks: snapshot.tasks !== undefined,
    engines: snapshot.engines,
    taskCounts: [...plannedChecksByEngine]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([engine, plannedChecks]) => ({
        engine,
        plannedChecks,
        failedChecks: 0,
      })),
  };
}
