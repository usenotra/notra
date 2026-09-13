/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor. */
import { Schema } from "effect";

export class WebhookStorageError extends Schema.TaggedError<WebhookStorageError>()(
  "WebhookStorageError",
  { operation: Schema.String, cause: Schema.Defect() }
) {}
export class WebhookValidationError extends Schema.TaggedError<WebhookValidationError>()(
  "WebhookValidationError",
  { message: Schema.String }
) {}
export class WebhookCryptoError extends Schema.TaggedError<WebhookCryptoError>()(
  "WebhookCryptoError",
  { operation: Schema.String, cause: Schema.optional(Schema.Defect()) }
) {}
export class WebhookTransportError extends Schema.TaggedError<WebhookTransportError>()(
  "WebhookTransportError",
  { reason: Schema.Literals(["network", "timeout", "unsafe_url"]) }
) {}
export class WebhookQueueError extends Schema.TaggedError<WebhookQueueError>()(
  "WebhookQueueError",
  { operation: Schema.String }
) {}
export class WebhookNotFound extends Schema.TaggedError<WebhookNotFound>()(
  "WebhookNotFound",
  { resource: Schema.String }
) {}
