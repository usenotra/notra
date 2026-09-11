import type { BlogPostSubtype } from "@notra/db/types/content";
import type { OnDemandContentType } from "@notra/schemas/dashboard/content";
import type { ScheduleOutputType } from "@notra/schemas/dashboard/integrations";

import type { FormatCardMeta } from "@/types/content/formats";

export const BLOG_POST_SUBTYPE_LABELS: Record<BlogPostSubtype, string> = {
  guide: "Guide",
  comparison: "Comparison",
  listicle: "Listicle",
  "how-to": "How-to",
  faq: "FAQ",
  alternatives: "Alternatives",
};

export const FORMAT_CARD_META: Record<OnDemandContentType, FormatCardMeta> = {
  changelog: {
    label: "Changelog entry",
    description: "A concise summary of what shipped and why it matters.",
    iconClass: "text-violet-500 dark:text-violet-300",
  },
  blog_post: {
    label: "Blog post",
    description: "A longer-form article explaining the feature in depth.",
    iconClass: "text-emerald-500 dark:text-emerald-300",
  },
  linkedin_post: {
    label: "LinkedIn post",
    description: "A professional update to share with your network.",
    iconClass: "text-[#0A66C2]",
  },
  twitter_post: {
    label: "Tweet",
    description: "A short, punchy announcement for X / Twitter.",
    iconClass: "text-foreground",
  },
  image: {
    label: "Image",
    description: "A brand-matched social image generated from repo activity.",
    iconClass: "text-fuchsia-400",
  },
};

export const FORMAT_ORDER: ScheduleOutputType[] = [
  "changelog",
  "blog_post",
  "linkedin_post",
  "twitter_post",
  "image",
];

export const CREATE_CONTENT_FORMAT_ORDER: OnDemandContentType[] = [
  ...FORMAT_ORDER,
];
