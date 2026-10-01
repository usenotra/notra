import { handleGeoIngestRequest } from "@notra/geo-core/ingest/handler";
import { after } from "next/server";

export function POST(request: Request): Promise<Response> {
  return handleGeoIngestRequest(request, after);
}
