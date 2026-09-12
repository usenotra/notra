import { FEATURES } from "@notra/ai/billing/features";
import { shouldBypassAutumnInDevelopment } from "@notra/ai/utils/autumn-development";

const DEVELOPMENT_BALANCE = Number.MAX_SAFE_INTEGER;
const MS_PER_DAY = 86_400_000;

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

type DevelopmentAggregateEventsRequest = {
  featureId?: string | string[];
  feature_id?: string | string[];
  range?: string;
};

function createDevelopmentAutumnCustomer() {
  return {
    id: "development",
    name: "Local development",
    email: null,
    createdAt: 0,
    fingerprint: null,
    stripeId: null,
    env: "sandbox",
    metadata: {},
    sendEmailReceipts: false,
    billingControls: {},
    subscriptions: [],
    purchases: [],
    licenses: [],
    balances: Object.fromEntries(
      Object.values(FEATURES).map((featureId) => [
        featureId,
        {
          featureId,
          feature: {
            id: featureId,
            name: featureId,
            type: "metered",
            consumable: true,
            archived: false,
          },
          granted: DEVELOPMENT_BALANCE,
          remaining: DEVELOPMENT_BALANCE,
          usage: 0,
          unlimited: true,
          overageAllowed: false,
          maxPurchase: null,
          nextResetAt: null,
        },
      ])
    ),
    flags: {},
  };
}

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function unitFromSeed(seed: number) {
  const value = Math.sin(seed) * 10_000;
  return value - Math.floor(value);
}

function seedFrom(value: string) {
  let hash = 2_166_136_261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function featureIdsFromBody(body: DevelopmentAggregateEventsRequest) {
  const raw = body.featureId ?? body.feature_id ?? FEATURES.AI_ANSWERS;
  if (Array.isArray(raw)) {
    return raw.filter((id) => typeof id === "string" && id.length > 0);
  }
  if (typeof raw === "string" && raw.length > 0) {
    return [raw];
  }
  return [FEATURES.AI_ANSWERS];
}

function demoValue(featureId: string, isWeekend: boolean, seed: number) {
  const random = unitFromSeed(seed);
  const extra = unitFromSeed(seed + 17);
  if (featureId === FEATURES.AI_CREDITS) {
    if (isWeekend) {
      return Math.floor(random * 40);
    }
    return 80 + Math.floor(random * 220);
  }
  if (isWeekend) {
    return Math.floor(random * 5);
  }
  const spike = extra > 0.9 ? 12 + Math.floor(random * 18) : 0;
  return 8 + Math.floor(random * 24) + spike;
}

function createDevelopmentAggregateEvents(
  body: DevelopmentAggregateEventsRequest
) {
  const featureIds = featureIdsFromBody(body);
  const days = RANGE_DAYS[body.range ?? "30d"] ?? 30;
  const end = startOfUtcDay(Date.now());
  const list: { period: number; values: Record<string, number> }[] = [];
  const total: Record<string, { count: number; sum: number }> = {};

  for (const featureId of featureIds) {
    total[featureId] = { count: 0, sum: 0 };
  }

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const period = end - offset * MS_PER_DAY;
    const weekday = new Date(period).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const values: Record<string, number> = {};

    for (const featureId of featureIds) {
      const value = demoValue(
        featureId,
        isWeekend,
        seedFrom(`${featureId}:${offset}`)
      );
      values[featureId] = value;
      const current = total[featureId];
      if (current) {
        current.count += value > 0 ? 1 : 0;
        current.sum += value;
      }
    }

    list.push({ period, values });
  }

  return { list, total };
}

async function readJsonBody(
  request: Request
): Promise<DevelopmentAggregateEventsRequest> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as DevelopmentAggregateEventsRequest;
    }
  } catch {
    return {};
  }
  return {};
}

export function createDevelopmentAutumnHandler(
  nodeEnv: string | undefined,
  secretKey: string | undefined
): ((request: Request) => Promise<Response>) | null {
  if (!shouldBypassAutumnInDevelopment(nodeEnv, secretKey)) {
    return null;
  }

  return async (request) => {
    const route = new URL(request.url).pathname.split("/").at(-1);

    if (route === "getOrCreateCustomer") {
      return Response.json(createDevelopmentAutumnCustomer());
    }

    if (route === "aggregateEvents") {
      const body = await readJsonBody(request);
      return Response.json(createDevelopmentAggregateEvents(body));
    }

    return Response.json(
      { error: "Billing operations are unavailable without an Autumn key" },
      { status: 503 }
    );
  };
}
