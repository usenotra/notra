import { Clock, Effect } from "effect";

import { SIGNATURE_TOLERANCE_SECONDS } from "../constants/delivery";
import { hmacVerify } from "./hmac";

export function signatureMessage(
  eventId: string,
  deliveryId: string,
  timestamp: string,
  payload: string
) {
  return `${eventId}.${deliveryId}.${timestamp}.${payload}`;
}

export const verifySignature = Effect.fn("webhooks.verifySignature")(function* (
  secret: string,
  payload: string,
  headers: Headers
) {
  const eventId = headers.get("x-notra-event-id");
  const deliveryId = headers.get("x-notra-delivery-id");
  const timestamp = headers.get("x-notra-timestamp");
  const signature = headers.get("x-notra-signature");
  if (
    !eventId ||
    !deliveryId ||
    !timestamp ||
    !signature?.startsWith("v1,") ||
    !/^\d+$/.test(timestamp)
  ) {
    return false;
  }
  const now = yield* Clock.currentTimeMillis;
  if (
    Math.abs(Math.floor(now / 1000) - Number(timestamp)) >
    SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }
  return yield* hmacVerify(
    secret,
    signatureMessage(eventId, deliveryId, timestamp, payload),
    signature.slice(3)
  ).pipe(Effect.catchTag("WebhookCryptoError", () => Effect.succeed(false)));
});
