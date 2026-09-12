import { DatabuddyWordmark } from "@notra/ui/components/ui/svgs/databuddyWordmark";
import { Hexclave } from "@notra/ui/components/ui/svgs/hexclave";
import { Inth } from "@notra/ui/components/ui/svgs/inth";
import type { ComponentType, SVGProps } from "react";

export const NOTRA_LOGO_PATH = "/notra-mark.svg";

export const RSS_FEED_PATH = "/rss.xml";
export const RSS_FEED_TITLE = "Notra Blog RSS Feed";
export const RSS_FEED_DESCRIPTION =
  "Insights, guides, and stories from the Notra team.";
export const RSS_FEED_LANGUAGE = "en-us";

export const BLOG_INDEX_PATH = "/blog";
export const BLOG_AUTHOR_PATH = "/blog/author";
export const NOTRA_CHANGELOG_INDEX_PATH = "/changelog/notra";

export const OG_EXCLUDED_CONTRIBUTOR = "mezotv";
export const OG_MAX_CONTRIBUTORS = 6;
export const OG_MAX_LOGIN_LENGTH = 12;
export const OG_BLOG_TITLE_MAX_LENGTH = 80;

export const BLOG_HEADING_REGEX = /<h([2-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
export const BLOG_PARAGRAPH_REGEX = /<p[^>]*>([\s\S]*?)<\/p>/gi;
export const BLOG_TAG_REGEX = /<[^>]+>/g;
export const BLOG_WHITESPACE_REGEX = /\s+/g;
export const BLOG_FAQ_HEADING_REGEX =
  /^(frequently asked questions|faqs?|q\s*&\s*a)$/i;
export const BLOG_NUMBERED_HEADING_PREFIX_REGEX = /^\d+\.\s*/;
export const JSON_LD_SCRIPT_CLOSE_REGEX = /<\/(script)/gi;
export const HTML_ENTITY_REGEX = /&(amp|lt|gt|quot|#39|nbsp);/g;

export const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
};

export const PRICING_PLANS = {
  starter: {
    name: "Starter",
    description: "For founders shipping their first content engine.",
    pricing: { monthly: 100, annually: 1000 },
    cta: {
      label: "Get started",
      href: "https://app.usenotra.com/signup",
    },
    features: [
      "2,000 AI answers tracked / mo",
      "8 image generations / mo",
      "10 long-form posts / mo",
      "Unlimited social posts",
      "1 project",
      { label: "100 references", subtitle: "then $0.05 per reference / mo" },
      "Standard support + Slack",
      "ZDR available (+20%)",
    ],
  },
  growth: {
    name: "Growth",
    description: "For teams publishing across channels every week.",
    pricing: { monthly: 250, annually: 2500 },
    cta: {
      label: "Get started",
      href: "https://app.usenotra.com/signup",
    },
    features: [
      "6,000 AI answers tracked / mo",
      "20 image generations / mo",
      "25 long-form posts / mo",
      "Unlimited social posts",
      "3 projects",
      { label: "500 references", subtitle: "then $0.04 per reference / mo" },
      "Standard support + Slack",
      "ZDR available (+20%)",
    ],
  },
  scale: {
    name: "Scale",
    description: "For content teams running multiple brands at volume.",
    pricing: { monthly: 550, annually: 5500 },
    cta: {
      label: "Get started",
      href: "https://app.usenotra.com/signup",
    },
    features: [
      "12,000 AI answers tracked / mo",
      "45 image generations / mo",
      "50 long-form posts / mo",
      "Unlimited social posts",
      "10 projects",
      { label: "1,000 references", subtitle: "then $0.03 per reference / mo" },
      "Priority support",
      "ZDR available (+20%)",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "For large orgs with custom scale and compliance needs.",
    pricing: { monthly: null, annually: null },
    cta: { label: "Contact us", href: "mailto:hello@usenotra.com" },
    features: [
      "Unlimited AI answers tracked",
      "Unlimited image generations",
      "Unlimited long-form posts",
      "Unlimited social posts",
      "Unlimited projects",
      "Unlimited references",
      "Dedicated support",
      "ZDR included",
    ],
  },
} as const;

const FEATURES_TABLE = [
  {
    category: "AI visibility tracking",
    items: [
      {
        name: "AI answers tracked / mo",
        starter: "2,000",
        growth: "6,000",
        scale: "12,000",
        enterprise: "Custom",
      },
      {
        name: "Prompts tracked",
        starter: "Unlimited",
        growth: "Unlimited",
        scale: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Models tracked",
        starter: "All major",
        growth: "All major",
        scale: "All major",
        enterprise: "All major",
      },
    ],
  },
  {
    category: "Content",
    items: [
      {
        name: "Image generations",
        starter: "8 / mo",
        growth: "20 / mo",
        scale: "45 / mo",
        enterprise: "Unlimited",
      },
      {
        name: "Long-form posts",
        starter: "10 / mo",
        growth: "25 / mo",
        scale: "50 / mo",
        enterprise: "Unlimited",
      },
      {
        name: "Social posts",
        starter: "Unlimited",
        growth: "Unlimited",
        scale: "Unlimited",
        enterprise: "Unlimited",
      },
    ],
  },
  {
    category: "Projects",
    items: [
      {
        name: "Projects",
        starter: "1",
        growth: "3",
        scale: "10",
        enterprise: "Unlimited",
      },
      {
        name: "References",
        starter: "100",
        growth: "500",
        scale: "1,000",
        enterprise: "Unlimited",
      },
      {
        name: "Reference overage",
        starter: "$0.05 / ref",
        growth: "$0.04 / ref",
        scale: "$0.03 / ref",
        enterprise: "Custom",
      },
    ],
  },
  {
    category: "Security",
    items: [
      {
        name: "Zero data retention",
        starter: "+20%",
        growth: "+20%",
        scale: "+20%",
        enterprise: "Included",
      },
    ],
  },
  {
    category: "Data",
    items: [
      {
        name: "Log retention",
        starter: "30 days",
        growth: "90 days",
        scale: "1 year",
        enterprise: "Custom",
      },
    ],
  },
  {
    category: "Support",
    items: [
      {
        name: "Support",
        starter: "Standard + Slack",
        growth: "Standard + Slack",
        scale: "Priority",
        enterprise: "Dedicated",
      },
    ],
  },
] as const;

export const COMPARISON_FEATURES = FEATURES_TABLE.map(
  ({ category, items }) => ({
    category,
    features: items,
  })
);

export const SOCIAL_PROOF_LOGOS: {
  name: string;
  Component: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  className?: string;
}[] = [
  {
    name: "inth",
    Component: Inth,
    href: "https://inth.com?utm_source=notra",
    className: "h-8",
  },
  {
    name: "Databuddy",
    Component: DatabuddyWordmark,
    href: "https://databuddy.cc?utm_source=notra",
    className: "h-8",
  },
  {
    name: "Hexclave",
    Component: Hexclave,
    href: "https://hexclave.com?utm_source=notra",
    className: "h-8 text-[#49423d] dark:text-[#f3eeea]",
  },
];
