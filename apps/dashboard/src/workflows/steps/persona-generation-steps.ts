import { generateGeoPersonas } from "@notra/geo-core/geo/personas";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Effect } from "effect";
import { FatalError } from "workflow";

import { PERSONA_GENERATION_FAILED_MESSAGE } from "@/constants/persona-generation";
import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { updatePersonaGenerationJob } from "@/lib/geo/persona-generation-store";
import type { PersonaGenerationJob } from "@/types/persona-generation";

export async function generatePersonasStep(
  job: PersonaGenerationJob,
  runId: string
) {
  "use step";
  const owned = await updatePersonaGenerationJob(job, {
    status: "running",
    runId,
  });
  if (!owned) {
    throw new FatalError("Persona generation is no longer active.");
  }
  const result = await Effect.runPromise(
    generateGeoPersonas(
      {
        organizationId: job.organizationId,
        projectId: job.projectId,
      },
      job.personaId
    ).pipe(Effect.provide(geoCoreDashboardLayer))
  );
  await trackServerEventAndFlush({
    organizationId: job.organizationId,
    projectId: job.projectId,
    event: POSTHOG_EVENTS.GEO_PERSONAS_GENERATED,
    properties: { persona_count: result.personas.length },
  });
}

// Generation replaces profiles and settles credits; retrying the entire operation
// after an ambiguous failure could generate and charge twice.
generatePersonasStep.maxRetries = 0;

export async function finishPersonaGenerationStep(
  job: PersonaGenerationJob,
  failed: boolean
) {
  "use step";
  await updatePersonaGenerationJob(job, {
    status: failed ? "failed" : "completed",
    error: failed ? PERSONA_GENERATION_FAILED_MESSAGE : null,
  });
}
