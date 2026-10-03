import { ManagedRuntime } from "effect";

import { publishGenerationOutcome } from "../programs/generation";
import type { GenerationOutcome } from "../types/generation";
import { postgresDatabaseLayer } from "./postgres";

const runtime = ManagedRuntime.make(postgresDatabaseLayer);

export const recordGenerationOutcome = (job: GenerationOutcome) =>
  runtime.runPromise(publishGenerationOutcome(job));
