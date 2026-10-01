import { FEATURES } from "@notra/ai/billing/features";

import type { DemoBillingAllowance } from "@/types/billing/demo";

/** Mirrors the public pricing page (apps/web PRICING_PLANS). */
export const DEMO_BILLING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "For founders shipping their first content engine.",
    monthly: 100,
    annual: 1000,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams publishing across channels every week.",
    monthly: 250,
    annual: 2500,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For content teams running multiple brands at volume.",
    monthly: 550,
    annual: 5500,
  },
] as const;

/**
 * Growth plan allowances (apps/web pricing) and what the demo workspace has
 * used of each this cycle. Credit balances are cents. Features missing here
 * are unlimited on Growth. AI credits live in DEMO_BILLING_CREDITS.
 */
export const DEMO_BILLING_ALLOWANCES: Readonly<
  Record<string, DemoBillingAllowance>
> = {
  [FEATURES.AI_ANSWERS]: { granted: 6000, used: 3460 },
  [FEATURES.PULL_REQUEST_CREDITS]: { granted: 1500, used: 420 },
  [FEATURES.IMAGE_GENERATIONS]: { granted: 20, used: 7 },
  [FEATURES.LONG_FORM_POSTS]: { granted: 25, used: 11 },
  [FEATURES.PROJECTS]: { granted: 3, used: 1 },
  [FEATURES.REFERENCES]: { granted: 500, used: 64 },
};

/**
 * Relative weight of each credit event under Settings › Credits. The demo
 * scales them so the events add up to DEMO_BILLING_CREDITS.used.
 */
export const DEMO_CREDIT_EVENT_PATTERN = [
  { properties: { output_type: "blog_post" }, value: 38 },
  { properties: { output_type: "changelog" }, value: 21 },
  { properties: { source: "chat" }, value: 4 },
  { properties: { output_type: "linkedin_post" }, value: 9 },
  { properties: { output_type: "twitter_post" }, value: 6 },
] as const;
export const DEMO_CREDIT_EVENT_COUNT = 40;
