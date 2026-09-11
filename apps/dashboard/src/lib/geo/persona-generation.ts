import { getRun, start } from "workflow/api";

import {
  PERSONA_GENERATION_FAILED_MESSAGE,
  PERSONA_GENERATION_START_TIMEOUT_MS,
} from "@/constants/persona-generation";
import {
  claimPersonaGenerationJob,
  readPersonaGenerationJob,
  updatePersonaGenerationJob,
} from "@/lib/geo/persona-generation-store";
import type { PersonaGenerationJob } from "@/types/persona-generation";
import { personaGenerationWorkflow } from "@/workflows/persona-generation";

export async function getPersonaGeneration(
  organizationId: string,
  projectId: string
) {
  const job = await readPersonaGenerationJob(organizationId, projectId);
  if (!job || job.status === "completed" || job.status === "failed") {
    return job;
  }
  const status = job.runId ? await getRun(job.runId).status : null;
  const failed =
    status === "failed" ||
    status === "cancelled" ||
    (!job.runId &&
      Date.now() - Date.parse(job.startedAt) >
        PERSONA_GENERATION_START_TIMEOUT_MS);
  if (failed) {
    await updatePersonaGenerationJob(
      job,
      {
        status: "failed",
        error: PERSONA_GENERATION_FAILED_MESSAGE,
      },
      !job.runId
    );
    return readPersonaGenerationJob(organizationId, projectId);
  }
  return job;
}

export async function startPersonaGeneration(
  organizationId: string,
  projectId: string,
  personaId?: string
) {
  await getPersonaGeneration(organizationId, projectId);
  const requested: PersonaGenerationJob = {
    id: crypto.randomUUID(),
    organizationId,
    projectId,
    personaId,
    status: "queued",
    startedAt: new Date().toISOString(),
    runId: null,
    error: null,
  };
  const job = await claimPersonaGenerationJob(requested);
  if (job.id !== requested.id) {
    return job;
  }
  // Keep the claim on an ambiguous dispatch failure. The workflow registers its
  // run ID on entry, and status polling expires an unstarted claim after a grace period.
  const run = await start(personaGenerationWorkflow, [job]);
  await updatePersonaGenerationJob(job, { runId: run.runId });
  return { ...job, runId: run.runId };
}
