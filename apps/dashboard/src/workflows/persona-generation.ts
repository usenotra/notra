import { getWorkflowMetadata } from "workflow";

import type { PersonaGenerationJob } from "@/types/persona-generation";
import {
  finishPersonaGenerationStep,
  generatePersonasStep,
} from "@/workflows/steps/persona-generation-steps";

export async function personaGenerationWorkflow(job: PersonaGenerationJob) {
  "use workflow";
  try {
    await generatePersonasStep(job, getWorkflowMetadata().workflowRunId);
  } catch (error) {
    await finishPersonaGenerationStep(job, true);
    throw error;
  }
  await finishPersonaGenerationStep(job, false);
}
