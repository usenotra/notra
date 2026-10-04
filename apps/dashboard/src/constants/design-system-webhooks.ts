import {
  Attempt,
  DeliveryDetail,
  DeliverySummary,
  Endpoint,
} from "@notra/webhooks/schemas/webhooks";
import { Schema } from "effect";

import type {
  OutboundDelivery,
  WebhookActivityDay,
  WebhookDeliveryDetail,
} from "@/types/webhooks/outbound";

const MINUTE_MS = 60_000;
const NOW = Date.now();
const ago = (minutes: number) =>
  new Date(NOW - minutes * MINUTE_MS).toISOString();

const ORG = "org_design_system";
const APP_URL = "https://hooks.acme.dev/notra";
const ZAPIER_URL = "https://hooks.zapier.com/hooks/catch/1928374/abc9xk";
const SLACK_URL = "https://api.acme-internal.com/v1/integrations/notra/events";

export const DESIGN_SYSTEM_WEBHOOK_ENDPOINTS = Schema.decodeUnknownSync(
  Schema.Array(Endpoint)
)([
  {
    id: "wh_ep_1",
    organizationId: ORG,
    url: APP_URL,
    events: [
      "post.generation.completed",
      "post.generation.failed",
      "post.published",
    ],
    enabled: true,
    createdAt: ago(60 * 24 * 12),
  },
  {
    id: "wh_ep_2",
    organizationId: ORG,
    url: ZAPIER_URL,
    events: ["post.published"],
    enabled: true,
    createdAt: ago(60 * 24 * 4),
  },
  {
    id: "wh_ep_3",
    organizationId: ORG,
    url: SLACK_URL,
    events: [
      "brand_identity.generation.completed",
      "brand_identity.generation.failed",
    ],
    enabled: true,
    createdAt: ago(60 * 5),
  },
]);

const delivery = (
  index: number,
  fields: Pick<OutboundDelivery, "status" | "eventType"> &
    Partial<
      Pick<
        OutboundDelivery,
        | "url"
        | "statusCode"
        | "error"
        | "attemptCount"
        | "nextAttemptAt"
        | "createdAt"
      >
    > & { readonly endpointId?: string }
) => ({
  id: `wh_dl_${String(index).padStart(3, "0")}`,
  eventId: `evt_${String(9000 - index)}`,
  endpointId: "wh_ep_1",
  url: APP_URL,
  statusCode: null,
  error: null,
  attemptCount: 1,
  nextAttemptAt: ago(-5),
  createdAt: ago(index * 37),
  ...fields,
});

export const DESIGN_SYSTEM_WEBHOOK_DELIVERIES: OutboundDelivery[] = [
  ...Schema.decodeUnknownSync(Schema.Array(DeliverySummary))([
    delivery(1, {
      status: "sending",
      eventType: "post.generation.completed",
      attemptCount: 1,
      createdAt: ago(0.2),
    }),
    delivery(2, {
      status: "pending",
      eventType: "post.published",
      endpointId: "wh_ep_2",
      url: ZAPIER_URL,
      attemptCount: 0,
      createdAt: ago(1),
    }),
    delivery(3, {
      status: "retrying",
      eventType: "brand_identity.generation.completed",
      endpointId: "wh_ep_3",
      url: SLACK_URL,
      statusCode: 503,
      attemptCount: 3,
      nextAttemptAt: ago(-12),
      createdAt: ago(14),
    }),
    delivery(4, {
      status: "succeeded",
      eventType: "post.generation.completed",
      statusCode: 200,
    }),
    delivery(5, {
      status: "failed",
      eventType: "post.generation.failed",
      statusCode: 410,
      attemptCount: 4,
    }),
    delivery(6, {
      status: "succeeded",
      eventType: "post.published",
      endpointId: "wh_ep_2",
      url: ZAPIER_URL,
      statusCode: 202,
    }),
    delivery(7, {
      status: "failed",
      eventType: "post.generation.skipped",
      error: "connection_timeout",
      attemptCount: 8,
    }),
    delivery(8, {
      status: "cancelled",
      eventType: "post.generation.completed",
      attemptCount: 2,
      statusCode: 500,
    }),
    delivery(9, {
      status: "succeeded",
      eventType: "brand_identity.generation.completed",
      endpointId: "wh_ep_3",
      url: SLACK_URL,
      statusCode: 204,
      attemptCount: 2,
    }),
    delivery(10, {
      status: "succeeded",
      eventType: "post.generation.completed",
      statusCode: 200,
    }),
    delivery(11, {
      status: "succeeded",
      eventType: "post.published",
      endpointId: "wh_ep_2",
      url: ZAPIER_URL,
      statusCode: 200,
    }),
    delivery(12, {
      status: "succeeded",
      eventType: "post.generation.completed",
      statusCode: 200,
    }),
  ]),
];

export const DESIGN_SYSTEM_WEBHOOK_STATS = {
  total: 1284,
  succeeded: 1239,
  active: 7,
  failed: 38,
};

export const DESIGN_SYSTEM_WEBHOOK_STATS_UNHEALTHY = {
  total: 212,
  succeeded: 97,
  active: 31,
  failed: 84,
};

export const DESIGN_SYSTEM_WEBHOOK_STATS_EMPTY = {
  total: 0,
  succeeded: 0,
  active: 0,
  failed: 0,
};

const PAYLOAD = JSON.stringify({
  id: "evt_8995",
  type: "post.generation.failed",
  created_at: ago(185),
  data: {
    organization_id: ORG,
    post_id: "post_7kq2m",
    reason: "brand_identity_missing",
  },
});

const attempts = (
  deliveryId: string,
  rows: ReadonlyArray<{
    statusCode: number | null;
    error: string | null;
    durationMs: number | null;
    finished?: boolean;
  }>
) =>
  Schema.decodeUnknownSync(Schema.Array(Attempt))(
    rows.map((row, index) => ({
      id: `${deliveryId}_at_${index + 1}`,
      deliveryId,
      attemptNumber: index + 1,
      startedAt: ago(185 - index * 20),
      finishedAt: row.finished === false ? null : ago(185 - index * 20),
      statusCode: row.statusCode,
      error: row.error,
      durationMs: row.durationMs,
    }))
  );

const detail = (
  summary: OutboundDelivery,
  rows: Parameters<typeof attempts>[1]
): WebhookDeliveryDetail => ({
  delivery: Schema.decodeUnknownSync(DeliveryDetail)({
    ...summary,
    payload: PAYLOAD,
  }),
  attempts: attempts(summary.id, rows),
});

const byStatus = (status: OutboundDelivery["status"]) => {
  const match = DESIGN_SYSTEM_WEBHOOK_DELIVERIES.find(
    (row) => row.status === status
  );
  if (!match) {
    throw new Error(`Missing ${status} webhook fixture`);
  }
  return match;
};

export const DESIGN_SYSTEM_WEBHOOK_DETAILS = {
  succeeded: detail(byStatus("succeeded"), [
    { statusCode: 200, error: null, durationMs: 142 },
  ]),
  failed: detail(byStatus("failed"), [
    { statusCode: 500, error: null, durationMs: 812 },
    { statusCode: 502, error: null, durationMs: 1204 },
    { statusCode: null, error: "connection_timeout", durationMs: 10_000 },
    { statusCode: 410, error: null, durationMs: 96 },
  ]),
  retrying: detail(byStatus("retrying"), [
    { statusCode: 503, error: null, durationMs: 431 },
    { statusCode: 503, error: null, durationMs: 388 },
    { statusCode: null, error: null, durationMs: null, finished: false },
  ]),
  pending: detail(byStatus("pending"), []),
} as const;

export const DESIGN_SYSTEM_WEBHOOK_SECRET =
  "whsec_6f1c0b9e2a4d4f7e8b3a5c1d9e0f2a7b";

const ACTIVITY_DAYS = 30;
const DAY_MS = 86_400_000;
const WEEKEND_VOLUME = 0.35;
const BAD_DAY_INDEX = 11;
const UNHEALTHY_FAILURE_SHARE = 0.2;

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return value / 2_147_483_647;
  };
}

/** Splits `total` across `weights` with largest-remainder rounding, so sums stay exact. */
function distribute(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0) || 1;
  const raw = weights.map((weight) => (weight / sum) * total);
  const counts = raw.map(Math.floor);
  let rest = total - counts.reduce((acc, value) => acc + value, 0);
  const byRemainder = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (rest <= 0) {
      break;
    }
    counts[index] = (counts[index] ?? 0) + 1;
    rest -= 1;
  }
  return counts;
}

/** Plausible daily buckets that add up to the given 30-day totals. */
export function webhookActivityFor(
  stats: typeof DESIGN_SYSTEM_WEBHOOK_STATS
): WebhookActivityDay[] {
  const random = seededRandom(stats.total + 7);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dates = Array.from(
    { length: ACTIVITY_DAYS },
    (_, index) =>
      new Date(today.getTime() - (ACTIVITY_DAYS - 1 - index) * DAY_MS)
  );
  const volume = dates.map((date) => {
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    return (weekend ? WEEKEND_VOLUME : 1) * (0.6 + random() * 0.8);
  });
  const unhealthy =
    stats.total > 0 && stats.failed / stats.total > UNHEALTHY_FAILURE_SHARE;
  const failureWeights = volume.map((weight, index) => {
    if (index === BAD_DAY_INDEX) {
      return weight * 8;
    }
    if (unhealthy && index >= ACTIVITY_DAYS - 6) {
      return weight * 10;
    }
    return weight * 0.3;
  });
  const succeeded = distribute(stats.succeeded, volume);
  const failed = distribute(stats.failed, failureWeights);
  // Open deliveries are recent: spread them over the last three days.
  const active = distribute(
    stats.active,
    volume.map((weight, index) => (index >= ACTIVITY_DAYS - 3 ? weight : 0))
  );
  return dates.map((date, index) => {
    const daySucceeded = succeeded[index] ?? 0;
    const dayFailed = failed[index] ?? 0;
    return {
      date: date.toISOString().slice(0, 10),
      succeeded: daySucceeded,
      failed: dayFailed,
      total: daySucceeded + dayFailed + (active[index] ?? 0),
    };
  });
}
