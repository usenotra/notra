import { getWorkflowMetadata } from "workflow";

import { PERSONA_GENERATION_FAILED_MESSAGE } from "@/constants/persona-generation";
import type { PersonaGenerationJob } from "@/types/persona-generation";
import {
  finishPersonaGenerationStep,
  generatePersonasStep,
} from "@/workflows/steps/persona-generation-steps";

const BILLING_FAILURE_PREFIXES = [
  "Your plan",
  "You've used",
  "AI credit",
] as const;

function personaFailureMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return PERSONA_GENERATION_FAILED_MESSAGE;
  }
  const line =
    error.message
      .split("\n")[0]
      ?.replace(/^GeoWriterCreditsExhaustedError:\s*/, "")
      .trim() ?? "";
  if (BILLING_FAILURE_PREFIXES.some((prefix) => line.startsWith(prefix))) {
    return line;
  }
  return PERSONA_GENERATION_FAILED_MESSAGE;
}

export async function personaGenerationWorkflow(job: PersonaGenerationJob) {
  "use workflow";
  try {
    await generatePersonasStep(job, getWorkflowMetadata().workflowRunId);
  } catch (error) {
    await finishPersonaGenerationStep(job, true, personaFailureMessage(error));
    throw error;
  }
  await finishPersonaGenerationStep(job, false);
}
