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

/** Credit spend the demo shows under Settings › Credits, in cents. */
export const DEMO_CREDIT_EVENT_PATTERN = [
  { properties: { output_type: "blog_post" }, value: 38 },
  { properties: { output_type: "changelog" }, value: 21 },
  { properties: { source: "chat" }, value: 4 },
  { properties: { output_type: "linkedin_post" }, value: 9 },
  { properties: { output_type: "twitter_post" }, value: 6 },
] as const;
export const DEMO_CREDIT_EVENT_COUNT = 40;
