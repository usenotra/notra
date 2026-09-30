import { createHmac, timingSafeEqual } from "node:crypto";

import { geoSentimentCursorSchema } from "@notra/geo-core/schemas/geo-sentiment";
import type { GeoSentimentEvidenceInput } from "@notra/geo-core/types/geo-sentiment";
import { z } from "zod";

type SentimentCursor = NonNullable<GeoSentimentEvidenceInput["cursor"]>;
type SentimentWindow = { from: string; to: string };
type ApiSentimentCursor = SentimentCursor & SentimentWindow;

const CURSOR_SIGNATURE_CONTEXT = "geo-sentiment-evidence:v1:";

const apiSentimentCursorSchema = geoSentimentCursorSchema
  .extend({
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine(
    ({ from, to }) => {
      const days =
        (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
          86_400_000 +
        1;
      return Number.isInteger(days) && days >= 1 && days <= 366;
    },
    { message: "Cursor contains an invalid sentiment window" }
  );

function signCursor(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${CURSOR_SIGNATURE_CONTEXT}${payload}`)
    .digest("base64url");
}

export function encodeGeoSentimentCursor(
  cursor: SentimentCursor | null,
  window: SentimentWindow,
  secret: string
): string | null {
  if (!cursor) {
    return null;
  }
  const payload = Buffer.from(
    JSON.stringify({ ...cursor, ...window })
  ).toString("base64url");
  return `${payload}.${signCursor(payload, secret)}`;
}

export function decodeGeoSentimentCursor(
  value: string | undefined,
  secret: string
): ApiSentimentCursor | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const separatorIndex = value.lastIndexOf(".");
    if (separatorIndex <= 0) {
      return undefined;
    }
    const payload = value.slice(0, separatorIndex);
    const signature = value.slice(separatorIndex + 1);
    const expected = signCursor(payload, secret);
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return undefined;
    }
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    const cursor = apiSentimentCursorSchema.safeParse(parsed);
    return cursor.success ? cursor.data : undefined;
  } catch {
    return undefined;
  }
}
