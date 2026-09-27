import { runGeoIngest } from "@notra/geo-core/ingest/pipeline";
import {
  toGeoIngestAcceptedResponse,
  toGeoIngestErrorResponse,
} from "@notra/geo-core/ingest/response";
import { Effect } from "effect";
import { after } from "next/server";

export async function POST(request: Request): Promise<Response> {
  const outcome = await Effect.runPromise(
    Effect.result(runGeoIngest(request, after))
  );

  if (outcome._tag === "Failure") {
    return toGeoIngestErrorResponse(outcome.failure);
  }

  return toGeoIngestAcceptedResponse();
}
