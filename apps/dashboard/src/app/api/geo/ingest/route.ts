import { Effect } from "effect";

import { runGeoIngest } from "@/lib/geo-ingest/pipeline";
import {
  toGeoIngestAcceptedResponse,
  toGeoIngestErrorResponse,
} from "@/lib/geo-ingest/response";

export async function POST(request: Request): Promise<Response> {
  const outcome = await Effect.runPromise(Effect.result(runGeoIngest(request)));

  if (outcome._tag === "Failure") {
    return toGeoIngestErrorResponse(outcome.failure);
  }

  return toGeoIngestAcceptedResponse();
}
