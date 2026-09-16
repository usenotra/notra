import {
  ADDONS,
  FEATURES,
  LEGACY_PLANS,
  PLANS,
} from "@notra/ai/billing/features";
import type { ChartConfig } from "@notra/ui/components/ui/chart";

import type { ProductFeature } from "@/types/hooks/billing";

export const BILLING_PRICE_REGEX = /^\d+([.,]\d+)?$/;

export const ANNUAL_PLAN_SUFFIXES = ["_annual", "_yearly"] as const;

export const PLAN_NAME_BILLING_INTERVAL_SUFFIX =
  /(?<=\S)(?:\s*\((?:monthly|annual|yearly)\)|\s+(?:monthly|annual|yearly))\s*$/i;

export const FEATURED_PLAN_TIER: string = PLANS.GROWTH;

export const LEGACY_PLAN_TIERS: Record<string, string> = {
  [LEGACY_PLANS.BASIC]: PLANS.STARTER,
  [LEGACY_PLANS.BASIC_YEARLY]: PLANS.STARTER,
  [LEGACY_PLANS.PRO]: PLANS.GROWTH,
  [LEGACY_PLANS.PRO_YEARLY]: PLANS.GROWTH,
};

export const PLAN_TIER_DESCRIPTIONS: Record<string, string> = {
  [PLANS.STARTER]: "For founders tracking their first prompts.",
  [PLANS.GROWTH]: "For teams tracking prompts across engines and languages.",
  [PLANS.SCALE]: "For agencies and teams running several brands.",
};

export const PLAN_TIER_FEATURES: Record<string, ProductFeature[]> = {
  [PLANS.STARTER]: [
    { text: "2,000 AI answers tracked / mo" },
    { text: "8 image generations / mo" },
    { text: "10 long-form posts / mo" },
    { text: "Unlimited social posts" },
    { text: "1 project" },
    { text: "100 references", overageText: "then $0.05 per ref / mo" },
    { text: "Standard support + Slack" },
    { text: "ZDR available (+20%)" },
  ],
  [PLANS.GROWTH]: [
    { text: "6,000 AI answers tracked / mo" },
    { text: "20 image generations / mo" },
    { text: "25 long-form posts / mo" },
    { text: "Unlimited social posts" },
    { text: "3 projects" },
    { text: "500 references", overageText: "then $0.04 per ref / mo" },
    { text: "Standard support + Slack" },
    { text: "ZDR available (+20%)" },
  ],
  [PLANS.SCALE]: [
    { text: "12,000 AI answers tracked / mo" },
    { text: "45 image generations / mo" },
    { text: "50 long-form posts / mo" },
    { text: "Unlimited social posts" },
    { text: "10 projects" },
    { text: "1,000 references", overageText: "then $0.03 per ref / mo" },
    { text: "Priority support" },
    { text: "ZDR available (+20%)" },
  ],
};

export const BILLING_SCENARIO_TEXT: Record<string, string> = {
  scheduled: "Plan Scheduled",
  active: "Current Plan",
  renew: "Renew",
  upgrade: "Upgrade",
  new: "Get Started",
  downgrade: "Downgrade",
  cancel: "Cancel Plan",
};

export const INVOICE_PRODUCT_NAME_FALLBACKS: Record<string, string> = {
  [PLANS.FREE]: "Free",
  [LEGACY_PLANS.BASIC]: "Basic",
  [LEGACY_PLANS.BASIC_YEARLY]: "Basic",
  [LEGACY_PLANS.PRO]: "Pro",
  [LEGACY_PLANS.PRO_YEARLY]: "Pro",
  ai_credits_top_up: "AI Credits Top-up",
};

export const INVOICE_TABLE_COLUMN_COUNT = 4;

export const BILLING_PLAN_SKELETON_KEYS = [
  PLANS.STARTER,
  PLANS.GROWTH,
  PLANS.SCALE,
] as const;

export const BILLING_PLAN_FEATURE_SKELETON_KEYS = [
  "feature-1",
  "feature-2",
  "feature-3",
  "feature-4",
  "feature-5",
  "feature-6",
] as const;

export const BILLING_INVOICE_SKELETON_KEYS = [
  "invoice-1",
  "invoice-2",
  "invoice-3",
] as const;

export const USAGE_METRIC_SKELETON_KEYS = ["used", "remaining"] as const;

export const USAGE_FEATURE_SKELETON_KEYS = [
  "feature-1",
  "feature-2",
  "feature-3",
  "feature-4",
] as const;

export const GEO_PLAN_REQUIRED_MESSAGE =
  "GEO requires a Starter, Growth, or Scale plan";

export const ZDR_ADDON_BY_TIER: Record<string, string> = {
  [PLANS.STARTER]: ADDONS.ZDR_STARTER,
  [PLANS.GROWTH]: ADDONS.ZDR_GROWTH,
  [PLANS.SCALE]: ADDONS.ZDR_SCALE,
};

export const ZDR_ADDON_PREFIX = "zdr_";
export const ANNUAL_ADDON_SUFFIX = "_annual";
export const ZDR_ADDON_ANCHOR = "zdr";
export const ZDR_CHECKOUT_SUCCESS_PARAM = "zdrCheckout";
export const PLANS_ANCHOR = "plans";
export const ZDR_ADDON_TITLE = "Zero data retention";
export const ZDR_ADDON_DESCRIPTION =
  "Only run models on hosts that keep no prompt or answer data. Priced at 20% of your plan.";
export const ZDR_ADDON_UNAVAILABLE =
  "Available as an add-on once you're on Starter, Growth, or Scale.";
export const ZDR_ADDON_REMOVE_SUCCESS =
  "Zero data retention will be removed at the end of your billing cycle.";
export const ZDR_ADDON_ADD_SUCCESS = "Zero data retention is now active.";

export const ZDR_ADDON_HINT = "Not every model offers a ZDR host.";
export const ZDR_CONSENT_TITLE = "Enable zero data retention?";
export const ZDR_CONSENT_BODY =
  "Zero data retention routes your prompts and answers only through model hosts covered by a zero-data-retention agreement. Notra routes requests through third-party AI gateways, and it is their agreements with each model provider that enforce ZDR. Before you enable it, please read the following:";
export const ZDR_CONSENT_POINTS = [
  "Availability is not guaranteed for every model. ZDR exists only where the gateway we route through holds a zero-data-retention agreement with that model's provider. Notra does not hold these agreements directly and cannot extend them to models they do not cover.",
  "New models usually launch without ZDR. Recently released models are often excluded until the provider and gateway add a zero-data-retention option.",
  "Models without a ZDR host are skipped. They are marked in GEO settings and will not run unless you explicitly approve each one, in which case that provider may retain request data under its own policy.",
  "Gateway and provider terms can change. If a ZDR agreement is withdrawn for a model, that model is excluded from your scans until an alternative is available.",
] as const;
export const ZDR_CONSENT_FOOTNOTE =
  "By enabling, you acknowledge that zero data retention is provided under third-party gateway agreements and applies only to models covered by one at the time of each request.";
export const ZDR_CONSENT_CONFIRM = "Enable";
export const ZDR_CONSENT_CANCEL = "Not now";

export const AUTUMN_ORGANIZATION_HEADER = "x-notra-organization";

export const USAGE_RANGES = ["7d", "30d", "90d"] as const;

export const USAGE_RANGE_TAB_LABELS: Record<
  (typeof USAGE_RANGES)[number],
  string
> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};

export const USAGE_FEATURE_ORDER: readonly string[] = [
  FEATURES.AI_ANSWERS,
  FEATURES.IMAGE_GENERATIONS,
  FEATURES.LONG_FORM_POSTS,
  FEATURES.SOCIAL_POSTS,
  FEATURES.PROJECTS,
  FEATURES.REFERENCES,
  FEATURES.TEAM_MEMBERS,
  FEATURES.WORKFLOWS,
  FEATURES.INTEGRATIONS,
];

export const USAGE_FEATURE_LABELS: Record<string, string> = {
  [FEATURES.AI_ANSWERS]: "AI answers",
  [FEATURES.AI_CREDITS]: "Credits",
  [FEATURES.IMAGE_GENERATIONS]: "Image generations",
  [FEATURES.LONG_FORM_POSTS]: "Long-form posts",
  [FEATURES.SOCIAL_POSTS]: "Social posts",
  [FEATURES.PROJECTS]: "Projects",
  [FEATURES.REFERENCES]: "References",
  [FEATURES.TEAM_MEMBERS]: "Team members",
  [FEATURES.WORKFLOWS]: "Workflows",
  [FEATURES.INTEGRATIONS]: "Integrations",
  [FEATURES.ZDR]: "Zero data retention",
};

export const USAGE_ANSWERS_ACCENT = "#10b981";
export const USAGE_CHART_ACCENT = "#8b5cf6";

export const USAGE_ANSWERS_CHART_CONFIG = {
  ai_answers: {
    label: "AI Answers",
    color: "var(--primary)",
  },
} satisfies ChartConfig;
