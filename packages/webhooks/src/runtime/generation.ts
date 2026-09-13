import { Effect } from "effect";

import { publishGenerationOutcome } from "../programs/generation";
import type { GenerationOutcome } from "../types/generation";
import { postgresDatabaseLayer } from "./postgres";

export const recordGenerationOutcome = (job: GenerationOutcome) =>
  Effect.runPromise(
    publishGenerationOutcome(job).pipe(Effect.provide(postgresDatabaseLayer))
  );
