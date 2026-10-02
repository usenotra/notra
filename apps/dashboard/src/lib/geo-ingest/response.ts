import type { GeoIngestError } from "@/lib/geo-ingest/errors";

const NO_STORE = { "Cache-Control": "no-store" };

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_ACCEPTED = 202;

export function toGeoIngestAcceptedResponse(): Response {
  return Response.json(
    { ok: true },
    { status: HTTP_ACCEPTED, headers: NO_STORE }
  );
}

export function toGeoIngestErrorResponse(failure: GeoIngestError): Response {
  switch (failure._tag) {
    case "GeoIngestMissingToken":
    case "GeoIngestInvalidToken":
      return Response.json(
        { error: "Unauthorized" },
        { status: HTTP_UNAUTHORIZED, headers: NO_STORE }
      );
    case "GeoIngestRateLimited":
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: HTTP_TOO_MANY_REQUESTS, headers: NO_STORE }
      );
    case "GeoIngestInvalidPayload":
      return Response.json(
        { error: "Invalid payload" },
        { status: HTTP_BAD_REQUEST, headers: NO_STORE }
      );
    case "GeoIngestUnparseableUrl":
      return Response.json(
        { error: "Invalid url" },
        { status: HTTP_BAD_REQUEST, headers: NO_STORE }
      );
    default:
      console.error("[GEO] ingest failed:", failure.cause);
      return Response.json(
        { error: "Ingest failed" },
        { status: HTTP_BAD_GATEWAY, headers: NO_STORE }
      );
  }
}
