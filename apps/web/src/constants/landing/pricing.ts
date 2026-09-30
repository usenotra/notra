import type {
  BillingPeriod,
  BillingToggleOption,
  PricingPlan,
  TrackedEngine,
} from "@/types/landing/pricing";

export const TRACKED_ENGINES_CAPTION =
  "Scan ChatGPT, Claude, Gemini and Perplexity with web search";

const ENGINE_LOGO_BASE = "/logos/ai-engines";

export const TRACKED_ENGINES: TrackedEngine[] = [
  {
    name: "ChatGPT",
    src: `${ENGINE_LOGO_BASE}/openai.svg`,
    darkSrc: `${ENGINE_LOGO_BASE}/openai-dark.svg`,
    width: 28,
  },
  { name: "Claude", src: `${ENGINE_LOGO_BASE}/claude.svg`, width: 28 },
  { name: "Gemini", src: `${ENGINE_LOGO_BASE}/gemini.svg`, width: 28 },
  { name: "Perplexity", src: `${ENGINE_LOGO_BASE}/perplexity.svg`, width: 28 },
  {
    name: "Grok",
    src: `${ENGINE_LOGO_BASE}/grok.svg`,
    darkSrc: `${ENGINE_LOGO_BASE}/grok-dark.svg`,
    width: 28,
  },
];

export const PRICING_ANNUAL_BADGE = "2 months free";

export const PRICING_DEFAULT_BILLING: BillingPeriod = "yearly";

export const PRICING_BILLING_OPTIONS: BillingToggleOption[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const PRICING_HEADING =
  "Simple pricing that scales with what you track.";

export const PRICING_SUBHEADING =
  "Every plan comes with prompt tracking, traffic attribution and the writer. The difference is how many answers you track a month. Cancel whenever.";

const SIGNUP_URL = "https://app.usenotra.com/signup";
const ENTERPRISE_MAIL_URL = "mailto:hello@usenotra.com";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For founders tracking their first prompts.",
    price: { monthly: "$100", yearly: "$1,000" },
    priceSuffix: { monthly: "/month", yearly: "/year" },
    hasAnnualBadge: true,
    variant: "default",
    cta: {
      label: "Get started",
      kind: "signup",
      href: SIGNUP_URL,
      source: "pricing_starter",
      showArrow: true,
    },
    features: [
      { label: "2,000 AI answers tracked / mo", icon: "tracking" },
      { label: "8 image generations / mo", icon: "images" },
      { label: "10 long-form posts / mo", icon: "content" },
      { label: "Unlimited social posts", icon: "social" },
      { label: "1 project", icon: "projects" },
      {
        label: "100 references",
        subtitle: "then $0.05 per ref / mo",
        icon: "references",
      },
      { label: "Standard support + Slack", icon: "support" },
      { label: "ZDR available (+20%)", icon: "zdr" },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams tracking prompts across engines and languages.",
    price: { monthly: "$250", yearly: "$2,500" },
    priceSuffix: { monthly: "/month", yearly: "/year" },
    hasAnnualBadge: true,
    variant: "featured",
    cta: {
      label: "Get started",
      kind: "signup",
      href: SIGNUP_URL,
      source: "pricing_growth",
      showArrow: true,
    },
    features: [
      { label: "6,000 AI answers tracked / mo", icon: "tracking" },
      { label: "20 image generations / mo", icon: "images" },
      { label: "25 long-form posts / mo", icon: "content" },
      { label: "Unlimited social posts", icon: "social" },
      { label: "3 projects", icon: "projects" },
      {
        label: "500 references",
        subtitle: "then $0.04 per ref / mo",
        icon: "references",
      },
      { label: "Standard support + Slack", icon: "support" },
      { label: "ZDR available (+20%)", icon: "zdr" },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    description: "For agencies and teams running several brands.",
    price: { monthly: "$550", yearly: "$5,500" },
    priceSuffix: { monthly: "/month", yearly: "/year" },
    hasAnnualBadge: true,
    variant: "default",
    cta: {
      label: "Get started",
      kind: "signup",
      href: SIGNUP_URL,
      source: "pricing_scale",
      showArrow: true,
    },
    features: [
      { label: "12,000 AI answers tracked / mo", icon: "tracking" },
      { label: "45 image generations / mo", icon: "images" },
      { label: "50 long-form posts / mo", icon: "content" },
      { label: "Unlimited social posts", icon: "social" },
      { label: "10 projects", icon: "projects" },
      {
        label: "1,000 references",
        subtitle: "then $0.03 per ref / mo",
        icon: "references",
      },
      { label: "Priority support", icon: "support" },
      { label: "ZDR available (+20%)", icon: "zdr" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large orgs with custom scale and compliance needs.",
    price: { monthly: "Custom", yearly: "Custom" },
    variant: "default",
    cta: {
      label: "Contact us",
      kind: "mail",
      href: ENTERPRISE_MAIL_URL,
      source: "pricing_enterprise",
      showArrow: false,
    },
    features: [
      { label: "Unlimited AI answers tracked", icon: "tracking" },
      { label: "Unlimited image generations", icon: "images" },
      { label: "Unlimited long-form posts", icon: "content" },
      { label: "Unlimited social posts", icon: "social" },
      { label: "Unlimited projects", icon: "projects" },
      { label: "Unlimited references", icon: "references" },
      { label: "Dedicated support", icon: "support" },
      { label: "ZDR included", icon: "zdr" },
    ],
  },
];
