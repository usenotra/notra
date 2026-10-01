import { FEATURES } from "@notra/ai/billing/features";
import { shouldBypassAutumnInDevelopment } from "@notra/ai/utils/autumn-development";
import { isDemoMode } from "@notra/utils/demo-mode";

import {
  DEMO_BILLING_CREDITS,
  DEMO_BILLING_PERIOD_DAYS,
  DEMO_BILLING_PLAN,
  DEMO_DISABLED_MESSAGE,
} from "@/constants/demo";
import {
  DEMO_BILLING_ALLOWANCES,
  DEMO_BILLING_PLANS,
  DEMO_CREDIT_EVENT_COUNT,
  DEMO_CREDIT_EVENT_PATTERN,
} from "@/constants/demo-billing";
import type { DevelopmentBillingCustomerIdResolver } from "@/types/billing/development-usage-alerts";
import { getDevelopmentUsageAlerts } from "@/utils/development-usage-alerts";

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
  offset?: number;
  limit?: number;
};

function createDemoPlans() {
  return DEMO_BILLING_PLANS.flatMap((plan) =>
    (["month", "year"] as const).map((interval) => ({
      id: interval === "year" ? `${plan.id}_annual` : plan.id,
      name: plan.name,
      description: plan.description,
      group: null,
      version: 1,
      addOn: false,
      autoEnable: false,
      price: {
        amount: interval === "year" ? plan.annual : plan.monthly,
        interval,
      },
      items: [],
      createdAt: 0,
      env: "sandbox",
      archived: false,
      baseVariantId: null,
      config: { ignorePastDue: false },
    }))
  );
}

/**
 * Splits `total` across `weights` proportionally in whole units, handing the
 * rounding leftovers to the first entries so the parts add up exactly.
 */
function scaleToTotal(weights: readonly number[], total: number): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    return weights.map(() => 0);
  }
  const scaled = weights.map((weight) =>
    Math.floor((weight * total) / weightSum)
  );
  const remainder = total - scaled.reduce((sum, value) => sum + value, 0);
  return scaled.map((value, index) => value + (index < remainder ? 1 : 0));
}

/**
 * A believable spend history for the current cycle, newest first. The events
 * add up to the credits the demo balance reports as used.
 */
function demoCreditEvents(now: number) {
  const spanMs = DEMO_BILLING_PLAN.periodElapsedDays * MS_PER_DAY;
  const patterns = Array.from(
    { length: DEMO_CREDIT_EVENT_COUNT },
    (_, index) =>
      DEMO_CREDIT_EVENT_PATTERN[index % DEMO_CREDIT_EVENT_PATTERN.length]
  );
  const values = scaleToTotal(
    patterns.map((pattern) => pattern?.value ?? 0),
    DEMO_BILLING_CREDITS.used
  );
  return patterns.map((pattern, index) => ({
    id: `demo-credit-${index}`,
    timestamp:
      now - Math.round((spanMs * (index + 0.5)) / DEMO_CREDIT_EVENT_COUNT),
    value: values[index] ?? 0,
    properties: pattern?.properties ?? {},
    featureId: FEATURES.AI_CREDITS,
  }));
}

/** Paginates the demo spend history like Autumn's listEvents. */
function createDemoCreditEvents(body: DevelopmentAggregateEventsRequest) {
  const offset = Math.max(0, Number(body.offset ?? 0));
  const limit = Math.max(1, Number(body.limit ?? 20));
  const all = demoCreditEvents(Date.now());
  return {
    list: all.slice(offset, offset + limit),
    hasMore: offset + limit < all.length,
    offset,
    limit,
    total: all.length,
  };
}

/**
 * The public demo shows a paying workspace mid-cycle: an active Growth plan
 * and partially used credits, instead of local development's empty account.
 */
function createDemoSubscriptions(now: number) {
  const periodStart = now - DEMO_BILLING_PLAN.periodElapsedDays * MS_PER_DAY;
  return [
    {
      id: `demo-${DEMO_BILLING_PLAN.id}`,
      planId: DEMO_BILLING_PLAN.id,
      plan: {
        id: DEMO_BILLING_PLAN.id,
        name: DEMO_BILLING_PLAN.name,
        description: null,
        group: null,
        version: 1,
        addOn: false,
        autoEnable: false,
        price: null,
        items: [],
      },
      autoEnable: false,
      addOn: false,
      status: "active",
      pastDue: false,
      canceledAt: null,
      expiresAt: null,
      trialEndsAt: null,
      startedAt: periodStart - 60 * MS_PER_DAY,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodStart + DEMO_BILLING_PERIOD_DAYS * MS_PER_DAY,
      quantity: 1,
    },
  ];
}

function demoAllowance(featureId: string) {
  return featureId === FEATURES.AI_CREDITS
    ? DEMO_BILLING_CREDITS
    : DEMO_BILLING_ALLOWANCES[featureId];
}

function demoBalance(featureId: string, now: number) {
  const allowance = demoAllowance(featureId);
  if (!allowance) {
    return {
      granted: DEVELOPMENT_BALANCE,
      remaining: DEVELOPMENT_BALANCE,
      usage: 0,
      unlimited: true,
      nextResetAt: null,
    };
  }
  return {
    granted: allowance.granted,
    remaining: allowance.granted - allowance.used,
    usage: allowance.used,
    unlimited: false,
    nextResetAt:
      now +
      (DEMO_BILLING_PERIOD_DAYS - DEMO_BILLING_PLAN.periodElapsedDays) *
        MS_PER_DAY,
  };
}

function createDevelopmentAutumnCustomer(customerId: string) {
  const demo = isDemoMode();
  const now = Date.now();
  return {
    id: customerId,
    name: demo ? "Fieldnote" : "Local development",
    email: null,
    createdAt: 0,
    fingerprint: null,
    stripeId: null,
    env: "sandbox",
    metadata: {},
    sendEmailReceipts: false,
    billingControls: {
      usageAlerts: getDevelopmentUsageAlerts(customerId),
    },
    subscriptions: demo ? createDemoSubscriptions(now) : [],
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
          ...(demo
            ? demoBalance(featureId, now)
            : {
                granted: DEVELOPMENT_BALANCE,
                remaining: DEVELOPMENT_BALANCE,
                usage: 0,
                unlimited: true,
                nextResetAt: null,
              }),
          overageAllowed: false,
          maxPurchase: null,
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

function isWeekendDay(period: number) {
  const weekday = new Date(period).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function rawDailyValue(featureId: string, end: number, offset: number) {
  return demoValue(
    featureId,
    isWeekendDay(end - offset * MS_PER_DAY),
    seedFrom(`${featureId}:${offset}`)
  );
}

/** Credits spent per day, taken from the same events Settings › Credits lists. */
function demoCreditDailyValues(end: number, days: number) {
  const values = Array.from({ length: days }, () => 0);
  for (const event of demoCreditEvents(Date.now())) {
    const offset = Math.round(
      (end - startOfUtcDay(event.timestamp)) / MS_PER_DAY
    );
    if (offset >= 0 && offset < days) {
      values[offset] = (values[offset] ?? 0) + event.value;
    }
  }
  return values;
}

/**
 * Daily usage whose current-cycle days add up to what the demo balance
 * reports as used. Earlier days follow the same pace (the previous cycle).
 */
function demoAllowanceDailyValues(
  featureId: string,
  used: number,
  end: number,
  days: number
) {
  const elapsed = DEMO_BILLING_PLAN.periodElapsedDays;
  const cycleWeights = Array.from({ length: elapsed }, (_, offset) =>
    rawDailyValue(featureId, end, offset)
  );
  const cycleValues = scaleToTotal(cycleWeights, used);
  const weightSum = cycleWeights.reduce((sum, weight) => sum + weight, 0);
  const pace = weightSum > 0 ? used / weightSum : 0;
  return Array.from(
    { length: days },
    (_, offset) =>
      cycleValues[offset] ??
      Math.round(rawDailyValue(featureId, end, offset) * pace)
  );
}

function dailyValues(featureId: string, end: number, days: number) {
  if (isDemoMode()) {
    if (featureId === FEATURES.AI_CREDITS) {
      return demoCreditDailyValues(end, days);
    }
    const allowance = DEMO_BILLING_ALLOWANCES[featureId];
    if (allowance) {
      return demoAllowanceDailyValues(featureId, allowance.used, end, days);
    }
  }
  return Array.from({ length: days }, (_, offset) =>
    rawDailyValue(featureId, end, offset)
  );
}

function createDevelopmentAggregateEvents(
  body: DevelopmentAggregateEventsRequest
) {
  const featureIds = featureIdsFromBody(body);
  const days = RANGE_DAYS[body.range ?? "30d"] ?? 30;
  const end = startOfUtcDay(Date.now());
  const valuesByFeature = new Map(
    featureIds.map((featureId) => [
      featureId,
      dailyValues(featureId, end, days),
    ])
  );
  const list: { period: number; values: Record<string, number> }[] = [];
  const total: Record<string, { count: number; sum: number }> = {};

  for (const featureId of featureIds) {
    total[featureId] = { count: 0, sum: 0 };
  }

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const values: Record<string, number> = {};

    for (const featureId of featureIds) {
      const value = valuesByFeature.get(featureId)?.[offset] ?? 0;
      values[featureId] = value;
      const current = total[featureId];
      if (current) {
        current.count += value > 0 ? 1 : 0;
        current.sum += value;
      }
    }

    list.push({ period: end - offset * MS_PER_DAY, values });
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
  secretKey: string | undefined,
  resolveCustomerId: DevelopmentBillingCustomerIdResolver
): ((request: Request) => Promise<Response>) | null {
  if (!shouldBypassAutumnInDevelopment(nodeEnv, secretKey)) {
    return null;
  }

  const demo = isDemoMode();

  return async (request) => {
    const route = new URL(request.url).pathname.split("/").at(-1);

    if (route === "getOrCreateCustomer") {
      const customerId = await resolveCustomerId(request);
      if (!customerId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json(createDevelopmentAutumnCustomer(customerId));
    }

    if (demo && route === "listPlans") {
      return Response.json({ list: createDemoPlans() });
    }

    if (demo && route === "listEvents") {
      return Response.json(createDemoCreditEvents(await readJsonBody(request)));
    }

    if (route === "aggregateEvents") {
      const body = await readJsonBody(request);
      return Response.json(createDevelopmentAggregateEvents(body));
    }

    if (demo) {
      // Checkout, portal and plan changes need a real account.
      return Response.json(
        { error: DEMO_DISABLED_MESSAGE, message: DEMO_DISABLED_MESSAGE },
        { status: 403 }
      );
    }

    return Response.json(
      { error: "Billing operations are unavailable without an Autumn key" },
      { status: 503 }
    );
  };
}
