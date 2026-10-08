import { Schema } from "effect";

export const OrganizationId = Schema.NonEmptyString.pipe(
  Schema.brand("WebhookOrganizationId")
);
export const EndpointId = Schema.NonEmptyString.pipe(
  Schema.brand("WebhookEndpointId")
);
export const EventId = Schema.NonEmptyString.pipe(
  Schema.brand("WebhookEventId")
);
export const DeliveryId = Schema.NonEmptyString.pipe(
  Schema.brand("WebhookDeliveryId")
);
export const EventType = Schema.Literals([
  "post.generation.completed",
  "post.generation.failed",
  "post.generation.skipped",
  "brand_identity.generation.completed",
  "brand_identity.generation.failed",
  "post.published",
  "post.created",
  "post.updated",
  "post.deleted",
  "post.unpublished",
  "geo.scan.completed",
  "geo.scan.failed",
]);
const jobId = Schema.NonEmptyString;
export const EventData = Schema.Union([
  Schema.Struct({
    type: Schema.tag("post.generation.completed"),
    data: Schema.Struct({ jobId, postId: Schema.NonEmptyString }),
  }),
  Schema.Struct({
    type: Schema.tag("post.generation.failed"),
    data: Schema.Struct({ jobId, error: Schema.NullOr(Schema.String) }),
  }),
  Schema.Struct({
    type: Schema.tag("post.generation.skipped"),
    data: Schema.Struct({ jobId, reason: Schema.NullOr(Schema.String) }),
  }),
  Schema.Struct({
    type: Schema.tag("brand_identity.generation.completed"),
    data: Schema.Struct({
      jobId,
      brandIdentityId: Schema.NonEmptyString,
    }),
  }),
  Schema.Struct({
    type: Schema.tag("brand_identity.generation.failed"),
    data: Schema.Struct({ jobId, error: Schema.NullOr(Schema.String) }),
  }),
  Schema.Struct({
    type: Schema.tag("post.published"),
    data: Schema.Struct({ postId: Schema.NonEmptyString }),
  }),
  Schema.Struct({
    type: Schema.tag("post.created"),
    data: Schema.Struct({ postId: Schema.NonEmptyString }),
  }),
  Schema.Struct({
    type: Schema.tag("post.updated"),
    data: Schema.Struct({ postId: Schema.NonEmptyString }),
  }),
  Schema.Struct({
    type: Schema.tag("post.deleted"),
    data: Schema.Struct({ postId: Schema.NonEmptyString }),
  }),
  Schema.Struct({
    type: Schema.tag("post.unpublished"),
    data: Schema.Struct({ postId: Schema.NonEmptyString }),
  }),
  Schema.Struct({
    type: Schema.tag("geo.scan.completed"),
    data: Schema.Struct({
      scanId: Schema.NonEmptyString,
      projectId: Schema.NonEmptyString,
      runId: Schema.NullOr(Schema.String),
      checksTotal: Schema.NullOr(Schema.Number),
      checksFailed: Schema.NullOr(Schema.Number),
      mentions: Schema.NullOr(Schema.Number),
      durationMs: Schema.NullOr(Schema.Number),
    }),
  }),
  Schema.Struct({
    type: Schema.tag("geo.scan.failed"),
    data: Schema.Struct({
      scanId: Schema.NonEmptyString,
      projectId: Schema.NonEmptyString,
      errorCode: Schema.NullOr(Schema.String),
      error: Schema.NullOr(Schema.String),
      failedStage: Schema.NullOr(Schema.String),
      retryable: Schema.NullOr(Schema.Boolean),
    }),
  }),
]).pipe(Schema.toTaggedUnion("type"));
export const PublishInput = Schema.Struct({
  organizationId: OrganizationId,
  sourceKey: Schema.NonEmptyString,
  event: EventData,
});
export const EndpointInput = Schema.Struct({
  organizationId: OrganizationId,
  url: Schema.NonEmptyString,
  events: Schema.Array(EventType).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(EventType.literals.length)
  ),
});
export const Endpoint = Schema.Struct({
  id: EndpointId,
  organizationId: OrganizationId,
  url: Schema.String,
  events: Schema.Array(EventType),
  enabled: Schema.Boolean,
  createdAt: Schema.String,
});
export const IdentifierRow = Schema.Struct({ id: Schema.String });
export const CountRow = Schema.Struct({ count: Schema.Number });
export const StoredDelivery = Schema.Struct({
  id: DeliveryId,
  eventId: EventId,
  endpointId: EndpointId,
  organizationId: OrganizationId,
  url: Schema.String,
  secret: Schema.String,
  payload: Schema.String,
  eventType: EventType,
  attemptCount: Schema.Number,
  attemptLimit: Schema.Number,
  leaseToken: Schema.String,
});
export const DeliverySummary = Schema.Struct({
  id: DeliveryId,
  eventId: EventId,
  endpointId: EndpointId,
  status: Schema.Literals([
    "pending",
    "sending",
    "retrying",
    "succeeded",
    "failed",
    "cancelled",
  ]),
  url: Schema.String,
  eventType: EventType,
  statusCode: Schema.NullOr(Schema.Number),
  error: Schema.NullOr(Schema.String),
  attemptCount: Schema.Number,
  nextAttemptAt: Schema.String,
  createdAt: Schema.String,
});
export const Attempt = Schema.Struct({
  id: Schema.String,
  deliveryId: DeliveryId,
  attemptNumber: Schema.Number,
  startedAt: Schema.String,
  finishedAt: Schema.NullOr(Schema.String),
  statusCode: Schema.NullOr(Schema.Number),
  error: Schema.NullOr(Schema.String),
  durationMs: Schema.NullOr(Schema.Number),
});
export const DeliveryMessage = Schema.Struct({ deliveryId: DeliveryId });
export const DnsResponse = Schema.Struct({
  Status: Schema.Number,
  Answer: Schema.optionalKey(
    Schema.Array(Schema.Struct({ type: Schema.Number, data: Schema.String }))
  ),
});

export const DeliveryDetail = DeliverySummary.pipe(
  Schema.fieldsAssign({
    payload: Schema.String,
  })
);
export const DeliveryStats = Schema.Struct({
  total: Schema.Number,
  succeeded: Schema.Number,
  failed: Schema.Number,
  active: Schema.Number,
});
export const DeliveryActivityDay = Schema.Struct({
  date: Schema.String,
  total: Schema.Number,
  succeeded: Schema.Number,
  failed: Schema.Number,
});
export const PipelineMetrics = Schema.Struct({
  openDeliveries: Schema.Number,
  oldestOpenSeconds: Schema.Number,
  succeededLastMinute: Schema.Number,
  failedLastMinute: Schema.Number,
});
