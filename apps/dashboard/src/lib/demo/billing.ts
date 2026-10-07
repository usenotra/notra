import { FEATURES } from "@notra/ai/billing/features";

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

const MS_PER_DAY = 86_400_000;

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
function createDemoCreditEvents(body: { offset?: number; limit?: number }) {
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

/** Metered balance for a feature the demo plan caps; null when unlimited. */
function demoBalance(featureId: string, now: number) {
  const allowance = demoAllowance(featureId);
  if (!allowance) {
    return null;
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

/**
 * The public demo shows a paying workspace mid-cycle: an active Growth plan
 * and partially used credits, instead of local development's empty account.
 */
export function createDemoCustomer(now: number) {
  return {
    name: "Fieldnote",
    subscriptions: createDemoSubscriptions(now),
    balanceFor: (featureId: string) => demoBalance(featureId, now),
  };
}

/** Credits spent per day, taken from the same events Settings › Credits lists. */
function demoCreditDailyValues(end: number, days: number) {
  const values = Array.from({ length: days }, () => 0);
  for (const event of demoCreditEvents(Date.now())) {
    // UTC days are exactly MS_PER_DAY long in JavaScript time.
    const dayStart = event.timestamp - (event.timestamp % MS_PER_DAY);
    const offset = Math.round((end - dayStart) / MS_PER_DAY);
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
  used: number,
  days: number,
  rawDailyValue: (offset: number) => number
) {
  const elapsed = DEMO_BILLING_PLAN.periodElapsedDays;
  const cycleWeights = Array.from({ length: elapsed }, (_, offset) =>
    rawDailyValue(offset)
  );
  const cycleValues = scaleToTotal(cycleWeights, used);
  const weightSum = cycleWeights.reduce((sum, weight) => sum + weight, 0);
  const pace = weightSum > 0 ? used / weightSum : 0;
  return Array.from(
    { length: days },
    (_, offset) =>
      cycleValues[offset] ?? Math.round(rawDailyValue(offset) * pace)
  );
}

/**
 * Daily usage that matches the demo balances, newest day first; null for
 * features the demo plan doesn't cap.
 */
export function demoDailyValues(
  featureId: string,
  end: number,
  days: number,
  rawDailyValue: (offset: number) => number
): number[] | null {
  if (featureId === FEATURES.AI_CREDITS) {
    return demoCreditDailyValues(end, days);
  }
  const allowance = DEMO_BILLING_ALLOWANCES[featureId];
  return allowance
    ? demoAllowanceDailyValues(allowance.used, days, rawDailyValue)
    : null;
}

/** Plans, spend history, and a refusal for checkout, portal and plan changes. */
export function handleDemoAutumnRoute(
  route: string | undefined,
  body: { offset?: number; limit?: number }
): Response {
  if (route === "listPlans") {
    return Response.json({ list: createDemoPlans() });
  }
  if (route === "listEvents") {
    return Response.json(createDemoCreditEvents(body));
  }
  // Checkout, portal and plan changes need a real account.
  return Response.json(
    { error: DEMO_DISABLED_MESSAGE, message: DEMO_DISABLED_MESSAGE },
    { status: 403 }
  );
}
