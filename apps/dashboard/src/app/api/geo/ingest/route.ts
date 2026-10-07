import { handleGeoIngestRequest } from "@notra/geo-core/ingest/handler";

import { afterResponse } from "@/lib/framework/after-response";

export function POST(request: Request): Promise<Response> {
  return handleGeoIngestRequest(request, afterResponse);
}
