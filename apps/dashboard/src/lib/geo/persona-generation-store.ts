import { redis } from "@notra/ai/utils/redis";

import {
  CLAIM_PERSONA_GENERATION_SCRIPT,
  PERSONA_GENERATION_JOB_TTL_SECONDS,
  UPDATE_PERSONA_GENERATION_SCRIPT,
} from "@/constants/persona-generation";
import { personaGenerationJobSchema } from "@/schemas/persona-generation";
import type { PersonaGenerationJob } from "@/types/persona-generation";

function jobKey(organizationId: string, projectId: string) {
  return `geo:persona-generation:${organizationId}:${projectId}`;
}

export async function readPersonaGenerationJob(
  organizationId: string,
  projectId: string
): Promise<PersonaGenerationJob | null> {
  if (!redis) {
    return null;
  }
  const job = await redis.get(jobKey(organizationId, projectId));
  return job ? personaGenerationJobSchema.parse(job) : null;
}

export async function claimPersonaGenerationJob(
  job: PersonaGenerationJob
): Promise<PersonaGenerationJob> {
  if (!redis) {
    throw new Error(
      "Background persona generation requires Redis to be configured."
    );
  }
  const result = await redis.eval(
    CLAIM_PERSONA_GENERATION_SCRIPT,
    [jobKey(job.organizationId, job.projectId)],
    [JSON.stringify(job), PERSONA_GENERATION_JOB_TTL_SECONDS]
  );
  return personaGenerationJobSchema.parse(
    typeof result === "string" ? JSON.parse(result) : result
  );
}

export async function updatePersonaGenerationJob(
  job: PersonaGenerationJob,
  patch: Partial<Pick<PersonaGenerationJob, "status" | "runId" | "error">>,
  onlyUnstarted = false
): Promise<boolean> {
  if (!redis) {
    throw new Error("Persona generation storage is unavailable.");
  }
  const updated = await redis.eval(
    UPDATE_PERSONA_GENERATION_SCRIPT,
    [jobKey(job.organizationId, job.projectId)],
    [
      job.id,
      JSON.stringify(patch),
      PERSONA_GENERATION_JOB_TTL_SECONDS,
      onlyUnstarted ? "1" : "0",
    ]
  );
  return updated === 1;
}
