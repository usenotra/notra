import { Config, Effect, ManagedRuntime } from "effect";

import { publishGenerationOutcome } from "../programs/generation";
import type { GenerationOutcome } from "../types/generation";
import { postgresDatabaseLayer } from "./postgres";

const runtime = ManagedRuntime.make(postgresDatabaseLayer);
const webhooksEnabled = Config.boolean("WEBHOOKS_ENABLED").pipe(
  Config.withDefault(false)
);

export const recordGenerationOutcome = (job: GenerationOutcome) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const enabled = yield* webhooksEnabled;
      if (!enabled) {
        return yield* Effect.logDebug("Webhooks disabled, skipping event").pipe(
          Effect.annotateLogs({ jobId: job.id, status: job.status })
        );
      }
      yield* Effect.promise(() =>
        runtime.runPromise(publishGenerationOutcome(job))
      );
    })
  );
