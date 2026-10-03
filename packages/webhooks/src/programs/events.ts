import { DateTime, Effect, Schema } from "effect";

import { API_VERSION, MAX_PAYLOAD_BYTES } from "../constants/delivery";
import {
  EVENT_INSERT_QUERY,
  EVENT_SELECT_BY_SOURCE_QUERY,
} from "../constants/events";
import {
  WebhookStorageError,
  WebhookValidationError,
} from "../errors/webhooks";
import { EventId, IdentifierRow, PublishInput } from "../schemas/webhooks";
import { queryRows } from "../services/database";
import type { EventRecord } from "../types/webhooks";
import {
  eventInsertParameters,
  eventSelectBySourceParameters,
} from "../utils/events";

export const buildEventRecord = Effect.fn("webhooks.buildEventRecord")(
  function* (input: unknown) {
    const body = yield* Schema.decodeUnknownEffect(PublishInput)(input).pipe(
      Effect.mapError(
        () => new WebhookValidationError({ message: "Invalid webhook event" })
      )
    );
    const id = yield* Effect.sync(() => `whev_${crypto.randomUUID()}`);
    const createdAt = yield* DateTime.now;
    const payload = JSON.stringify({
      id,
      type: body.event.type,
      apiVersion: API_VERSION,
      createdAt: DateTime.formatIso(createdAt),
      organizationId: body.organizationId,
      data: body.event.data,
    });
    if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
      return yield* new WebhookValidationError({
        message: "Webhook payload exceeds 64 KiB",
      });
    }
    return { id, body, payload } satisfies EventRecord;
  }
);

export const publishEvent = Effect.fn("webhooks.publishEvent")(function* (
  input: unknown
) {
  const record = yield* buildEventRecord(input);
  const [event] = yield* queryRows(
    IdentifierRow,
    EVENT_INSERT_QUERY,
    eventInsertParameters(record)
  );
  const existing =
    event ??
    (yield* queryRows(
      IdentifierRow,
      EVENT_SELECT_BY_SOURCE_QUERY,
      eventSelectBySourceParameters(record)
    ))[0];
  if (!existing) {
    return yield* new WebhookStorageError({
      operation: "publishEvent",
      cause: "Event insert returned no row",
    });
  }
  return yield* Schema.decodeUnknownEffect(EventId)(existing.id);
});
